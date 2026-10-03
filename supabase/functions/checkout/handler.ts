/**
 * Online kaufen (F2, D10.6.1), je Haus.
 *  GET  /checkout?methods=1&haus=…&lang=…  Zahlungsarten aus der Methods-API
 *  POST /checkout  Felder prüfen, Live-Abruf, Halte-Mengen (20 min), Summen
 *       serverseitig aus netto_price, Versand aus der Konfiguration, Zahlung beim
 *       Anbieter mit dem Schlüssel DIESES Hauses, 303 auf die Zahlungsseite.
 */
import { getCtx } from "../_shared/ctx.ts";
import { readForm, redirect303, safePath, siteHref, clientIp, field, json, preflight, text } from "../_shared/http.ts";
import { hashIp, rateLimit, groupToken } from "../_shared/security.ts";
import { looksLikeBot, pflicht, emailFeld, telefonFeld, positionen } from "../_shared/validate.ts";
import { features } from "../_shared/env.ts";
import { isLang, type Lang } from "../_shared/i18n.ts";
import { STATIC_PATHS } from "../_shared/paths.ts";
import { F, normalizePostcode, type HouseId } from "../_shared/contract.ts";
import { shop } from "../_shared/generated/config/shop.ts";
import { versand } from "../_shared/generated/config/versand.ts";
import { getHouse } from "../_shared/generated/config/houses.ts";
import hours from "../_shared/generated/content/oeffnungszeiten.json" with { type: "json" };
import { todayInLux, isValidPickup, type HouseHours } from "../_shared/hours.ts";
import { liveAvailability } from "../_shared/stock.ts";
import { activeHolds, itemInfo, newNumber, type OrderItem, type Adresse } from "../_shared/orders.ts";
import { isRetryable } from "../_shared/flows.ts";

export async function handler(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  const ctx = await getCtx();

  if (req.method === "GET") {
    const u = new URL(req.url);
    const haus = u.searchParams.get("haus") === "jager" ? "jager" : "lanners";
    const lang = (isLang(u.searchParams.get("lang")) ? u.searchParams.get("lang") : "de") as Lang;
    try {
      return json(req, { methods: await ctx.pay(haus).listMethods(10000, lang) });
    } catch {
      return json(req, { methods: [] });
    }
  }
  if (req.method !== "POST") return text(405, "POST");

  const f = await readForm(req);
  const lang: Lang = isLang(f.get(F.lang)) ? (f.get(F.lang) as Lang) : "lb";
  const ok = safePath(f.get(F.ok), STATIC_PATHS.kasseDanke[lang]);
  const back = safePath(f.get(F.back), STATIC_PATHS.kasse[lang]);
  const haus: HouseId | null = f.get("haus") === "jager" ? "jager" : f.get("haus") === "lanners" ? "lanners" : null;
  const modus = f.get("modus") === "ship" ? "ship" : f.get("modus") === "collect" ? "collect" : null;
  const zurueck = (code: string, extra: Record<string, string> = {}) =>
    redirect303(siteHref(back, { haus: haus ?? undefined, modus: modus ?? undefined, fehler: code, ...extra }, "#formular-fehler"));

  if (looksLikeBot(f, Date.now())) return redirect303(siteHref(ok));
  const fl = features();
  if (!haus || !modus || (modus === "collect" && !fl.payCollect) || (modus === "ship" && !fl.payShip)) return zurueck("allgemein");
  if (!(await rateLimit(ctx.db, `form:${await hashIp(clientIp(req))}`, shop.rateLimit.formulareProStunde, 3600))) return zurueck("zuviele");

  const err: string[] = [];
  pflicht(f, ["vorname", "name"], err);
  emailFeld(f, "email", err);
  telefonFeld(f, "telefon", err);
  const today = todayInLux(ctx.now());
  let adresse: Adresse | undefined;
  let rechnung: Adresse | null = null;
  let versandCent = 0;
  if (modus === "collect") {
    if (!isValidPickup((hours as unknown as Record<HouseId, HouseHours>)[haus], field(f, "abholung", 10), today, shop.reservierung.abholungMaxTage)) err.push("abholung");
  } else {
    const land = versand.laender.find((l) => l.code === field(f, "land", 2));
    if (!land) err.push("land");
    pflicht(f, ["strasse", "ort"], err);
    const plz = normalizePostcode(field(f, "plz", 12), land?.code ?? "LU");
    if (!plz) err.push("plz");
    adresse = { strasse: field(f, "strasse", 120), zusatz: field(f, "zusatz", 120) || undefined, plz: plz ?? "", ort: field(f, "ort", 80), land: land?.code ?? "LU" };
    versandCent = land?.kostenCent ?? 0;
    if (f.get("rechnung_gleich") !== "1") {
      pflicht(f, ["r_strasse", "r_ort"], err);
      const rplz = normalizePostcode(field(f, "r_plz", 12), adresse.land);
      if (!rplz) err.push("r_plz");
      rechnung = { strasse: field(f, "r_strasse", 120), zusatz: field(f, "r_zusatz", 120) || undefined, plz: rplz ?? "", ort: field(f, "r_ort", 80), land: adresse.land };
    }
  }
  if (err.length) return zurueck("felder", { felder: err.join(",") });

  const pos = positionen(f, shop.reservierung.maxMengeJePosition).filter((p) => ctx.storeToHouse[p.key.slice(12)] === haus);
  if (pos.length === 0) return zurueck("tasche");

  // Live-Abruf: verkaufbare Menge minus laufende Zahlungen
  let live: Awaited<ReturnType<typeof liveAvailability>>;
  try {
    live = await liveAvailability(ctx, pos.map((p) => p.key.slice(0, 8)));
  } catch (e) {
    if (isRetryable(e)) return zurueck("allgemein");
    throw e;
  }
  const weg = pos.filter((p) => (live.get(p.key)?.available ?? 0) < p.menge);
  if (weg.length) return zurueck("bestand", { keys: weg.map((p) => p.key).join(",") });

  // Summen serverseitig aus netto_price (letzter Abgleich), nie aus dem Browser
  const info = await itemInfo(ctx.db, pos.map((p) => p.key));
  const items: OrderItem[] = pos.map((p) => ({ ...info.get(p.key)!, menge: p.menge }));
  if (items.some((i) => !i || !i.preis)) return zurueck("allgemein");
  const zwischensumme = items.reduce((s, i) => s + i.preis * i.menge, 0);
  const gesamt = zwischensumme + versandCent;
  const erwartet = Number(f.get("erwartet"));
  if (Number.isFinite(erwartet) && erwartet > 0 && erwartet !== gesamt) return zurueck("preis");

  const groupId = crypto.randomUUID();
  const token = await groupToken(groupId);
  const number = await newNumber(ctx.db, today);
  const customer = {
    vorname: field(f, "vorname", 100),
    name: field(f, "name", 100),
    email: field(f, "email", 254),
    telefon: field(f, "telefon", 40),
    adresse,
    rechnung,
  };

  // Bestellung und Halte-Mengen in einer Transaktion, mit erneuter Prüfung der Halte-Mengen
  const orderId = await ctx.db.tx(async (db) => {
    const holds = await activeHolds(db, pos.map((p) => p.key));
    for (const p of pos) {
      const stock = live.get(p.key)?.stock ?? 0;
      if (stock - (holds.get(p.key) ?? 0) < p.menge) return null;
    }
    const r = await db.query<{ id: string }>(
      `insert into orders (group_id, number, public_token, house_id, mode, status, customer, items, totals, pickup_from, lang, payment_provider)
       values ($1::uuid, $2, $3, $4, $5, 'pending', $6::jsonb, $7::jsonb, $8::jsonb, $9::date, $10, $11) returning id::text`,
      [groupId, number, token, haus, modus, customer, items, { zwischensumme, versand: versandCent, gesamt }, modus === "collect" ? field(f, "abholung", 10) : null, lang, ctx.pay(haus).name],
    );
    for (const p of pos) {
      await db.query(`insert into holds (key14, qty, order_id, expires_at) values ($1, $2, $3::uuid, now() + make_interval(mins => $4))`, [p.key, p.menge, r[0].id, shop.kauf.holdMinuten]);
    }
    return r[0].id;
  });
  if (!orderId) return zurueck("bestand", { keys: pos.map((p) => p.key).join(",") });

  try {
    const payment = await ctx.pay(haus).createPayment({
      orderId,
      groupId,
      token,
      amountCents: gesamt,
      description: `Bestellung ${number} – ${getHouse(haus).name}`,
      redirectUrl: siteHref(ok, { g: groupId, t: token }),
      webhookUrl: `${ctx.functionsUrl}/payment-webhook`,
      lang,
    });
    await ctx.db.query(`update orders set payment_id = $2, payment_url = $3, updated_at = now() where id = $1::uuid`, [orderId, payment.id, payment.checkoutUrl]);
    return redirect303(payment.checkoutUrl);
  } catch (e) {
    console.error("checkout: Zahlung nicht angelegt:", (e as Error).message);
    await ctx.db.query(`update orders set status = 'failed', updated_at = now() where id = $1::uuid`, [orderId]);
    await ctx.db.query(`delete from holds where order_id = $1::uuid`, [orderId]);
    return zurueck("allgemein");
  }
}
