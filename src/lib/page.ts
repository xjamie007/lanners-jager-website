/**
 * Seitenkontext: Sprache, Routen-Referenz, URLs, Feature-Flags.
 * Wird jeder Seite vom Router übergeben.
 */
import type { Lang } from "../i18n/index.ts";
import { t, tp, LANGS } from "../i18n/index.ts";
import { pathFor, alternatesFor, type PageRef, staticRef, type StaticRoute } from "../i18n/routes.ts";
import { BASE_PATH, SITE_URL, features, buyEnabled, modes } from "../config/site.ts";
import { houses, getHouse, telHref, type HouseId } from "../config/houses.ts";

export { features, buyEnabled, modes, houses, getHouse, telHref };
export type { HouseId };

export interface PageCtx {
  lang: Lang;
  ref: PageRef;
  page: number;
}

/** /de/herren/ → mit Basis-Pfad */
export function href(p: string): string {
  return (BASE_PATH.replace(/\/$/, "") + p).replace(/\/\/+/g, "/");
}

export function link(lang: Lang, ref: PageRef | StaticRoute, page = 1): string {
  const r = typeof ref === "string" ? staticRef(ref) : ref;
  return href(pathFor(r, lang, page));
}

export function absolute(p: string): string {
  return SITE_URL + href(p);
}

export function alternates(ref: PageRef, page = 1): { lang: Lang; href: string }[] {
  const a = alternatesFor(ref, page);
  return LANGS.map((l) => ({ lang: l, href: href(a[l]) }));
}

/** Pfad zu einer Datei in public/ */
export function asset(p: string): string {
  return href("/" + p.replace(/^\/+/, ""));
}

export const T = (ctx: { lang: Lang }) => ({
  t: (key: string, vars?: Record<string, string | number | undefined | null>) => t(ctx.lang, key, vars),
  tp: (key: string, n: number, vars?: Record<string, string | number | undefined | null>) => tp(ctx.lang, key, n, vars),
});

/** Telefonnummern beider Häuser als Klartext ("Lanners 81 22 80, Jager 81 22 79") */
export function telefoneText(lang: Lang): string {
  return t(lang, "site.telefone", { lanners: getHouse("lanners").phoneDisplay, jager: getHouse("jager").phoneDisplay });
}
