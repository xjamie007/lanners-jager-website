/** Pfade der festen Seiten je Sprache, aus src/i18n/static-routes.ts (generiert) */
import { STATIC_ROUTES } from "./generated/i18n/static-routes.ts";

export type Lang = "lb" | "de" | "fr" | "en";
type Key = keyof typeof STATIC_ROUTES;

export const STATIC_PATHS = Object.fromEntries(
  (Object.keys(STATIC_ROUTES) as Key[]).map((k) => [k, Object.fromEntries((["lb", "de", "fr", "en"] as Lang[]).map((l) => [l, `/${l}/${STATIC_ROUTES[k][l] ? STATIC_ROUTES[k][l] + "/" : ""}`]))]),
) as Record<Key, Record<Lang, string>>;

export function housePath(house: "lanners" | "jager", lang: Lang): string {
  return `/${lang}/${STATIC_ROUTES.haeuser[lang]}/${house}/`;
}
