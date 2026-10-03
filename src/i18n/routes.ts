/**
 * URLs in vier Sprachen (Briefing D1). LB-Slugs sind Entwürfe und werden mit den
 * LB-Texten geprüft (docs/lb-review.csv). Jede Seite kennt ihren Routen-Schlüssel,
 * damit der Sprachumschalter immer auf dieselbe Seite in der anderen Sprache führt.
 */
import type { Lang } from "./index.ts";
import { LANGS } from "./index.ts";
import warengruppen from "../content/warengruppen.json" with { type: "json" };

export { STATIC_ROUTES } from "./static-routes.ts";
import { STATIC_ROUTES } from "./static-routes.ts";

export type StaticRoute = keyof typeof STATIC_ROUTES;

export const PRODUCT_SEGMENT: Record<Lang, string> = { lb: "produkt", de: "produkt", fr: "produit", en: "product" };
export const PAGE_SEGMENT: Record<Lang, string> = { lb: "sait", de: "seite", fr: "page", en: "page" };

type Leaf = string | { text: string };
const leaf = (v: Leaf): string => (typeof v === "string" ? v : v.text);

export function abteilungSlug(id: "damen" | "herren", lang: Lang): string {
  return leaf((warengruppen.abteilungen as Record<string, { slug: Record<Lang, Leaf> }>)[id].slug[lang]);
}
export function accessoiresSlug(lang: Lang): string {
  return leaf((warengruppen.accessoires.slug as Record<Lang, Leaf>)[lang]);
}
export function warengruppeSlug(id: string, lang: Lang): string {
  const g = warengruppen.warengruppen.find((w) => w.id === id);
  if (!g) throw new Error(`Unbekannte Warengruppe ${id}`);
  return leaf((g.slug as Record<Lang, Leaf>)[lang]);
}

/** Pfad-Segmente einer Seite, ohne Sprache und ohne Basis */
export type PageRef =
  | { kind: "static"; route: StaticRoute }
  | { kind: "abteilung"; id: "damen" | "herren" }
  | { kind: "accessoires" }
  | { kind: "warengruppe"; abteilung: "damen" | "herren" | "accessoires"; gruppe: string }
  | { kind: "marke"; slug: string }
  | { kind: "haus"; id: "lanners" | "jager" }
  | { kind: "produkt"; slug: string; uid8: string };

export function segmentsFor(ref: PageRef, lang: Lang): string[] {
  switch (ref.kind) {
    case "static": {
      const s = STATIC_ROUTES[ref.route][lang];
      return s ? s.split("/") : [];
    }
    case "abteilung":
      return [abteilungSlug(ref.id, lang)];
    case "accessoires":
      return [accessoiresSlug(lang)];
    case "warengruppe":
      return [ref.abteilung === "accessoires" ? accessoiresSlug(lang) : abteilungSlug(ref.abteilung, lang), warengruppeSlug(ref.gruppe, lang)];
    case "marke":
      return [STATIC_ROUTES.marken[lang], ref.slug];
    case "haus":
      return [STATIC_ROUTES.haeuser[lang], ref.id];
    case "produkt":
      return [PRODUCT_SEGMENT[lang], `${ref.slug}-${ref.uid8}`];
  }
}

/** Relativer Pfad mit Sprache: /de/herren/jacken/ (ohne BASE_PATH) */
export function pathFor(ref: PageRef, lang: Lang, page = 1): string {
  const segs = [lang, ...segmentsFor(ref, lang)];
  if (page > 1) segs.push(PAGE_SEGMENT[lang], String(page));
  return "/" + segs.join("/") + "/";
}

export function alternatesFor(ref: PageRef, page = 1): Record<Lang, string> {
  return Object.fromEntries(LANGS.map((l) => [l, pathFor(ref, l, page)])) as Record<Lang, string>;
}

export const staticRef = (route: StaticRoute): PageRef => ({ kind: "static", route });
