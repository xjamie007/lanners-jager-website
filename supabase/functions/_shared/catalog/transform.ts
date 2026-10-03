/**
 * SoftTouch-Produktdatensätze → Zeilen der Tabellen articles, skus,
 * article_texts, article_files (Briefing D10.3).
 *
 * Reine Funktion ohne Laufzeitabhängigkeiten. Benutzt von:
 *  - Edge Function sync-full / sync-delta (Deno), schreibt die Zeilen in Postgres
 *  - Build im Fixture-Modus (Node/Vite), baut daraus direkt den Katalog
 * Die Konfiguration wird übergeben, nicht importiert (siehe README, "Geteilter Code").
 */
import type { StProduct, StText, StFile } from "../softtouch/types.ts";
import { slugify, colorNameFromBrand } from "../text.ts";

export type HouseId = "lanners" | "jager";
export type Lang = "lb" | "de" | "fr" | "en";

export interface TransformConfig {
  /** Online-Kanal 1..5 */
  channel: number;
  /** Filial-ID → Haus. Filialen ohne Haus (z. B. Lager) werden ignoriert. */
  storeToHouse: Record<string, HouseId>;
  /** Kontenkennung, unter der die Datensätze geholt wurden */
  account: string;
  textPresets: Record<string, { lang: string; kind: string }>;
  filePresets: Record<string, { role: string; fit: string }>;
  defaultPhotoFit: string;
  displayNameField: string;
  displayNameFallback: string;
  /** Markenanzeigename je Markenschlüssel (alias, sonst name), für den Slug */
  brandNames: Record<string, string>;
}

export interface ArticleRow {
  uid8: string;
  id6: string;
  variant: number;
  account: string;
  brand_id: string;
  season_id: string;
  cat1: string | null;
  cat2: string | null;
  cat3: string | null;
  cat4: string | null;
  cat5: string | null;
  cat6: string | null;
  cat7: string | null;
  detail1: string;
  detail2: string;
  detail3: string;
  detail4: string;
  detail5: string;
  description1: string;
  color_id: string | null;
  colorbrand: string;
  size_table_id: string;
  online: boolean;
  status: string;
  in_the_picture: boolean;
  online_sort: number | null;
  first_delivery: string | null;
  last_delivery: string | null;
  expected_delivery: string | null;
  related: string[];
  wash_instructions: number[];
  slug: Record<Lang, string>;
  st_timestamp: string | null;
}

export interface SkuRow {
  key14: string;
  uid8: string;
  size_x: string;
  size_y: string;
  size_x_label: string;
  size_y_label: string;
  store_id: string;
  house_id: HouseId;
  stock: number;
  backorder: number;
  price: number;
  netto_price: number;
  discount_percentage: number;
  vat: number;
  edi: string;
}

export interface TextRow {
  uid8: string;
  type: string;
  lang: string | null;
  kind: string | null;
  sort: number;
  text: string;
}

export interface FileRow {
  uid8: string;
  type: string;
  variant: number;
  sort: number;
  filename: string;
  role: string;
  fit: string;
}

export interface TransformResult {
  articles: ArticleRow[];
  skus: SkuRow[];
  texts: TextRow[];
  files: FileRow[];
  /** Datensätze, die verworfen wurden, mit Grund (für sync_runs) */
  skipped: { key: string; reason: string }[];
}

const pad2 = (n: number | string) => String(n).padStart(2, "0");

/** 14-stelliger Schlüssel als Text, unabhängig davon, ob die API Zahl oder Text liefert */
export function key14Of(p: { key: number | string }): string {
  return String(p.key).padStart(14, "0");
}

export function splitKey14(key14: string) {
  return {
    id6: key14.slice(0, 6),
    variant: key14.slice(6, 8),
    sizeX: key14.slice(8, 10),
    sizeY: key14.slice(10, 12),
    store: key14.slice(12, 14),
    uid8: key14.slice(0, 8),
  };
}

/** Flags kommen als 0/1, true/false oder "T"/"F" (Befund aus der Doku) */
export function truthy(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return ["1", "t", "true", "y", "j"].includes(v.trim().toLowerCase());
  return false;
}

/** Leere Daten kommen als "", "0000-00-00", "0001-01-01" oder null */
export function cleanDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const d = v.trim().slice(0, 10).replace(/\//g, "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  if (d.startsWith("0000") || d.startsWith("0001") || d.startsWith("9999")) return null;
  return d;
}

function onlineFor(p: Record<string, unknown>, channel: number): boolean {
  const field = channel === 1 ? "online" : `online${channel}`;
  // Ein Produkt mit online = 1..5 ohne separate Felder: Doku erlaubt "online" als Kanalnummer
  if (channel !== 1 && p[field] === undefined) return Number(p.online) === channel;
  return truthy(p[field]);
}

function itemOnline(item: StText | StFile, channel: number): boolean {
  const field = channel === 1 ? "online" : `online${channel}`;
  const v = (item as unknown as Record<string, unknown>)[field];
  return v === undefined ? true : truthy(v);
}

export function transformProducts(records: StProduct[], cfg: TransformConfig): TransformResult {
  const articles = new Map<string, ArticleRow>();
  const skus: SkuRow[] = [];
  const texts = new Map<string, TextRow>();
  const files = new Map<string, FileRow>();
  const skipped: { key: string; reason: string }[] = [];

  for (const p of records) {
    const key14 = key14Of(p);
    if (!/^\d{14}$/.test(key14)) {
      skipped.push({ key: key14, reason: "Schlüssel nicht 14-stellig" });
      continue;
    }
    if (p.status !== "A") {
      skipped.push({ key: key14, reason: `Status ${p.status}` });
      continue;
    }
    const k = splitKey14(key14);
    const store = pad2(p.store ?? k.store);
    const house = cfg.storeToHouse[store];
    if (!house) {
      skipped.push({ key: key14, reason: `Filiale ${store} gehört zu keinem Haus` });
      continue;
    }
    const uid8 = k.uid8;
    const online = onlineFor(p as unknown as Record<string, unknown>, cfg.channel);

    if (!articles.has(uid8)) {
      const raw = p as unknown as Record<string, unknown>;
      const name = String(raw[cfg.displayNameField] || raw[cfg.displayNameFallback] || "").trim();
      const brandName = cfg.brandNames[p.brand] ?? "";
      const colorName = colorNameFromBrand(p.colorbrand);
      const slug = slugify([brandName, name, colorName].filter(Boolean).join(" "));
      articles.set(uid8, {
        uid8,
        id6: k.id6,
        variant: Number(k.variant),
        account: cfg.account,
        brand_id: p.brand,
        season_id: p.season,
        cat1: p.category1 || null,
        cat2: p.category2 || null,
        cat3: p.category3 || null,
        cat4: p.category4 || null,
        cat5: p.category5 || null,
        cat6: p.category6 || null,
        cat7: p.category7 || null,
        detail1: p.detail1 ?? "",
        detail2: p.detail2 ?? "",
        detail3: p.detail3 ?? "",
        detail4: p.detail4 ?? "",
        detail5: p.detail5 ?? "",
        description1: p.description ?? "",
        color_id: p.color || null,
        colorbrand: p.colorbrand ?? "",
        size_table_id: p.sizetable,
        online,
        status: p.status,
        in_the_picture: truthy(p.in_the_picture),
        online_sort: typeof p.online_sort === "number" ? p.online_sort : p.online_sort ? Number(p.online_sort) : null,
        first_delivery: cleanDate(p.first_delivery),
        last_delivery: cleanDate(p.last_delivery),
        expected_delivery: cleanDate(p.expected_delivery),
        related: [...new Set((p.related ?? []).map((r) => String(r.related).padStart(8, "0")).filter((r) => /^\d{8}$/.test(r) && r !== uid8))],
        wash_instructions: [...new Set((p.wash_instructions ?? []).map(Number).filter(Number.isFinite))],
        slug: { lb: slug, de: slug, fr: slug, en: slug },
        st_timestamp: typeof p.timestamp === "string" && p.timestamp ? p.timestamp : null,
      });
    } else {
      // Ein Artikel ist online, sobald ein Datensatz für den Kanal online ist
      const a = articles.get(uid8)!;
      a.online = a.online || online;
      a.in_the_picture = a.in_the_picture || truthy(p.in_the_picture);
    }

    skus.push({
      key14,
      uid8,
      size_x: k.sizeX,
      size_y: k.sizeY,
      size_x_label: (p.sizeXdescription ?? "").trim(),
      size_y_label: (p.sizeYdescription ?? "").trim(),
      store_id: store,
      house_id: house,
      stock: Math.max(0, Math.trunc(Number(p.stock) || 0)),
      backorder: Math.max(0, Math.trunc(Number(p.backorder) || 0)),
      price: Number(p.price) || 0,
      netto_price: Number(p.netto_price ?? p.price) || 0,
      discount_percentage: Number(p.discount_percentage) || 0,
      vat: Number(p.vat) || 0,
      edi: p.edi ?? "",
    });

    const variantNo = Number(k.variant);
    for (const t of p.texts ?? []) {
      if (t.variant && Number(t.variant) !== variantNo) continue;
      if (!itemOnline(t, cfg.channel)) continue;
      const preset = cfg.textPresets[t.type];
      const id = `${uid8}|${t.type}|${t.sort}|${t.text}`;
      if (!texts.has(id) && t.text?.trim()) {
        texts.set(id, { uid8, type: t.type, lang: preset?.lang ?? null, kind: preset?.kind ?? null, sort: Number(t.sort) || 1, text: t.text.trim() });
      }
    }
    for (const f of p.files ?? []) {
      if (f.variant && Number(f.variant) !== variantNo) continue;
      if (!itemOnline(f, cfg.channel)) continue;
      const preset = cfg.filePresets[f.type];
      const id = `${uid8}|${f.type}|${f.sort}|${f.file}`;
      if (!files.has(id) && f.file) {
        files.set(id, {
          uid8,
          type: f.type,
          variant: Number(f.variant) || 0,
          sort: Number(f.sort) || 1,
          filename: f.file,
          role: preset?.role ?? "extra",
          fit: preset?.fit ?? cfg.defaultPhotoFit,
        });
      }
    }
  }

  return { articles: [...articles.values()], skus, texts: [...texts.values()], files: [...files.values()], skipped };
}

/** Filial-Zuordnung aus den Häusern bauen (Filial-IDs je Haus) */
export function storeMap(storesByHouse: Record<HouseId, string[]>): Record<string, HouseId> {
  const m: Record<string, HouseId> = {};
  for (const [house, ids] of Object.entries(storesByHouse) as [HouseId, string[]][]) {
    for (const id of ids) m[pad2(id.trim())] = house;
  }
  return m;
}
