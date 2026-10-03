/**
 * GET /demo-mail?g=…&t=…[&g=…&t=…] (nur Demo, MAIL_MODE=log): die Mails der
 * Reservierungen, Bestellungen und Anfragen, die dieser Browser abgeschickt hat.
 * Jede Gruppe wird über ihr HMAC-Token geprüft; fremde Mails sind nicht abrufbar.
 */
import { getCtx } from "../_shared/ctx.ts";
import { json, preflight } from "../_shared/http.ts";
import { verifyGroupToken } from "../_shared/security.ts";
import { features } from "../_shared/env.ts";

export async function handler(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (!features().demo) return json(req, { error: "nur-demo" }, 404);
  const u = new URL(req.url);
  const gs = u.searchParams.getAll("g").slice(0, 30);
  const ts = u.searchParams.getAll("t").slice(0, 30);
  const ok: string[] = [];
  for (let i = 0; i < gs.length; i++) if (await verifyGroupToken(gs[i], ts[i] ?? "")) ok.push(gs[i]);
  if (ok.length === 0) return json(req, { mails: [] });
  const ctx = await getCtx();
  const rows = await ctx.db.query<Record<string, unknown>>(
    `select id::text, created_at, to_addr, subject, text_body, html_body, lang, kind from mail_log
      where group_id in (select (jsonb_array_elements_text($1::jsonb))::uuid) order by created_at desc limit 200`,
    [ok],
  );
  return json(req, {
    mails: rows.map((r) => ({
      id: r.id,
      createdAt: new Date(String(r.created_at)).toISOString(),
      to: r.to_addr,
      subject: r.subject,
      text: r.text_body,
      html: r.html_body,
      lang: r.lang,
      kind: r.kind,
    })),
  });
}
