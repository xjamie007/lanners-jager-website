/**
 * Zeilen → Katalog für den Build: Preise in Cent, Größenraster je Haus,
 * Fotos in Reihenfolge, Farbvarianten, Omnibus-Preis.
 */
import warengruppen from "../../content/warengruppen.json" with { type: "json" };
import { softtouch } from "../../config/softtouch.ts";
import { slugify, colorNameFromBrand, titleCase } from "../../../supabase/functions/_shared/text.ts";
import { addDays, todayInLux } from "../../../supabase/functions/_shared/hours.ts";
import type { Article, Brand, Catalog, CatalogRows, ColorGroup, HouseId, Photo, Size, SkuCell } from "./types.ts";

const cents = (eur: number) => Math.round(eur * 100);

export interface AssembleOptions {
  /** Basis für Foto-URLs im Storage (Produktion) */
  storagePublicBase?: string;
  /** Basis-Pfad der Seite für lokale Demo-Fotos */
  basePath: string;
  today?: string;
  /** Demo-Artikel erlaubt? Sonst bricht der Build ab (Briefing D10.8) */
  allowDemo: boolean;
}

function photoSrc(storagePath: string | null | undefined, filename: string, o: AssembleOptions): { src: string; demo: boolean } {
  const p = storagePath ?? filename;
  if (p.startsWith("demo-fotos/")) return { src: `${o.basePath}${p}`, demo: true };
  if (!o.storagePublicBase) throw new Error(`Foto ohne Storage-Basis: ${p} (SUPABASE_URL fehlt)`);
  return { src: `${o.storagePublicBase.replace(/\/+$/, "")}/${p}`, demo: false };
}

/**
 * Omnibus-Richtlinie (RL 98/6/EG Art. 6a): angegeben wird der niedrigste Preis,
 * den das Haus in den 30 Tagen VOR der Preissenkung verlangt hat. Beginn der
 * Senkung = erster Tag der ununterbrochenen Folge reduzierter Tage bis heute.
 * Fehlt der Verlauf davor, gilt der reguläre Preis.
 */
export function lowestBeforeReduction(history: { date: string; netto_price: number }[], regular: number, today: string): number {
  const byDate = new Map(history.map((h) => [h.date, h.netto_price]));
  let start = today;
  for (let d = today; ; ) {
    const v = byDate.get(d);
    if (v === undefined || v >= regular - 0.004) break;
    start = d;
    d = addDays(d, -1);
  }
  let lowest = Infinity;
  for (let i = 1; i <= 30; i++) {
    const v = byDate.get(addDays(start, -i));
    if (v !== undefined) lowest = Math.min(lowest, v);
  }
  return Number.isFinite(lowest) ? lowest : regular;
}

export function assemble(rows: CatalogRows, o: AssembleOptions): Catalog {
  const today = o.today ?? todayInLux();
  const brandRows = new Map(rows.brands.map((b) => [b.key, b]));
  const colorRows = new Map(rows.colors.map((c) => [c.id, c]));
  const tables = new Map(rows.sizetables.map((t) => [t.key, t]));

  const abteilungen = warengruppen.abteilungen as Record<string, { st: string[] }>;
  const abteilungOf = (cat1: string | null): "damen" | "herren" | null => {
    for (const [id, a] of Object.entries(abteilungen)) if (cat1 && a.st.includes(cat1)) return id as "damen" | "herren";
    return null;
  };
  const gruppeOf = (cat2: string | null) => warengruppen.warengruppen.find((w) => cat2 && w.st.includes(cat2)) ?? null;

  const skusBy = new Map<string, CatalogRows["skus"]>();
  for (const s of rows.skus) (skusBy.get(s.uid8) ?? skusBy.set(s.uid8, []).get(s.uid8)!).push(s);
  const textsBy = new Map<string, CatalogRows["texts"]>();
  for (const t of rows.texts) (textsBy.get(t.uid8) ?? textsBy.set(t.uid8, []).get(t.uid8)!).push(t);
  const filesBy = new Map<string, CatalogRows["files"]>();
  for (const f of rows.files) (filesBy.get(f.uid8) ?? filesBy.set(f.uid8, []).get(f.uid8)!).push(f);
  const historyBy = new Map<string, { date: string; netto_price: number }[]>();
  for (const h of rows.priceHistory) (historyBy.get(h.key14) ?? historyBy.set(h.key14, []).get(h.key14)!).push(h);

  const colorGroups = new Map<string, ColorGroup>();
  const colorGroup = (id: string | null): ColorGroup | null => {
    if (!id) return null;
    const c = colorRows.get(id);
    if (!c) return null;
    if (!colorGroups.has(id)) {
      const de = titleCase(c.lang1 || c.description);
      colorGroups.set(id, {
        id,
        hex: c.colorhex,
        names: { de, lb: de, fr: titleCase(c.lang2 || de), en: titleCase(c.lang3 || de) },
        slug: slugify(de),
      });
    }
    return colorGroups.get(id)!;
  };

  const brands = new Map<string, Brand>();
  const articles: Article[] = [];
  const maxOfflineDays = 30;

  for (const a of rows.articles) {
    if (a.offline_since && a.offline_since < addDays(today, -maxOfflineDays)) continue; // nach 30 Tagen weg
    const skus = skusBy.get(a.uid8) ?? [];
    if (skus.length === 0) continue;
    const isDemo = (a as unknown as Record<string, string>)[softtouch.demoMarker.field] === softtouch.demoMarker.value;
    if (isDemo && !o.allowDemo) {
      throw new Error(`Demo-Artikel ${a.uid8} im Katalog, aber PUBLIC_DEMO ist nicht "true". Demo-Daten dürfen nie in eine Produktivumgebung.`);
    }
    const br = brandRows.get(a.brand_id);
    const brandName = br ? br.alias || br.name : a.brand_id;
    const brandSlug = slugify(brandName);
    if (!brands.has(brandSlug)) brands.set(brandSlug, { id: a.brand_id, name: brandName, slug: brandSlug, houses: [], count: 0 });
    const brand = brands.get(brandSlug)!;

    const table = tables.get(a.size_table_id) ?? null;
    const sizeKey = (x: string, y: string) => `${x}${y}`;
    const sizes = new Map<string, Size>();
    const cells: SkuCell[] = [];
    for (const s of skus) {
      const xLabel = s.size_x_label || table?.sizeX.find((p) => p.pos === Number(s.size_x))?.txt || s.size_x;
      const yLabel = s.size_y === "01" && !s.size_y_label ? "" : s.size_y_label || table?.sizeY.find((p) => p.pos === Number(s.size_y))?.txt || "";
      const label = yLabel ? `${xLabel}/${yLabel}` : xLabel;
      const k = sizeKey(s.size_x, s.size_y);
      if (!sizes.has(k)) sizes.set(k, { x: s.size_x, y: s.size_y, label, xLabel, yLabel });
      cells.push({
        key14: s.key14,
        house: s.house_id,
        size: sizes.get(k)!,
        stock: s.stock,
        backorder: s.backorder,
        priceCents: cents(s.price),
        nettoCents: cents(s.netto_price),
        discount: s.discount_percentage,
      });
    }
    const sortedSizes = [...sizes.values()].sort((p, q) => Number(p.x) - Number(q.x) || Number(p.y) - Number(q.y));
    const twoD = sortedSizes.some((s) => s.yLabel !== "");
    const tu = sortedSizes.length === 1 && /^(tu|one size|einheitsgr)/i.test(sortedSizes[0].label);
    const houses = [...new Set(cells.map((c) => c.house))].sort() as HouseId[];
    const stockByHouse = { lanners: 0, jager: 0 } as Record<HouseId, number>;
    for (const c of cells) stockByHouse[c.house] += c.stock;

    const cheapest = cells.reduce((m, c) => (c.nettoCents < m.nettoCents ? c : m), cells[0]);
    const nettoMax = Math.max(...cells.map((c) => c.nettoCents));
    let lowest30: number | null = null;
    if (cheapest.discount > 0 || cheapest.nettoCents < cheapest.priceCents) {
      const hist = historyBy.get(cheapest.key14) ?? [];
      lowest30 = cents(lowestBeforeReduction(hist, cheapest.priceCents / 100, today));
    }

    const g = gruppeOf(a.cat2);
    const photos: Photo[] = (filesBy.get(a.uid8) ?? [])
      .slice()
      .sort((p, q) => (p.role === "main" ? 0 : 1) - (q.role === "main" ? 0 : 1) || p.sort - q.sort)
      .map((f) => {
        const { src, demo } = photoSrc(f.storage_path, f.filename, o);
        return { src, demo, width: f.width ?? 900, height: f.height ?? 1200, fit: (f.fit === "cover" ? "cover" : "contain") as "contain" | "cover", role: f.role };
      });

    const edi: Record<string, string> = {};
    for (const s of skus) edi[s.key14] = s.edi;

    const article: Article = {
      uid8: a.uid8,
      id6: a.id6,
      variant: a.variant,
      brand,
      name: String((a as unknown as Record<string, string>)[softtouch.displayNameField] || (a as unknown as Record<string, string>)[softtouch.displayNameFallback] || "").trim(),
      ref: String((a as unknown as Record<string, string>)[softtouch.articleNumberField] ?? ""),
      slug: a.slug?.de || slugify(`${brandName} ${a.detail2} ${colorNameFromBrand(a.colorbrand)}`),
      colorName: colorNameFromBrand(a.colorbrand) || (colorGroup(a.color_id)?.names.de ?? ""),
      colorGroup: colorGroup(a.color_id),
      abteilung: abteilungOf(a.cat1),
      gruppe: g?.id ?? null,
      accessoire: g?.accessoire ?? false,
      silhouette: g?.silhouette ?? null,
      sizeTable: table,
      twoD,
      tu,
      sizes: sortedSizes,
      cells,
      houses,
      stockByHouse,
      priceCents: cheapest.priceCents,
      nettoCents: cheapest.nettoCents,
      nettoMaxCents: nettoMax,
      discount: cheapest.discount,
      lowest30Cents: lowest30,
      vat: skus[0].vat,
      inThePicture: a.in_the_picture,
      onlineSort: a.online_sort ?? 999999,
      firstDelivery: a.first_delivery,
      expectedDelivery: a.expected_delivery && a.expected_delivery >= today ? a.expected_delivery : null,
      texts: (textsBy.get(a.uid8) ?? []).filter((t) => t.kind && t.lang).map((t) => ({ kind: t.kind!, lang: t.lang!, text: t.text, sort: t.sort })),
      photos,
      related: a.related,
      wash: a.wash_instructions,
      isDemo,
      offlineSince: a.offline_since,
      variants: [],
      edi,
    };
    articles.push(article);
    if (!article.offlineSince) {
      brand.count++;
      for (const h of houses) if (!brand.houses.includes(h)) brand.houses.push(h);
    }
  }

  // Farbvarianten: gleiche Artikel-ID, andere Variante (nur online)
  const byId6 = new Map<string, Article[]>();
  for (const a of articles) (byId6.get(a.id6) ?? byId6.set(a.id6, []).get(a.id6)!).push(a);
  for (const list of byId6.values()) {
    const online = list.filter((a) => !a.offlineSince).sort((p, q) => p.variant - q.variant);
    for (const a of list) a.variants = online.map((x) => x.uid8);
  }

  const byUid8 = new Map(articles.map((a) => [a.uid8, a]));
  for (const a of articles) a.related = a.related.filter((u) => byUid8.has(u) && !byUid8.get(u)!.offlineSince);

  const online = articles.filter((a) => !a.offlineSince);
  return {
    asOf: rows.asOf,
    source: rows.source,
    articles,
    online,
    byUid8,
    brands: [...brands.values()].filter((b) => b.count > 0).sort((p, q) => p.name.localeCompare(q.name, "de")),
    colorGroups: [...colorGroups.values()],
    wash: new Map(rows.wash.map((w) => [w.id, w])),
  };
}

/** Empfohlene Reihenfolge: online_sort des Ladens, dann neueste Lieferung */
export function sortRecommended(list: Article[]): Article[] {
  return list.slice().sort((p, q) => p.onlineSort - q.onlineSort || (q.firstDelivery ?? "").localeCompare(p.firstDelivery ?? ""));
}
