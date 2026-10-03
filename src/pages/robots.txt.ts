/**
 * /robots.txt: In der Demo ist alles gesperrt (zusätzlich noindex, nofollow auf
 * jeder Seite). Live: alles erlaubt außer den JSON-Daten der Filter; Sitemap.
 * Bei einem Projektpfad auf GitHub Pages (BASE_PATH) gilt robots.txt nur an der
 * Wurzel der Domain, deshalb dort die eigene Domain verwenden (README).
 */
import type { APIRoute } from "astro";
import { LANGS } from "../i18n/index.ts";
import { SITE_URL, features } from "../config/site.ts";
import { href } from "../lib/page.ts";

export const GET: APIRoute = () => {
  const body = features.demo
    ? "# Demo: nicht indexieren\nUser-agent: *\nDisallow: /\n"
    : ["User-agent: *", "Allow: /", `Disallow: ${href("/filter/")}`, ...LANGS.map((l) => `Disallow: ${href(`/${l}/filter/`)}`), "", `Sitemap: ${SITE_URL}${href("/sitemap.xml")}`, ""].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
