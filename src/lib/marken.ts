/**
 * Marken für Markenband, Markenseite und Hausseiten: Marken laut Briefing je
 * Haus (houses.ts) vereint mit den Marken aus dem Katalog, mit Logo und Link.
 */
import { slugify } from "../../supabase/functions/_shared/text.ts";
import { houses, type HouseId } from "../config/houses.ts";
import { markenLogos, type MarkenLogo } from "../config/marken.ts";
import type { Catalog } from "./catalog/types.ts";

export interface MarkeKurz {
  name: string;
  /** Schlüssel für Logos (Slug ohne "Hugo") */
  key: string;
  /** Slug der Markenseite, wenn es im Katalog Artikel gibt */
  slug: string | null;
  houses: HouseId[];
  count: number;
  logo: MarkenLogo | null;
}

export const markenKey = (name: string) => slugify(name.replace(/^Hugo\s+/i, ""));

export function alleMarken(cat: Catalog, haus?: HouseId): MarkeKurz[] {
  const map = new Map<string, MarkeKurz>();
  for (const b of cat.brands) {
    const key = markenKey(b.name);
    map.set(key, { name: b.name, key, slug: b.slug, houses: [...b.houses], count: b.count, logo: markenLogos[key] ?? null });
  }
  for (const h of houses) {
    for (const name of h.marken) {
      const key = markenKey(name);
      const m = map.get(key);
      if (m) {
        if (!m.houses.includes(h.id)) m.houses.push(h.id);
      } else map.set(key, { name, key, slug: null, houses: [h.id], count: 0, logo: markenLogos[key] ?? null });
    }
  }
  const list = [...map.values()].filter((m) => !haus || m.houses.includes(haus));
  for (const m of list) m.houses.sort((a, b) => (a === "lanners" ? -1 : b === "lanners" ? 1 : 0));
  return list.sort((a, b) => a.name.localeCompare(b.name, "de"));
}
