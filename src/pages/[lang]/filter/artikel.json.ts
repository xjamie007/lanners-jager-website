/**
 * /{lang}/filter/artikel.json: alle Online-Artikel für Filter und Sortierung der
 * Listenseiten (D3). Erzeugt beim Build, geladen von src/scripts/filter.ts.
 */
import type { APIRoute } from "astro";
import { getImage } from "astro:assets";
import { LANGS, type Lang } from "../../../i18n/index.ts";
import { getCatalog } from "../../../lib/catalog/index.ts";
import { link } from "../../../lib/page.ts";
import { farbeVon, groessenJeHaus, type ArtikelIndex, type IndexFoto } from "../../../lib/filterindex.ts";
import type { Photo } from "../../../lib/catalog/types.ts";

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}

const BREITEN = [320, 480, 720];
const SIZES = "(min-width: 1200px) 25vw, (min-width: 768px) 33vw, 50vw";

async function foto(p: Photo): Promise<IndexFoto> {
  const out: IndexFoto = { s: p.src, w: p.width, h: p.height, fit: p.fit };
  if (p.demo) out.demo = 1;
  if (p.src.endsWith(".svg")) return out;
  if (p.demo) {
    out.ss = `${p.src.replace(/\.webp$/, "-480.webp")} 480w, ${p.src} 900w`;
    return out;
  }
  // echte Fotos: dieselben Formate wie <Picture> auf den Seiten, in den Kartengrößen
  const [avif, webp] = await Promise.all(
    (["avif", "webp"] as const).map((format) => getImage({ src: p.src, width: p.width, height: p.height, format, widths: BREITEN, sizes: SIZES })),
  );
  out.avif = avif.srcSet.attribute;
  out.webp = webp.srcSet.attribute;
  out.s = webp.src;
  return out;
}

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Lang;
  const cat = await getCatalog();
  const marken: Record<string, string> = {};
  const farben: Record<string, string> = {};
  const a = await Promise.all(
    cat.online.map(async (art) => {
      marken[art.brand.slug] = art.brand.name;
      const f = farbeVon(art, lang);
      if (f) farben[f.id] = f.name;
      const fotos = await Promise.all(art.photos.slice(0, 2).map(foto));
      return {
        u: art.uid8,
        m: art.brand.slug,
        f: f?.id ?? null,
        n: art.name,
        c: art.colorName,
        p: art.priceCents,
        q: art.nettoCents,
        ...(art.nettoMaxCents > art.nettoCents ? { x: art.nettoMaxCents } : {}),
        d: art.discount,
        neu: art.firstDelivery ?? "",
        h: art.houses,
        g: groessenJeHaus(art),
        url: link(lang, { kind: "produkt", slug: art.slug, uid8: art.uid8 }),
        b: fotos,
        ...(art.isDemo ? { demo: 1 as const } : {}),
      };
    }),
  );
  const body: ArtikelIndex = { v: 1, asOf: cat.asOf, marken, farben, a };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json; charset=utf-8" } });
};
