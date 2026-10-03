/**
 * Aufbewahrung (D10.9), täglich. Vorschlag (unbestätigt, OP-06.8):
 * Reservierungen 30 Tage nach dem Abholdatum anonymisieren, Bestellungen 90 Tage
 * nach Abschluss (Belege liegen in SoftTouch), Anfragen nach 12 Monaten.
 */
import { getCtx } from "../_shared/ctx.ts";
import { json, text } from "../_shared/http.ts";
import { cronAuthorized } from "../_shared/security.ts";
import { shop } from "../_shared/generated/config/shop.ts";

const ANON = `jsonb_build_object('anonymisiert', true)`;

export async function handler(req: Request): Promise<Response> {
  if (!cronAuthorized(req)) return text(401, "Cron-Geheimnis fehlt");
  const ctx = await getCtx();
  const a = shop.aufbewahrung;
  const r: Record<string, number> = {};
  const count = async (name: string, sql: string, params: unknown[] = []) => {
    r[name] = (await ctx.db.query(sql + " returning 1", params)).length;
  };
  await count(
    "reservierungen",
    `update orders set customer = ${ANON}, anonymized_at = now() where mode = 'reserve' and anonymized_at is null
       and coalesce(hold_until, pickup_from, created_at::date) < current_date - $1::int`,
    [a.reservierungTageNachAbholung],
  );
  await count(
    "bestellungen",
    `update orders set customer = ${ANON}, anonymized_at = now() where mode <> 'reserve' and anonymized_at is null
       and coalesce(completed_at, paid_at, updated_at) < now() - make_interval(days => $1::int)`,
    [a.bestellungTageNachAbschluss],
  );
  await count("anfragen", `update requests set data = ${ANON}, anonymized_at = now() where anonymized_at is null and created_at < now() - make_interval(months => $1::int)`, [a.anfragenMonate]);
  // Offene Zahlungen, die nie zurückkamen
  await count("abgelaufen", `update orders set status = 'expired', updated_at = now() where status = 'pending' and created_at < now() - interval '1 day'`);
  await count("mail_log", `delete from mail_log where created_at < now() - interval '30 days'`);
  await count("holds", `delete from holds where expires_at < now() - interval '1 day'`);
  await count("rate_limits", `delete from rate_limits where window_start < now() - interval '2 days'`);
  await count("stock_cache", `delete from stock_cache where fetched_at < now() - interval '1 day'`);
  // Offline-Artikel: nach 30 Tagen nicht mehr gebaut, nach 60 Tagen gelöscht
  await count("artikel", `delete from articles where not online and offline_since < now() - interval '60 days'`);
  await count("sync_runs", `delete from sync_runs where started_at < now() - interval '90 days'`);
  return json(req, r);
}
