/**
 * /sitemap.xml: alle indexierbaren Seiten in vier Sprachen, je URL mit den
 * hreflang-Alternativen und x-default = lb (G1, D1). Seiten mit noindex (Tasche,
 * Kasse, Bestätigungen, Suche, Demo-Postausgang, Offline-Artikel) fehlen.
 * In der Demo verbietet robots.txt alles; die Sitemap wird trotzdem erzeugt,
 * aber nirgends eingereicht.
 */
import type { APIRoute } from "astro";
import { LANGS } from "../i18n/index.ts";
import { alternatesFor, type PageRef, type StaticRoute } from "../i18n/routes.ts";
import { SITE_URL, buyEnabled } from "../config/site.ts";
import { href } from "../lib/page.ts";
import { getCatalog } from "../lib/catalog/index.ts";
import { listDefinitions, pageCount } from "../lib/lists.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export const GET: APIRoute = async () => {
  const cat = await getCatalog();
  const eintraege: { ref: PageRef; page: number }[] = [];
  // Sortiment, Neu und Sale kommen als Listen dazu
  const statisch: StaticRoute[] = ["home", "marken", "haeuser", "geschichte", "howto", "gutscheine", "kontakt", "impressum", "datenschutz"];
  if (buyEnabled) statisch.push("agb", "widerruf", "versand");
  for (const route of statisch) eintraege.push({ ref: { kind: "static", route }, page: 1 });
  for (const id of ["lanners", "jager"] as const) eintraege.push({ ref: { kind: "haus", id }, page: 1 });
  for (const list of listDefinitions(cat)) for (let page = 1; page <= pageCount(list); page++) eintraege.push({ ref: list.ref, page });
  for (const a of cat.online) eintraege.push({ ref: { kind: "produkt", slug: a.slug, uid8: a.uid8 }, page: 1 });

  const urls: string[] = [];
  for (const { ref, page } of eintraege) {
    const alt = alternatesFor(ref, page);
    const links = [...LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(SITE_URL + href(alt[l]))}"/>`), `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(SITE_URL + href(alt.lb))}"/>`].join("");
    for (const l of LANGS) urls.push(`<url><loc>${esc(SITE_URL + href(alt[l]))}</loc>${links}</url>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
};
