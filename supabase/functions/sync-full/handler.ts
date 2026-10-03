/**
 * Komplett-Abgleich (D10.4), täglich 04:15 Uhr Luxemburg. pg_cron ruft in UTC
 * zu beiden möglichen Stunden; hier wird nur zur Ortszeit 04:xx gearbeitet.
 * ?retry=1: Wiederholung nach HTTP 500 (2, 5, 10 Minuten), nur wenn fällig.
 * ?force=1: sofort (nur mit Cron-Geheimnis, z. B. für die Erstbefüllung).
 */
import { getCtx } from "../_shared/ctx.ts";
import { json, text } from "../_shared/http.ts";
import { cronAuthorized } from "../_shared/security.ts";
import { minutesInLux } from "../_shared/hours.ts";
import { syncFull } from "../_shared/catalog/sync.ts";
import { getState } from "../_shared/catalog/store.ts";
import { maybeRebuild } from "../_shared/rebuild.ts";

export async function handler(req: Request): Promise<Response> {
  if (!cronAuthorized(req)) return text(401, "Cron-Geheimnis fehlt");
  const ctx = await getCtx();
  const u = new URL(req.url);
  if (u.searchParams.get("retry") === "1") {
    const r = await getState<{ attempt: number; at: string }>(ctx.db, "sync_full_retry");
    if (!r || new Date(r.at).getTime() > ctx.now().getTime()) return json(req, { skip: "keine Wiederholung fällig" });
  } else if (u.searchParams.get("force") !== "1") {
    const h = Math.floor(minutesInLux(ctx.now()) / 60);
    if (h !== 4) return json(req, { skip: `Ortszeit ${h} Uhr, Abgleich läuft um 4 Uhr` });
  }
  const res = await syncFull(ctx);
  const rebuild = res.ok ? await maybeRebuild(ctx, { force: true }) : "nein";
  return json(req, { ...res, rebuild });
}
