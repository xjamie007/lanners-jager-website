/**
 * Abläufe gegen SoftTouch, geteilt von reserve, payment-webhook und outbox:
 *  - Kunde suchen (GET customers?email=) oder anlegen (POST customers)
 *  - bei Lieferung Lieferadresse anlegen
 *  - Reservierung mit allen Positionen in einem Aufruf (Bestand sinkt sofort)
 *  - PRINT RESERVATION an die Filiale, damit der Laden den Beleg druckt
 * Antwortet SoftTouch nicht (500/Timeout), übernimmt die Outbox (D10.5.7).
 */
import type { Ctx } from "./ctx.ts";
import { SoftTouchError } from "./softtouch/client.ts";
import type { StCustomer, StReservationItemInput } from "./softtouch/types.ts";
import { softtouch } from "./generated/config/softtouch.ts";
import { formatDay } from "./format.ts";
import { orderById, setStatus, type Order } from "./orders.ts";
import { env } from "./env.ts";
import { alarm } from "./mail/templates.ts";

async function findOrCreateCustomer(ctx: Ctx, o: Order, store: string): Promise<number> {
  const c = ctx.conn(o.house_id).client;
  if (o.st_customer_id) return o.st_customer_id;
  const found = await c.findCustomersByEmail(o.customer.email);
  // Eine E-Mail kann mehreren Kunden gehören (Doku): bevorzugt der mit gleichem Namen
  const match =
    found.find((k: StCustomer) => String(k.name ?? "").toLowerCase() === o.customer.name.toLowerCase() && String(k.firstname ?? "").toLowerCase() === o.customer.vorname.toLowerCase()) ??
    found.find((k: StCustomer) => k.active !== false);
  let id: number;
  if (match) id = Number(match.key);
  else {
    const a = o.customer.adresse;
    const created = await c.createCustomer({
      name: o.customer.name,
      firstname: o.customer.vorname,
      email: o.customer.email,
      mobile: o.customer.mobil ?? o.customer.telefon ?? "",
      ...(a ? { address: a.strasse, zip: a.plz.replace(/^L-/, ""), city: a.ort, country: a.land } : {}),
      accepted_gdpr_at: new Date().toISOString().slice(0, 10),
      store_id: store,
    });
    id = Number(created.key);
  }
  await ctx.db.query(`update orders set st_customer_id = $2, updated_at = now() where id = $1::uuid`, [o.id, id]);
  return id;
}

function remarks(o: Order): string {
  const c = o.customer;
  const kontakt = `${c.vorname} ${c.name}, ${c.mobil ?? c.telefon ?? ""}`.trim();
  if (o.mode === "reserve") {
    return `WEB-RESERVIERUNG ${o.number} – Abholung ab ${formatDay(o.pickup_from!, "de", false)}, zurücklegen bis ${formatDay(o.hold_until!, "de", false)}. ${kontakt}.${c.bemerkung ? " " + c.bemerkung : ""}`.slice(0, 1000);
  }
  const weg = o.mode === "collect" && o.pickup_from ? `Abholung im Haus ab ${formatDay(o.pickup_from, "de", false)}` : "Versand an die Lieferadresse";
  return `WEB-BESTELLUNG ${o.number} BEZAHLT – ${weg}. ${kontakt}.`.slice(0, 1000);
}

/**
 * Legt die Reservierung in FasMan an und schickt PRINT RESERVATION.
 * Ergebnis: Reservierungsnummer, oder Fehler (retryable → Outbox).
 */
export async function pushToSoftTouch(ctx: Ctx, orderId: string): Promise<string> {
  const o = await orderById(ctx.db, orderId);
  if (!o) throw new Error(`Bestellung ${orderId} fehlt`);
  if (o.st_reservation_key) return o.st_reservation_key;
  const conn = ctx.conn(o.house_id);
  const store = conn.stores[0];
  const customerId = await findOrCreateCustomer(ctx, o, store);
  let deliveryId: number | undefined;
  if (o.mode === "ship" && o.customer.adresse) {
    if (o.st_delivery_address_id) deliveryId = o.st_delivery_address_id;
    else {
      const a = o.customer.adresse;
      const d = await conn.client.createDeliveryAddress({
        customer: customerId,
        name: o.customer.name,
        surname: o.customer.vorname,
        address: a.strasse,
        address2: a.zusatz ?? "",
        zip: a.plz.replace(/^L-/, ""),
        city: a.ort,
        country: a.land,
        email: o.customer.email,
        mobile: o.customer.telefon ?? "",
      });
      deliveryId = Number(d.key);
      await ctx.db.query(`update orders set st_delivery_address_id = $2 where id = $1::uuid`, [o.id, deliveryId]);
    }
  }
  const items: StReservationItemInput[] = o.items.map((i) => {
    const item: StReservationItemInput = { product_uid: Number(i.key), quantity: i.menge };
    // Reservieren: ohne Preis, SoftTouch nimmt den Tagespreis (D10.5).
    // Bezahlt: der bezahlte Stückpreis, damit die Reservierung zum Zahlbetrag passt.
    if (o.mode !== "reserve") {
      item.net_price = i.preis / 100;
      if (softtouch.webPriceDiscountTypeId) item.discount_type_id = softtouch.webPriceDiscountTypeId;
    }
    return item;
  });
  const res = await conn.client.createReservation({
    customer_id: customerId,
    store_id: store,
    ...(conn.pos ? { pos_id: conn.pos } : {}),
    ...(o.payment_id ? { payment_id: o.payment_id } : {}),
    ...(deliveryId ? { delivery_address_id: deliveryId } : {}),
    remarks: remarks(o),
    items,
  });
  const key = String(res.key);
  await ctx.db.query(`update orders set st_reservation_key = $2, updated_at = now() where id = $1::uuid`, [o.id, key]);
  // Beleg im Laden drucken; scheitert nur das, holt die Outbox es nach
  try {
    await conn.client.sendMessage({ store, subject: "PRINT RESERVATION", message: key });
  } catch (e) {
    await enqueue(ctx, "st_message", { store, house: o.house_id, key }, o.id);
    console.warn("PRINT RESERVATION in die Outbox:", (e as Error).message);
  }
  return key;
}

export async function enqueue(ctx: Ctx, kind: string, payload: unknown, orderId: string | null, delayMinutes = 5) {
  await ctx.db.query(`insert into outbox (kind, payload, order_id, next_attempt_at) values ($1, $2::jsonb, $3::uuid, now() + make_interval(mins => $4))`, [
    kind,
    payload,
    orderId,
    delayMinutes,
  ]);
}

export function isRetryable(e: unknown): boolean {
  return e instanceof SoftTouchError ? e.retryable : true;
}

export async function alertMail(ctx: Ctx, subject: string, lines: string[]) {
  const to = env("ALERT_RECIPIENT") ?? "alarm@demo.invalid";
  try {
    await ctx.mail.send(alarm(to, subject, lines));
  } catch (e) {
    console.error("Alarm-Mail fehlgeschlagen:", (e as Error).message);
  }
}

export { setStatus };
