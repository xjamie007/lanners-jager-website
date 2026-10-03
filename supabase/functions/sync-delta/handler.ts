/**
 * Änderungen alle 10 Minuten, 07:00–20:00 Uhr Luxemburg (78 Läufe am Tag).
 * Bei einer Flut von Änderungen (Eskalationsprobe) läuft der Komplett-Abgleich.
 */
import { getCtx } from "../_shared/ctx.ts";
import { json, text } from "../_shared/http.ts";
import { cronAuthorized } from "../_shared/security.ts";
import { minutesInLux } from "../_shared/hours.ts";
import { syncDelta } from "../_shared/catalog/sync.ts";
import { maybeRebuild } from "../_shared/rebuild.ts";

export async function handler(req: Request): Promise<Response> {
  if (!cronAuthorized(req)) return text(401, "Cron-Geheimnis fehlt");
  const ctx = await getCtx();
  if (new URL(req.url).searchParams.get("force") !== "1") {
    const m = minutesInLux(ctx.now());
    if (m < 7 * 60 || m >= 20 * 60) return json(req, { skip: "außerhalb 07:00–20:00 Uhr" });
  }
  const res = await syncDelta(ctx);
  const rebuild = res.rebuildNeeded ? await maybeRebuild(ctx) : "nicht nötig";
  return json(req, { ...res, rebuild });
}
