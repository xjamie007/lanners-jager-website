/**
 * Datenquelle des Builds (Briefing D10.7).
 *
 *  CATALOG_SOURCE=fixtures  (Standard lokal) Demo-Fixtures im SoftTouch-Format,
 *                           durch dieselbe Transformation wie der nächtliche Abgleich
 *  CATALOG_SOURCE=api       Zeilen aus Supabase über die Function `catalog-export`,
 *                           geschützt mit BUILD_SECRET (nur in GitHub Actions)
 *  CATALOG_FILE=<pfad>      fertige Zeilen aus einer Datei (Lasttest, nie deployt)
 */
import { readFileSync } from "node:fs";
import { loadFixtures, expandPriceHistory } from "../../../supabase/functions/_shared/softtouch/fixtures.ts";
import { transformProducts, storeMap, type TransformConfig } from "../../../supabase/functions/_shared/catalog/transform.ts";
import { todayInLux, addDays } from "../../../supabase/functions/_shared/hours.ts";
import { softtouch } from "../../config/softtouch.ts";
import { houses } from "../../config/houses.ts";
import type { CatalogRows } from "./types.ts";

const env = (k: string): string | undefined => {
  const v = process.env[k];
  return v === "" ? undefined : v;
};

function storesFromEnv(): Record<"lanners" | "jager", string[]> {
  const out = {} as Record<"lanners" | "jager", string[]>;
  for (const h of houses) {
    const v = env(h.softtouch.stores);
    out[h.id] = v ? v.split(",").map((s) => s.trim()).filter(Boolean) : h.softtouch.demoStoreIds;
  }
  return out;
}

/**
 * Demo-Fotos liegen in public/demo-fotos/: Stockfotos (WebP), freigestellt auf Weiß
 * (Preset 01, im Glasrahmen mit Rand), dazu ein Detailausschnitt (Preset 03, füllt
 * den Rahmen). Die Darstellung kommt wie bei echten Fotos aus den File-Presets.
 */
const demoDatei = <F extends { filename: string; fit: string }>(f: F) => ({
  ...f,
  storage_path: `demo-fotos/${f.filename}`,
  width: 900,
  height: 1200,
});

export function fixtureRows(now = new Date()): CatalogRows {
  const today = todayInLux(now);
  const fx = loadFixtures(today);
  const brandNames = Object.fromEntries(fx.brands.map((b) => [b.key, b.alias || b.name]));
  const cfg: TransformConfig = {
    channel: Number(env("ST_ONLINE_CHANNEL") ?? softtouch.onlineChannel),
    storeToHouse: storeMap(storesFromEnv()),
    account: "demo",
    textPresets: softtouch.textPresets,
    filePresets: softtouch.filePresets,
    defaultPhotoFit: softtouch.defaultPhotoFit,
    displayNameField: softtouch.displayNameField,
    displayNameFallback: softtouch.displayNameFallback,
    brandNames,
  };
  const live = transformProducts(fx.products, cfg);
  const rows: CatalogRows = {
    asOf: now.toISOString(),
    source: "fixtures",
    stores: fx.stores,
    brands: fx.brands,
    colors: fx.colors,
    sizetables: fx.sizetables,
    seasons: fx.seasons,
    wash: fx.washInstructions,
    articles: live.articles.filter((a) => a.online).map((a) => ({ ...a, offline_since: null })),
    skus: live.skus,
    texts: live.texts,
    files: live.files.map(demoDatei),
    priceHistory: [],
  };
  const onlineUids = new Set(rows.articles.map((a) => a.uid8));
  rows.skus = rows.skus.filter((s) => onlineUids.has(s.uid8));
  rows.texts = rows.texts.filter((s) => onlineUids.has(s.uid8));
  rows.files = rows.files.filter((s) => onlineUids.has(s.uid8));

  // Artikel, die online waren (Briefing D4: Offline-Zustand, nach 30 Tagen weg)
  for (const o of fx.offline) {
    const r = transformProducts(o.products, cfg);
    const since = addDays(today, -o.offlineVorTagen);
    for (const a of r.articles) rows.articles.push({ ...a, online: false, offline_since: since });
    rows.skus.push(...r.skus);
    rows.texts.push(...r.texts);
    rows.files.push(...r.files.map(demoDatei));
  }

  for (const [key14, segs] of Object.entries(fx.priceHistory)) {
    for (const p of expandPriceHistory(segs, today)) rows.priceHistory.push({ key14, ...p });
  }
  return rows;
}

async function apiRows(): Promise<CatalogRows> {
  const base = (env("PUBLIC_FUNCTIONS_URL") ?? "").replace(/\/+$/, "");
  const secret = env("BUILD_SECRET");
  if (!base || !secret) throw new Error("CATALOG_SOURCE=api braucht PUBLIC_FUNCTIONS_URL und BUILD_SECRET");
  const get = async (q: string) => {
    const res = await fetch(`${base}/catalog-export?${q}`, { headers: { "x-build-secret": secret } });
    if (!res.ok) throw new Error(`catalog-export ${q}: HTTP ${res.status}`);
    return res.json();
  };
  const master = await get("part=master");
  const rows: CatalogRows = { ...master, source: "api", articles: [], skus: [], texts: [], files: [], priceHistory: [] };
  for (const part of ["articles", "skus", "texts", "files", "priceHistory"] as const) {
    const limit = 5000;
    for (let offset = 0; ; offset += limit) {
      const chunk: unknown[] = await get(`part=${part}&offset=${offset}&limit=${limit}`);
      (rows[part] as unknown[]).push(...chunk);
      if (chunk.length < limit) break;
    }
  }
  return rows;
}

export async function loadRows(): Promise<CatalogRows> {
  const file = env("CATALOG_FILE");
  if (file) return { ...(JSON.parse(readFileSync(file, "utf8")) as CatalogRows), source: "loadtest" };
  const source = env("CATALOG_SOURCE") ?? "fixtures";
  if (source === "api") return apiRows();
  if (source !== "fixtures") throw new Error(`Unbekannte CATALOG_SOURCE: ${source}`);
  return fixtureRows();
}
