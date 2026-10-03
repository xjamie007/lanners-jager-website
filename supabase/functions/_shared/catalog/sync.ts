/**
 * Abgleich mit SoftTouch (Briefing D10.4).
 *  - full:  nachts alle Online-Artikel seitenweise (take=500), Stammdaten,
 *           Mark-and-sweep nur nach vollständigem Erfolg, Preis-Schnappschuss, Fotos
 *  - delta: alle 10 Minuten updated_since_minutes=15 mit discount_online,
 *           vorher Eskalationsprobe take=1&skip=10000
 * Jede Antwort wird geprüft (schemas.ts). sync_runs zählt die API-Aufrufe.
 */
import type { Ctx } from "../ctx.ts";
import { softtouch } from "../generated/config/softtouch.ts";
import { transformProducts, type TransformConfig } from "./transform.ts";
import { upsertArticles, upsertSkus, replaceTexts, replaceFiles, markMissingOffline, setOffline, snapshotPrices, invalidateStock, upsertMaster, setState, getState } from "./store.ts";
import { markDemoPhotos, mirrorPhotos } from "./photos.ts";
import { loadFixtures, expandPriceHistory } from "../softtouch/fixtures.ts";
import { todayInLux, addDays } from "../hours.ts";
import type { StProduct } from "../softtouch/types.ts";
import { SoftTouchError } from "../softtouch/client.ts";

export interface SyncResult {
  ok: boolean;
  pages: number;
  changes: number;
  apiCalls: number;
  errors: string[];
  escalated?: boolean;
  rebuildNeeded: boolean;
}

async function runStart(ctx: Ctx, kind: string): Promise<number> {
  const r = await ctx.db.query<{ id: number }>(`insert into sync_runs (kind) values ($1) returning id::int as id`, [kind]);
  return Number(r[0].id);
}

async function runEnd(ctx: Ctx, id: number, res: SyncResult) {
  await ctx.db.query(`update sync_runs set finished_at = now(), ok = $2, pages = $3, changes = $4, errors = $5::jsonb, api_calls = $6 where id = $1`, [
    id,
    res.ok,
    res.pages,
    res.changes,
    res.errors.slice(0, 50),
    res.apiCalls,
  ]);
}

async function transformConfig(ctx: Ctx, account: string): Promise<TransformConfig> {
  const brands = await ctx.db.query<{ key: string; data: { name?: string; alias?: string } }>(`select key, data from st_brands where account = $1`, [account]);
  return {
    channel: ctx.channel,
    storeToHouse: ctx.storeToHouse,
    account,
    textPresets: softtouch.textPresets,
    filePresets: softtouch.filePresets,
    defaultPhotoFit: softtouch.defaultPhotoFit,
    displayNameField: softtouch.displayNameField,
    displayNameFallback: softtouch.displayNameFallback,
    brandNames: Object.fromEntries(brands.map((b) => [b.key, b.data.alias || b.data.name || b.key])),
  };
}

async function syncMaster(ctx: Ctx, group: ReturnType<Ctx["accounts"]>[number]) {
  const c = group.client;
  const acc = c.account;
  const db = ctx.db;
  await upsertMaster(db, "st_stores", acc, (await c.getStores()) as unknown as Record<string, unknown>[], (r) => String(r.key));
  await upsertMaster(db, "st_seasons", acc, (await c.getSeasons()) as unknown as Record<string, unknown>[], (r) => String(r.id));
  await upsertMaster(db, "st_brands", acc, (await c.getBrands()) as unknown as Record<string, unknown>[], (r) => String(r.key));
  await upsertMaster(db, "st_categories", acc, (await c.getCategories()) as unknown as Record<string, unknown>[], (r) => String(r.key));
  await upsertMaster(db, "st_colors", acc, (await c.getColors()) as unknown as Record<string, unknown>[], (r) => String(r.id));
  await upsertMaster(db, "st_size_tables", acc, (await c.getSizeTables()) as unknown as Record<string, unknown>[], (r) => String(r.key));
  await upsertMaster(db, "st_file_presets", acc, (await c.getFilePresets()) as unknown as Record<string, unknown>[], (r) => String(r.id));
  await upsertMaster(db, "st_text_presets", acc, (await c.getTextPresets()) as unknown as Record<string, unknown>[], (r) => String(r.id));
  await upsertMaster(db, "st_wash_instructions", acc, (await c.getWashInstructions()) as unknown as Record<string, unknown>[], (r) => String(r.id));
}

async function applyProducts(ctx: Ctx, account: string, products: StProduct[], cfg: TransformConfig) {
  const t = transformProducts(products, cfg);
  const uid8s = t.articles.map((a) => a.uid8);
  await upsertArticles(ctx.db, t.articles);
  const { priceChanged } = await upsertSkus(ctx.db, t.skus);
  await replaceTexts(ctx.db, uid8s, t.texts);
  await replaceFiles(ctx.db, uid8s, t.files);
  await invalidateStock(ctx.db, uid8s);
  return { t, priceChanged };
}

/** Nur Demo: Offline-Historie und Preisverlauf aus den Fixtures einspielen */
async function seedDemoHistory(ctx: Ctx, cfg: TransformConfig) {
  const today = todayInLux(ctx.now());
  const fx = loadFixtures(today);
  for (const o of fx.offline) {
    const exists = await ctx.db.query(`select 1 from articles where uid8 = $1`, [String(o.products[0].key).slice(0, 8)]);
    if (exists.length) continue;
    const t = transformProducts(o.products, { ...cfg, channel: cfg.channel });
    for (const a of t.articles) a.online = false;
    await upsertArticles(ctx.db, t.articles);
    await upsertSkus(ctx.db, t.skus);
    await replaceTexts(ctx.db, t.articles.map((a) => a.uid8), t.texts);
    await replaceFiles(ctx.db, t.articles.map((a) => a.uid8), t.files);
    await ctx.db.query(`update articles set offline_since = $2::date::timestamptz where uid8 in (select jsonb_array_elements_text($1::jsonb))`, [
      t.articles.map((a) => a.uid8),
      addDays(today, -o.offlineVorTagen),
    ]);
  }
  const rows: { key14: string; date: string; netto_price: number }[] = [];
  for (const [key14, segs] of Object.entries(fx.priceHistory)) for (const p of expandPriceHistory(segs, today)) rows.push({ key14, ...p });
  for (let i = 0; i < rows.length; i += 1000) {
    await ctx.db.query(
      `insert into price_history (key14, date, netto_price) select key14, date, netto_price from jsonb_to_recordset($1::jsonb) as x(key14 text, date date, netto_price numeric)
       on conflict (key14, date) do nothing`,
      [rows.slice(i, i + 1000)],
    );
  }
}

export async function syncFull(ctx: Ctx): Promise<SyncResult> {
  const runId = await runStart(ctx, "full");
  const res: SyncResult = { ok: true, pages: 0, changes: 0, apiCalls: 0, errors: [], rebuildNeeded: false };
  const callsBefore = ctx.accounts().reduce((s, g) => s + g.client.calls, 0);
  const seen: string[] = [];
  try {
    for (const group of ctx.accounts()) {
      await syncMaster(ctx, group);
      const cfg = await transformConfig(ctx, group.client.account);
      for (let skip = 0; ; skip += softtouch.pageSize) {
        const page = await group.client.getProducts({ online: ctx.channel, display: "full", take: softtouch.pageSize, skip, stores: group.stores.join(",") });
        res.pages++;
        const { t, priceChanged } = await applyProducts(ctx, group.client.account, page, cfg);
        seen.push(...t.articles.filter((a) => a.online).map((a) => a.uid8));
        res.changes += t.articles.length;
        if (priceChanged) res.rebuildNeeded = true;
        if (t.skipped.length) res.errors.push(...t.skipped.slice(0, 10).map((s) => `${s.key}: ${s.reason}`));
        if (page.length < softtouch.pageSize) break;
      }
      if (ctx.mode === "mock") await seedDemoHistory(ctx, cfg);
    }
    // Mark-and-sweep, nur wenn alle Seiten erfolgreich waren
    const offline = await markMissingOffline(ctx.db, [...new Set(seen)]);
    if (offline) res.rebuildNeeded = true;
    await snapshotPrices(ctx.db, todayInLux(ctx.now()));
    if (ctx.mode === "mock") await markDemoPhotos(ctx.db);
    else {
      const p = await mirrorPhotos(ctx.db);
      res.errors.push(...p.errors.slice(0, 20));
    }
    res.rebuildNeeded = true; // nach dem nächtlichen Abgleich immer neu bauen
    await setState(ctx.db, "last_full_sync", { at: ctx.now().toISOString() });
    await setState(ctx.db, "sync_full_retry", null);
  } catch (e) {
    res.ok = false;
    res.errors.push((e as Error).message);
    // HTTP 500 (z. B. Sicherung in der Nacht): nach 2, 5, 10 Minuten wiederholen
    if (e instanceof SoftTouchError && e.retryable) {
      const prev = (await getState<{ attempt: number }>(ctx.db, "sync_full_retry")) ?? { attempt: 0 };
      const delays = [2, 5, 10];
      if (prev.attempt < delays.length) {
        await setState(ctx.db, "sync_full_retry", { attempt: prev.attempt + 1, at: new Date(ctx.now().getTime() + delays[prev.attempt] * 60000).toISOString() });
      } else await setState(ctx.db, "sync_full_retry", null);
    }
  }
  res.apiCalls = ctx.accounts().reduce((s, g) => s + g.client.calls, 0) - callsBefore;
  if (res.rebuildNeeded) await setState(ctx.db, "rebuild_needed", { since: ctx.now().toISOString(), reason: "sync-full" });
  await runEnd(ctx, runId, res);
  return res;
}

export async function syncDelta(ctx: Ctx): Promise<SyncResult> {
  const runId = await runStart(ctx, "delta");
  const res: SyncResult = { ok: true, pages: 0, changes: 0, apiCalls: 0, errors: [], rebuildNeeded: false };
  const callsBefore = ctx.accounts().reduce((s, g) => s + g.client.calls, 0);
  try {
    for (const group of ctx.accounts()) {
      const base = { discount_online: ctx.channel, updated_since_minutes: softtouch.deltaWindowMinutes, display: "full" as const, stores: group.stores.join(",") };
      // Eskalationsprobe: Haben sich Tausende geändert, ist der Komplett-Abgleich schneller
      const probe = await group.client.getProducts({ ...base, take: 1, skip: softtouch.escalationSkip });
      if (probe.length > 0) {
        res.escalated = true;
        break;
      }
      const cfg = await transformConfig(ctx, group.client.account);
      for (let skip = 0; ; skip += softtouch.pageSize) {
        const page = await group.client.getProducts({ ...base, take: softtouch.pageSize, skip });
        res.pages++;
        const before = await ctx.db.query<{ uid8: string }>(`select uid8 from articles where online`);
        const onlineBefore = new Set(before.map((r) => r.uid8));
        const { t, priceChanged } = await applyProducts(ctx, group.client.account, page, cfg);
        // Fehlt das Online-Flag des Kanals, geht der Artikel offline
        const off = t.articles.filter((a) => !a.online).map((a) => a.uid8);
        const nowOffline = await setOffline(ctx.db, off);
        const newlyOnline = t.articles.filter((a) => a.online && !onlineBefore.has(a.uid8)).length;
        res.changes += t.articles.length;
        if (priceChanged || nowOffline || newlyOnline) res.rebuildNeeded = true;
        if (page.length < softtouch.pageSize) break;
      }
    }
    if (ctx.mode === "mock") await markDemoPhotos(ctx.db);
  } catch (e) {
    res.ok = false;
    res.errors.push((e as Error).message);
  }
  res.apiCalls = ctx.accounts().reduce((s, g) => s + g.client.calls, 0) - callsBefore;
  if (res.rebuildNeeded) await setState(ctx.db, "rebuild_needed", { since: ctx.now().toISOString(), reason: "sync-delta" });
  await runEnd(ctx, runId, res);
  if (res.escalated) return { ...(await syncFull(ctx)), escalated: true };
  return res;
}
