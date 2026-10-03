/**
 * Neubau der Seite über repository_dispatch "catalog-updated" (D10.7).
 * Tagsüber (07–20 Uhr Luxemburg) höchstens alle 30 Minuten, nachts sofort.
 * Fine-Grained-Token nur für dieses Repository (GITHUB_DISPATCH_TOKEN).
 */
import type { Ctx } from "./ctx.ts";
import { env } from "./env.ts";
import { getState, setState } from "./catalog/store.ts";
import { minutesInLux } from "./hours.ts";

export async function maybeRebuild(ctx: Ctx, opts: { force?: boolean } = {}): Promise<string> {
  const needed = await getState<{ since: string; reason: string }>(ctx.db, "rebuild_needed");
  if (!needed && !opts.force) return "nicht nötig";
  const last = await getState<{ at: string }>(ctx.db, "last_rebuild_at");
  const m = minutesInLux(ctx.now());
  const tagsueber = m >= 7 * 60 && m < 20 * 60;
  if (!opts.force && tagsueber && last && ctx.now().getTime() - new Date(last.at).getTime() < 30 * 60000) return "später (höchstens alle 30 Minuten)";

  const token = env("GITHUB_DISPATCH_TOKEN");
  const repo = env("GITHUB_REPOSITORY");
  if (!token || !repo) {
    await setState(ctx.db, "rebuild_needed", null);
    await setState(ctx.db, "last_rebuild_at", { at: ctx.now().toISOString(), skipped: "kein GITHUB_DISPATCH_TOKEN" });
    return "übersprungen (kein Token, z. B. lokal)";
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "content-type": "application/json" },
    body: JSON.stringify({ event_type: "catalog-updated", client_payload: { reason: needed?.reason ?? "manuell" } }),
  });
  if (!res.ok) return `Fehler: GitHub HTTP ${res.status}`;
  await setState(ctx.db, "rebuild_needed", null);
  await setState(ctx.db, "last_rebuild_at", { at: ctx.now().toISOString() });
  return "ausgelöst";
}
