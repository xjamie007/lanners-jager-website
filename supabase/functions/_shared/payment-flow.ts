/**
 * Zahlung verarbeiten (D10.6.2). Der Status wird IMMER beim Anbieter
 * nachgelesen. Idempotent: nur eine offene Bestellung (pending) wechselt.
 *  - bezahlt: noch ein Live-Abruf; Kunde, Lieferadresse, Reservierung mit
 *    payment_id, PRINT RESERVATION, Halte-Mengen frei, Mails
 *  - bezahlt, aber weg: Status nachpruefen, Mails an Kunde und Haus
 *  - fehlgeschlagen/abgebrochen/abgelaufen: Halte-Mengen frei
 */
import type { Ctx } from "./ctx.ts";
import { orderByPayment, orderById, releaseHolds, setStatus } from "./orders.ts";
import { liveAvailability } from "./stock.ts";
import { pushToSoftTouch, enqueue, isRetryable, alertMail } from "./flows.ts";
import { bestellungKunde, bestellungHaus, nachpruefenKunde } from "./mail/templates.ts";
import type { Mail } from "./mail/mailer.ts";

async function sendOrQueue(ctx: Ctx, mail: Mail, orderId: string) {
  try {
    await ctx.mail.send(mail);
  } catch {
    await enqueue(ctx, "mail", mail, orderId, 5);
  }
}

export async function processPayment(ctx: Ctx, paymentId: string): Promise<string> {
  const order = await orderByPayment(ctx.db, paymentId);
  if (!order) return "unbekannt";
  const status = await ctx.pay(order.house_id).getStatus(paymentId);
  if (order.status !== "pending") return `schon ${order.status}`;

  if (status === "paid") {
    let verfuegbar = true;
    try {
      const live = await liveAvailability(ctx, order.items.map((i) => i.key.slice(0, 8)), order.id);
      verfuegbar = order.items.every((i) => (live.get(i.key)?.available ?? 0) >= i.menge);
    } catch {
      // SoftTouch nicht erreichbar: die Halte-Menge hat das Stück für uns reserviert; die Outbox legt es an
      verfuegbar = true;
    }
    const now = ctx.now().toISOString();
    if (!verfuegbar) {
      await setStatus(ctx.db, order.id, "nachpruefen", { paid_at: now });
      await releaseHolds(ctx.db, order.id);
      const o = (await orderById(ctx.db, order.id))!;
      await sendOrQueue(ctx, nachpruefenKunde(o), o.id);
      await sendOrQueue(ctx, bestellungHaus(o, ctx.mailTo(o.house_id), true), o.id);
      return "nachpruefen";
    }
    await setStatus(ctx.db, order.id, "paid", { paid_at: now });
    try {
      await pushToSoftTouch(ctx, order.id);
    } catch (e) {
      if (isRetryable(e)) await enqueue(ctx, "st_paid_order", {}, order.id, 5);
      else {
        await setStatus(ctx.db, order.id, "nachpruefen");
        await alertMail(ctx, `Bezahlte Bestellung nicht in FasMan: ${order.number}`, [`Fehler: ${(e as Error).message}`, "Bitte von Hand anlegen."]);
      }
    }
    await releaseHolds(ctx.db, order.id);
    const o = (await orderById(ctx.db, order.id))!;
    await sendOrQueue(ctx, bestellungKunde(o), o.id);
    await sendOrQueue(ctx, bestellungHaus(o, ctx.mailTo(o.house_id)), o.id);
    return o.status;
  }
  if (status === "failed" || status === "canceled" || status === "expired") {
    await setStatus(ctx.db, order.id, status);
    await releaseHolds(ctx.db, order.id);
    return status;
  }
  return "offen";
}
