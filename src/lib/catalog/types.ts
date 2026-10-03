import type { ArticleRow, FileRow, SkuRow, TextRow, HouseId } from "../../../supabase/functions/_shared/catalog/transform.ts";
import type { StBrand, StColor, StSizeTable, StStore, StWashInstruction, StSeason } from "../../../supabase/functions/_shared/softtouch/types.ts";

export type { HouseId };

/** Was die Datenquelle liefert: Zeilen wie in Supabase (Briefing D10.3) */
export interface CatalogRows {
  /** Zeitpunkt des Bestands (ISO), für "Stand: …" */
  asOf: string;
  source: "fixtures" | "api" | "loadtest";
  stores: StStore[];
  brands: StBrand[];
  colors: StColor[];
  sizetables: StSizeTable[];
  seasons: StSeason[];
  wash: StWashInstruction[];
  articles: (ArticleRow & { offline_since: string | null })[];
  skus: SkuRow[];
  texts: TextRow[];
  files: (FileRow & { storage_path?: string | null; width?: number | null; height?: number | null })[];
  priceHistory: { key14: string; date: string; netto_price: number }[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  houses: HouseId[];
  count: number;
}

export interface ColorGroup {
  id: string;
  hex: string;
  /** Name je Sprache (SoftTouch display=full, Feldzuordnung unbestätigt) */
  names: Record<"lb" | "de" | "fr" | "en", string>;
  slug: string;
}

export interface Size {
  x: string;
  y: string;
  /** "M", "52", "32/L34", "TU" */
  label: string;
  xLabel: string;
  yLabel: string;
}

export interface SkuCell {
  key14: string;
  house: HouseId;
  size: Size;
  stock: number;
  backorder: number;
  priceCents: number;
  nettoCents: number;
  discount: number;
}

export interface Photo {
  src: string;
  width: number;
  height: number;
  fit: "contain" | "cover";
  demo: boolean;
  role: string;
}

export interface ArticleText {
  kind: string;
  lang: string;
  text: string;
  sort: number;
}

export interface Article {
  uid8: string;
  id6: string;
  variant: number;
  brand: Brand;
  name: string;
  ref: string;
  slug: string;
  colorName: string;
  colorGroup: ColorGroup | null;
  abteilung: "damen" | "herren" | null;
  gruppe: string | null;
  accessoire: boolean;
  silhouette: string | null;
  sizeTable: StSizeTable | null;
  twoD: boolean;
  tu: boolean;
  /** Größen (Vereinigung aller Häuser), sortiert nach Position */
  sizes: Size[];
  cells: SkuCell[];
  /** Häuser, die den Artikel führen (haben Schlüssel) */
  houses: HouseId[];
  /** Stück je Haus (Stand Build) */
  stockByHouse: Record<HouseId, number>;
  priceCents: number;
  nettoCents: number;
  nettoMaxCents: number;
  discount: number;
  /** Omnibus: niedrigster Preis in den 30 Tagen vor der Preissenkung (Cent) */
  lowest30Cents: number | null;
  vat: number;
  inThePicture: boolean;
  onlineSort: number;
  firstDelivery: string | null;
  expectedDelivery: string | null;
  texts: ArticleText[];
  photos: Photo[];
  related: string[];
  wash: number[];
  isDemo: boolean;
  offlineSince: string | null;
  /** Andere Farben desselben Artikels (uid8) */
  variants: string[];
  edi: Record<string, string>;
}

export interface Catalog {
  asOf: string;
  source: CatalogRows["source"];
  articles: Article[];
  online: Article[];
  byUid8: Map<string, Article>;
  brands: Brand[];
  colorGroups: ColorGroup[];
  wash: Map<number, StWashInstruction>;
}
