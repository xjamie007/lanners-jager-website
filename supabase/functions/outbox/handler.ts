/** Outbox alle 5 Minuten (pg_cron): SoftTouch-Aufrufe und Mails wiederholen. */
import { getCtx } from "../_shared/ctx.ts";
import { json, text } from "../_shared/http.ts";
import { cronAuthorized } from "../_shared/security.ts";
import { processOutbox } from "../_shared/outbox.ts";

export async function handler(req: Request): Promise<Response> {
  if (!cronAuthorized(req)) return text(401, "Cron-Geheimnis fehlt");
  const ctx = await getCtx();
  return json(req, await processOutbox(ctx));
}
