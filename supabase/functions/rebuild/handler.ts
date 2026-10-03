/** Rebuild der Seite auslösen, wenn nötig (pg_cron alle 10 Minuten oder ?force=1). */
import { getCtx } from "../_shared/ctx.ts";
import { json, text } from "../_shared/http.ts";
import { cronAuthorized } from "../_shared/security.ts";
import { maybeRebuild } from "../_shared/rebuild.ts";

export async function handler(req: Request): Promise<Response> {
  if (!cronAuthorized(req)) return text(401, "Cron-Geheimnis fehlt");
  const ctx = await getCtx();
  return json(req, { rebuild: await maybeRebuild(ctx, { force: new URL(req.url).searchParams.get("force") === "1" }) });
}
