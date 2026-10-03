/**
 * Demo-Fixtures laden (Briefing D10.8). Alle Daten in den Fixtures sind relativ
 * zum Erzeugungstag (meta.generatedOn); hier werden sie auf "heute" verschoben,
 * damit "Neu eingetroffen", Nachlieferungen und der Preisverlauf aktuell bleiben.
 *
 * Wird vom MockSoftTouchClient (Deno) und vom Build im Fixture-Modus (Node) benutzt.
 */
import type {
  StBrand, StCategory, StColor, StPreset, StProduct, StSeason, StSizeTable, StStore, StWashInstruction,
} from "./types.ts";
import meta from "./fixtures/meta.json" with { type: "json" };
import stores from "./fixtures/stores.json" with { type: "json" };
import seasons from "./fixtures/seasons.json" with { type: "json" };
import brands from "./fixtures/brands.json" with { type: "json" };
import categories from "./fixtures/categories.json" with { type: "json" };
import colors from "./fixtures/colors.json" with { type: "json" };
import sizetables from "./fixtures/sizetables.json" with { type: "json" };
import filePresets from "./fixtures/file_presets.json" with { type: "json" };
import textPresets from "./fixtures/text_presets.json" with { type: "json" };
import washInstructions from "./fixtures/wash_instructions.json" with { type: "json" };
import products from "./fixtures/products.json" with { type: "json" };
import offlineHistory from "./fixtures/offline-history.json" with { type: "json" };
import priceHistory from "./fixtures/price-history.json" with { type: "json" };

export interface PriceSegment {
  von: number;
  bis: number;
  netto_price: number;
}

export interface Fixtures {
  generatedOn: string;
  shiftDays: number;
  stores: StStore[];
  seasons: StSeason[];
  brands: StBrand[];
  categories: StCategory[];
  colors: StColor[];
  sizetables: StSizeTable[];
  filePresets: StPreset[];
  textPresets: StPreset[];
  washInstructions: StWashInstruction[];
  products: StProduct[];
  /** Artikel, die online waren: offlineVorTagen relativ zu heute */
  offline: { offlineVorTagen: number; products: StProduct[] }[];
  /** Preisverlauf je Schlüssel als Abschnitte in "Tagen zurück" (Demo, nicht Teil der SoftTouch-API) */
  priceHistory: Record<string, PriceSegment[]>;
}

const DATE_FIELDS = ["first_delivery", "last_delivery", "expected_delivery", "discount_date", "salesstart", "salesend"] as const;

function shiftDate(v: unknown, days: number): unknown {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(v)) return v;
  const d = new Date(v.slice(0, 10) + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) + v.slice(10);
}

function shiftProduct(p: StProduct, days: number): StProduct {
  if (days === 0) return p;
  const q: Record<string, unknown> = { ...p };
  for (const f of DATE_FIELDS) q[f] = shiftDate(q[f], days);
  q.timestamp = shiftDate(q.timestamp, days);
  return q as unknown as StProduct;
}

/** Tage zwischen zwei ISO-Daten (b − a) */
export function daysBetween(a: string, b: string): number {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((db - da) / 86400000);
}

let cache: { today: string; data: Fixtures } | null = null;

/** @param today ISO-Datum in Europe/Luxembourg */
export function loadFixtures(today: string): Fixtures {
  if (cache?.today === today) return cache.data;
  const shift = daysBetween(meta.generatedOn, today);
  const data: Fixtures = {
    generatedOn: meta.generatedOn,
    shiftDays: shift,
    stores: stores as unknown as StStore[],
    seasons: seasons as unknown as StSeason[],
    brands: brands as unknown as StBrand[],
    categories: categories as unknown as StCategory[],
    colors: colors as unknown as StColor[],
    sizetables: sizetables as unknown as StSizeTable[],
    filePresets: filePresets as StPreset[],
    textPresets: textPresets as StPreset[],
    washInstructions: washInstructions as unknown as StWashInstruction[],
    products: (products as unknown as StProduct[]).map((p) => shiftProduct(p, shift)),
    offline: (offlineHistory as unknown as { offlineVorTagen: number; products: StProduct[] }[]).map((o) => ({
      offlineVorTagen: o.offlineVorTagen,
      products: o.products.map((p) => shiftProduct(p, shift)),
    })),
    priceHistory: priceHistory as Record<string, PriceSegment[]>,
  };
  cache = { today, data };
  return data;
}

/** Abschnitte → tägliche Schnappschüsse (Tabelle price_history) */
export function expandPriceHistory(segments: PriceSegment[], today: string): { date: string; netto_price: number }[] {
  const out: { date: string; netto_price: number }[] = [];
  for (const s of segments) {
    for (let d = s.von; d >= s.bis; d--) {
      const date = new Date(today + "T12:00:00Z");
      date.setUTCDate(date.getUTCDate() - d);
      out.push({ date: date.toISOString().slice(0, 10), netto_price: s.netto_price });
    }
  }
  return out;
}
