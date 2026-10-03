import { loadRows } from "./source.ts";
import { assemble, sortRecommended } from "./assemble.ts";
import type { Article, Catalog, HouseId } from "./types.ts";

export type { Article, Catalog };
export { sortRecommended };

let promise: Promise<Catalog> | null = null;

/** Katalog einmal je Build laden (alle Seiten teilen ihn) */
export function getCatalog(): Promise<Catalog> {
  if (!promise) {
    promise = (async () => {
      const rows = await loadRows();
      const supabaseUrl = process.env.SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
      const base = "/" + (process.env.BASE_PATH ?? "").replace(/^\/+|\/+$/g, "");
      return assemble(rows, {
        allowDemo: process.env.PUBLIC_DEMO === "true",
        basePath: (base === "/" ? "/" : base + "/"),
        storagePublicBase: supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/produktfotos` : undefined,
      });
    })();
  }
  return promise;
}

export const inHouse = (a: Article, h: HouseId) => a.houses.includes(h);
export const isAvailable = (a: Article, h?: HouseId) => (h ? a.stockByHouse[h] > 0 : a.stockByHouse.lanners + a.stockByHouse.jager > 0);
export const isSale = (a: Article) => a.nettoCents < a.priceCents;
