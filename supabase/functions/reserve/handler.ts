/**
 * POST /reserve (F1, D10.5): normales Formular, 303 auf die Bestätigungsseite.
 * 1. Felder, Honeypot, Rate-Limit  2. Live-Abruf je Haus  3. Kunde suchen/anlegen
 * 4. Reservierung je Haus ohne Preise  5. PRINT RESERVATION  6. Mails
 * 7. SoftTouch nicht erreichbar: Outbox, ehrliche Bestätigung  8. alles in orders
 */
import { getCtx } from "../_shared/ctx.ts";
import { readForm, redirect303, safePath, siteHref, clientIp, field, text } from "../_shared/http.ts";
import { hashIp, rateLimit, groupToken } from "../_shared/security.ts";
import { looksLikeBot, pflicht, emailFeld, telefonFeld, positionen } from "../_shared/validate.ts";
import { features } from "../_shared/env.ts";
import { isLang, type Lang } from "../_shared/i18n.ts";
import { STATIC_PATHS } from "../_shared/paths.ts";
import { F, type HouseId, type Position } from "../_shared/contract.ts";
import { shop } from "../_shared/generated/config/shop.ts";
import hours from "../_shared/generated/content/oeffnungszeiten.json" with { type: "json" };
import { todayInLux, isValidPickup, holdUntil, type HouseHours } from "../_shared/hours.ts";
import { liveAvailability } from "../_shared/stock.ts";
import { itemInfo, newNumber, ordersByGroup, setStatus, type OrderItem } from "../_shared/orders.ts";
import { pushToSoftTouch, enqueue, isRetryable, alertMail } from "../_shared/flows.ts";
import { reservierungKunde, reservierungHaus } from "../_shared/mail/templates.ts";
import type { Mail } from "../_shared/mail/mailer.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return text(405, "POST");
  const f = await readForm(req);
  const lang: Lang = isLang(f.get(F.lang)) ? (f.get(F.lang) as Lang) : "lb";
  const ok = safePath(f.get(F.ok), STATIC_PATHS.reservierenDanke[lang]);
  const back = safePath(f.get(F.back), STATIC_PATHS.reservieren[lang]);
  const zurueck = (code: string, extra: Record<string, string> = {}) => redirect303(siteHref(back, { fehler: code, ...extra }, "#formular-fehler"));

  if (looksLikeBot(f, Date.now())) return redirect303(siteHref(ok));
  if (!features().reserve) return zurueck("allgemein");
  const ctx = await getCtx();
  if (!(await rateLimit(ctx.db, `form:${await hashIp(clientIp(req))}`, shop.rateLimit.formulareProStunde, 3600))) return zurueck("zuviele");

  const err: string[] = [];
  pflicht(f, ["vorname", "name"], err);
  emailFeld(f, "email", err);
  telefonFeld(f, "mobil", err);
  if (f.get("einwilligung") !== "1") err.push("einwilligung");

  const pos = positionen(f, shop.reservierung.maxMengeJePosition);
  if (pos.length === 0) return zurueck("tasche");
  const byHouse = new Map<HouseId, Position[]>();
  for (const p of pos) {
    const house = ctx.storeToHouse[p.key.slice(12)];
    if (!house) return zurueck("tasche");
    byHouse.set(house, [...(byHouse.get(house) ?? []), p]);
  }
  const today = todayInLux(ctx.now());
  const h = hours as unknown as Record<HouseId, HouseHours>;
  for (const house of byHouse.keys()) {
    if (!isValidPickup(h[house], field(f, `abholung_${house}`, 10), today, shop.reservierung.abholungMaxTage)) err.push(`abholung_${house}`);
  }
  if (err.length) return zurueck("felder", { felder: err.join(",") });

  // Live-Abruf je Haus. Ist SoftTouch nicht erreichbar, geht es trotzdem weiter (Outbox, das Haus bestätigt).
  try {
    const live = await liveAvailability(ctx, pos.map((p) => p.key.slice(0, 8)));
    const weg = pos.filter((p) => (live.get(p.key)?.available ?? 0) < p.menge);
    if (weg.length) return zurueck("bestand", { keys: weg.map((p) => p.key).join(",") });
  } catch (e) {
    if (!isRetryable(e)) throw e;
  }

  const info = await itemInfo(ctx.db, pos.map((p) => p.key));
  const groupId = crypto.randomUUID();
  const token = await groupToken(groupId);
  const customer = {
    vorname: field(f, "vorname", 100),
    name: field(f, "name", 100),
    email: field(f, "email", 254),
    mobil: field(f, "mobil", 40),
    bemerkung: field(f, "bemerkung", 500) || undefined,
  };
  const ids: string[] = [];
  for (const [house, list] of byHouse) {
    const pickup = field(f, `abholung_${house}`, 10);
    const items: OrderItem[] = list.map((p) => ({ ...(info.get(p.key) ?? { key: p.key, uid8: p.key.slice(0, 8), marke: "", name: p.key, farbe: "", groesse: "", preis: 0 }), menge: p.menge }));
    const number = await newNumber(ctx.db, today);
    const r = await ctx.db.query<{ id: string }>(
      `insert into orders (group_id, number, public_token, house_id, mode, status, customer, items, pickup_from, hold_until, lang)
       values ($1::uuid, $2, $3, $4, 'reserve', 'queued', $5::jsonb, $6::jsonb, $7::date, $8::date, $9) returning id::text`,
      [groupId, number, token, house, customer, items, pickup, holdUntil(h[house], pickup, shop.reservierung.haltedauerTage), lang],
    );
    ids.push(r[0].id);
  }

  for (const id of ids) {
    try {
      await pushToSoftTouch(ctx, id);
      await setStatus(ctx.db, id, "reserved");
    } catch (e) {
      if (isRetryable(e)) await enqueue(ctx, "st_reservation", {}, id, shop.outbox.intervallMinuten);
      else {
        await setStatus(ctx.db, id, "nachpruefen");
        await alertMail(ctx, "Reservierung nicht in FasMan angelegt", [`Bestellung ${id}`, `Fehler: ${(e as Error).message}`, "Bitte von Hand zurücklegen und den Kunden informieren."]);
      }
    }
  }

  const orders = await ordersByGroup(ctx.db, groupId);
  const mails: Mail[] = [reservierungKunde(orders, lang), ...orders.map((o) => reservierungHaus(o, ctx.mailTo(o.house_id)))];
  for (const m of mails) {
    try {
      await ctx.mail.send(m);
    } catch {
      await enqueue(ctx, "mail", m, ids[0], shop.outbox.intervallMinuten);
    }
  }
  return redirect303(siteHref(ok, { g: groupId, t: token }));
}
