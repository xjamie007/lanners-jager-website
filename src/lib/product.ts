/**
 * Produktseiten-Logik: Textsprache mit Sprachfolge (D10.3), Pflegesymbole,
 * Größen je Haus für die Größenleiste, Description nach G2.
 */
import { softtouch } from "../config/softtouch.ts";
import { getHouse, type HouseId } from "../config/houses.ts";
import { t, type Lang } from "../i18n/index.ts";
import { formatPrice } from "../../supabase/functions/_shared/format.ts";
import type { Article, Catalog, Size, SkuCell } from "./catalog/types.ts";
import { descriptionLaenge } from "./listmeta.ts";

export interface ResolvedText {
  lang: string;
  texts: string[];
  fallback: boolean;
}

/** Text einer Art in der Seitensprache oder der nächsten aus der Sprachfolge. Nie übersetzt. */
export function textFor(a: Article, kinds: string[], lang: Lang): ResolvedText | null {
  const chain = softtouch.textFallback[lang];
  for (const l of chain) {
    for (const kind of kinds) {
      const list = a.texts.filter((x) => x.kind === kind && x.lang === l).sort((p, q) => p.sort - q.sort);
      if (list.length) return { lang: l, texts: list.map((x) => x.text), fallback: l !== lang };
    }
  }
  return null;
}

export function washFor(a: Article, cat: Catalog, lang: Lang): ResolvedText | null {
  if (a.wash.length === 0) return null;
  const chain = softtouch.textFallback[lang].filter((l) => (softtouch.washTitleLangs as readonly string[]).includes(l));
  const l = chain[0] ?? "fr";
  const items = a.wash
    .map((id) => cat.wash.get(id))
    .filter((w) => !!w)
    .sort((p, q) => Number(p!.kind) - Number(q!.kind) || p!.sort - q!.sort)
    .map((w) => (w as unknown as Record<string, string>)[`title_${l}`])
    .filter(Boolean);
  if (items.length === 0) return null;
  return { lang: l, texts: items, fallback: l !== lang };
}

export interface HouseRow {
  house: HouseId;
  cells: (SkuCell | null)[];
  total: number;
}

/** Je Haus, das den Artikel führt, eine Reihe über die Vereinigung aller Größen */
export function sizeRows(a: Article): HouseRow[] {
  const rows: HouseRow[] = [];
  for (const house of a.houses) {
    const cells = a.sizes.map((s) => a.cells.find((c) => c.house === house && c.size.x === s.x && c.size.y === s.y) ?? null);
    rows.push({ house, cells, total: cells.reduce((n, c) => n + (c?.stock ?? 0), 0) });
  }
  // Hausnummern aufsteigend: Lanners (18) vor Jager (32)
  return rows.sort((p, q) => Number(getHouse(p.house).nr) - Number(getHouse(q.house).nr));
}

/** Achsen der 2D-Matrix: Spalten = Weite, Zeilen = Länge */
export function matrixAxes(a: Article): { xs: { x: string; label: string }[]; ys: { y: string; label: string }[] } {
  const xs = new Map<string, string>();
  const ys = new Map<string, string>();
  for (const s of a.sizes) {
    xs.set(s.x, s.xLabel);
    ys.set(s.y, s.yLabel);
  }
  const sortPos = (m: Map<string, string>) => [...m.entries()].sort((p, q) => Number(p[0]) - Number(q[0]));
  return { xs: sortPos(xs).map(([x, label]) => ({ x, label })), ys: sortPos(ys).map(([y, label]) => ({ y, label })) };
}

export function cellAt(a: Article, house: HouseId, x: string, y: string): SkuCell | null {
  return a.cells.find((c) => c.house === house && c.size.x === x && c.size.y === y) ?? null;
}

function joinList(items: string[], lang: Lang): string {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + t(lang, "seo.und") + items[items.length - 1];
}

/** Description (G2) mit Häusern und vorrätigen Größen; < 150 Zeichen: "Im Laden anprobieren." anhängen */
export function productDescription(a: Article, lang: Lang, canBuy: boolean): string {
  const sizes: Size[] = a.sizes.filter((s) => a.cells.some((c) => c.size === s && c.stock > 0));
  const housesWithStock = (["lanners", "jager"] as const).filter((h) => a.stockByHouse[h] > 0);
  const preis = formatPrice(a.nettoCents, lang);
  const base = { marke: a.brand.name, name: a.name, farbe: a.colorName, preis };
  if (sizes.length === 0 || housesWithStock.length === 0) {
    const h = getHouse(a.houses[0]);
    return t(lang, "seo.produktDescNichts", { ...base, haus: t(lang, "seo.haeuserEins", { haus: h.short, nr: h.nr }) });
  }
  const haus =
    housesWithStock.length > 1 ? t(lang, "seo.haeuserBeide") : t(lang, "seo.haeuserEins", { haus: getHouse(housesWithStock[0]).short, nr: getHouse(housesWithStock[0]).nr });
  const key = canBuy ? "seo.produktDesc" : "seo.produktDescReserve";
  let groessen = sizes.length === 1 && sizes[0].label === "TU" ? t(lang, "groesse.einheitsgroesse") : joinList(sizes.map((s) => s.label), lang);
  let d = t(lang, key, { ...base, haus, groessen });
  if (d.length > 160 && sizes.length > 2) {
    groessen = t(lang, "zeiten.spanne", { von: sizes[0].label, bis: sizes[sizes.length - 1].label });
    d = t(lang, key, { ...base, haus, groessen });
  }
  return descriptionLaenge(d, [t(lang, "seo.produktDescZusatz")]);
}
