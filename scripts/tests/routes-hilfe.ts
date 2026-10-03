/** Hilfsmodul für die Tests: Routen ohne Astro */
export { pathFor, alternatesFor } from "../../src/i18n/routes.ts";
import { STATIC_ROUTES } from "../../src/i18n/static-routes.ts";
export const STATIC_ROUTES_LIST = Object.keys(STATIC_ROUTES) as (keyof typeof STATIC_ROUTES)[];
