/**
 * Filter und Sortierung der Listenseiten (D3), beim Build vorbereitet.
 *
 *  - Artikeldaten je Sprache: /{lang}/filter/artikel.json, alle Online-Artikel mit
 *    dem, was Karte und Filter brauchen (uid8, Marke, Farbe, Preis, Sale, Größen je
 *    Haus mit Bestand > 0, Fotos, Link). Eine Datei für alle Listen, damit der
 *    Browser sie zwischen den Listen aus dem Cache nimmt.
 *  - Reihenfolge je Liste: /filter/{liste}.json, nur die uid8 (empfohlene Reihenfolge).
 *  - Die Filterwerte einer Liste (Facetten) rendert die Listenseite statisch.
 *
 * src/scripts/filter.ts lädt beides erst, wenn es gebraucht wird.
 */
import { t, type Lang } from "../i18n/index.ts";
import { slugify } from "../../supabase/functions/_shared/text.ts";
import type { Article, Catalog, HouseId } from "./catalog/types.ts";
import type { ListDef } from "./lists.ts";
import { groessenVergleich, preisStufe } from "./filter-shared.ts";

export interface Facette {
  id: string;
  name: string;
}

export interface Facetten {
  marken: Facette[];
  groessen: Facette[];
  farben: Facette[];
  preise: Facette[];
  sale: boolean;
}

export interface IndexFoto {
  /** src (Fallback) */
  s: string;
  w: number;
  h: number;
  fit: "contain" | "cover";
  demo?: 1;
  avif?: string;
  webp?: string;
  /** srcset für fertige Demo-Fotos (WebP in zwei Breiten) */
  ss?: string;
}

export interface IndexArtikel {
  u: string;
  /** Marke (Slug, Name steht in marken) */
  m: string;
  /** Farbfacette (Id, Name steht in farben) */
  f: string | null;
  n: string;
  /** Farbname der Karte */
  c: string;
  /** Preis und netto_price in Cent */
  p: number;
  q: number;
  /** höchster netto_price, wenn Größen unterschiedlich kosten ("ab") */
  x?: number;
  d: number;
  /** first_delivery (YYYY-MM-DD) für "Neu" */
  neu: string;
  /** Häuser, die den Artikel führen */
  h: HouseId[];
  /** Größen mit Bestand > 0 je Haus (bei Weite/Länge die Weite) */
  g: Partial<Record<HouseId, string[]>>;
  url: string;
  b: IndexFoto[];
  demo?: 1;
}

export interface ArtikelIndex {
  v: 1;
  asOf: string;
  marken: Record<string, string>;
  farben: Record<string, string>;
  a: IndexArtikel[];
}

/** Dateiname einer Liste ("grp:herren:jacken" → "grp-herren-jacken") */
export const dateiId = (listId: string) => listId.replace(/[^a-z0-9-]+/gi, "-");

/** Größen mit Bestand > 0 je Haus; bei Weite/Länge zählt die Weite */
export function groessenJeHaus(a: Article): Partial<Record<HouseId, string[]>> {
  const out: Partial<Record<HouseId, string[]>> = {};
  for (const c of a.cells) {
    if (c.stock <= 0) continue;
    const label = a.twoD ? c.size.xLabel : c.size.label;
    const list = (out[c.house] ??= []);
    if (!list.includes(label)) list.push(label);
  }
  for (const h of Object.keys(out) as HouseId[]) out[h]!.sort(groessenVergleich);
  return out;
}

/** Farbfacette: SoftTouch-Farbgruppe (color), sonst colorbrand */
export function farbeVon(a: Article, lang: Lang): Facette | null {
  if (a.colorGroup) return { id: a.colorGroup.slug, name: a.colorGroup.names[lang] || a.colorGroup.names.de };
  if (a.colorName) return { id: slugify(a.colorName), name: a.colorName };
  return null;
}

const euro = (cents: number, lang: Lang) =>
  new Intl.NumberFormat(lang === "fr" ? "fr-LU" : lang === "en" ? "en-IE" : "de-LU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);

export function preisStufeName(id: string, lang: Lang): string {
  const [a, b] = id.split("-").map((x) => (x === "" ? null : Number(x)));
  if (!a) return t(lang, "liste.preisBis", { b: euro(b!, lang) });
  if (b === null) return t(lang, "liste.preisUeber", { a: euro(a, lang) });
  return t(lang, "liste.preisVonBis", { a: euro(a, lang), b: euro(b!, lang) });
}

/** Filterwerte einer Liste, wie sie die Listenseite anbietet */
export function facetten(list: ListDef, cat: Catalog, lang: Lang): Facetten {
  const arts = list.uids.map((u) => cat.byUid8.get(u)!).filter(Boolean);
  const marken = new Map<string, string>();
  const farben = new Map<string, string>();
  const groessen = new Set<string>();
  const preise = new Set<string>();
  let sale = false;
  for (const a of arts) {
    marken.set(a.brand.slug, a.brand.name);
    const f = farbeVon(a, lang);
    if (f) farben.set(f.id, f.name);
    for (const gs of Object.values(groessenJeHaus(a))) for (const g of gs ?? []) groessen.add(g);
    preise.add(preisStufe(a.nettoCents));
    if (a.nettoCents < a.priceCents) sale = true;
  }
  const coll = new Intl.Collator(lang === "lb" ? "de" : lang);
  return {
    marken: list.kind === "marke" ? [] : [...marken].map(([id, name]) => ({ id, name })).sort((x, y) => coll.compare(x.name, y.name)),
    groessen: [...groessen].sort(groessenVergleich).map((g) => ({ id: g, name: g })),
    farben: [...farben].map(([id, name]) => ({ id, name })).sort((x, y) => coll.compare(x.name, y.name)),
    preise: [...preise].sort((x, y) => Number(x.split("-")[0]) - Number(y.split("-")[0])).map((id) => ({ id, name: preisStufeName(id, lang) })),
    sale: sale && list.kind !== "sale",
  };
}
