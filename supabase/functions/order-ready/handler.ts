/**
 * GET /order-ready?art=abholung|versand&token=…&reservationId=999… (OP-06.9)
 * Für die FasMan-Programmvariablen WebshopPickupConfirmURL und
 * WebshopDeliveryConfirmURL (Doku, Receipts > Web shop orders): MyFasMan Mobile
 * ruft die URL auf, sobald das Personal die Bestellung bestätigt; die Kennung
 * hängt FasMan als reservationId= an. Dann bekommt der Kunde eine Mail.
 * Einzutragende URL: …/functions/v1/order-ready?art=abholung&token=<ORDER_READY_SECRET>&
 */
import { getCtx } from "../_shared/ctx.ts";
import { text } from "../_shared/http.ts";
import { env } from "../_shared/env.ts";
import { timingSafeEqual } from "../_shared/security.ts";
import { orderByReservation } from "../_shared/orders.ts";
import { bereitKunde } from "../_shared/mail/templates.ts";

export async function handler(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const secret = env("ORDER_READY_SECRET");
  if (!secret || !timingSafeEqual(secret, u.searchParams.get("token") ?? "")) return text(401, "Token");
  const art = u.searchParams.get("art") === "versand" ? "versand" : "abholung";
  const id = (u.searchParams.get("reservationId") ?? "").trim();
  if (!/^\d{6,12}$/.test(id)) return text(400, "reservationId");
  const ctx = await getCtx();
  const o = await orderByReservation(ctx.db, id);
  if (!o) return text(200, "unbekannt");
  const done = await ctx.db.query(`update orders set ready_notified_at = now(), completed_at = coalesce(completed_at, now()) where id = $1::uuid and ready_notified_at is null returning 1`, [o.id]);
  if (done.length && o.customer?.email) await ctx.mail.send(bereitKunde(o, art));
  return text(200, "ok");
}
