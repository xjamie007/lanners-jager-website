/**
 * SEO-Prüfung nach dem Build (läuft in npm run build über dist/):
 *  Fehler (Build bricht ab):
 *   - <html lang> fehlt oder passt nicht zum Pfad, nicht genau ein <h1>, kein <title>
 *   - Canonical fehlt oder ist nicht absolut, hreflang für 4 Sprachen + x-default fehlt
 *   - robots fehlt; in der Demo nicht "noindex, nofollow"
 *   - JSON-LD lässt sich nicht lesen
 *   - <img> ohne alt, interner Link ins Leere, Anker (#id) ohne Ziel
 *  Warnungen (mit Pfad, Briefing G2): Title außerhalb 50 bis 60 Zeichen,
 *  Description außerhalb 150 bis 160, doppelte Titles in einer Sprache.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const dist = join(process.cwd(), "dist");
const demo = (process.env.PUBLIC_DEMO ?? "true") !== "false";
const base = "/" + (process.env.BASE_PATH ?? "").replace(/^\/+|\/+$/g, "");
const basePrefix = base === "/" ? "" : base;

function html(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) {
      if (n === "pagefind" || n === "_astro") continue;
      html(p, out);
    } else if (n.endsWith(".html")) out.push(p);
  }
  return out;
}

// Attribut lesen; ohne Wert (komprimiertes HTML: alt statt alt="") ist es leer
const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`\\s${name}(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+)))?(?=[\\s/>])`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
};
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const tags = (src: string, name: string) => [...src.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => m[0]);

const fehler: string[] = [];
const warnungen: string[] = [];
const titles = new Map<string, string[]>();
const ankerAndererSeiten: { von: string; href: string }[] = [];
let geprueft = 0;

function existiert(pfad: string): boolean {
  let p = decodeURIComponent(pfad.split("#")[0].split("?")[0]);
  if (basePrefix && p.startsWith(basePrefix)) p = p.slice(basePrefix.length);
  if (!p || p === "/") return existsSync(join(dist, "index.html"));
  const f = join(dist, p);
  if (p.endsWith("/")) return existsSync(join(f, "index.html"));
  return existsSync(f) || existsSync(join(f, "index.html"));
}

for (const datei of html(dist)) {
  const pfad = "/" + relative(dist, datei).replace(/index\.html$/, "").replace(/\\/g, "/");
  // Weiterleitung auf /lb/ und die mehrsprachige 404 haben eigene Regeln
  if (pfad === "/" || pfad === "/404.html") continue;
  geprueft++;
  const src = readFileSync(datei, "utf8");
  const wo = (s: string) => `${pfad}: ${s}`;

  const lang = attr(tags(src, "html")[0] ?? "", "lang");
  const pfadLang = pfad.split("/")[1];
  if (!lang || lang !== pfadLang) fehler.push(wo(`<html lang="${lang}"> passt nicht zum Pfad`));

  const title = /<title>([^<]*)<\/title>/i.exec(src)?.[1];
  if (!title) fehler.push(wo("kein <title>"));
  else {
    const t = decode(title);
    if (t.length < 50 || t.length > 60) warnungen.push(wo(`Title ${t.length} Zeichen: "${t}"`));
    const key = `${lang}|${t}`;
    titles.set(key, [...(titles.get(key) ?? []), pfad]);
  }

  const metas = tags(src, "meta");
  const meta = (name: string) => metas.find((m) => attr(m, "name") === name || attr(m, "property") === name);
  const desc = meta("description");
  const d = desc ? decode(attr(desc, "content") ?? "") : "";
  if (!d) fehler.push(wo("keine Description"));
  else if (d.length < 150 || d.length > 160) warnungen.push(wo(`Description ${d.length} Zeichen`));

  const robots = meta("robots");
  const r = robots ? attr(robots, "content") : null;
  if (!r) fehler.push(wo("kein robots"));
  else if (demo && r !== "noindex, nofollow") fehler.push(wo(`Demo, aber robots "${r}"`));
  if (!meta("og:image")) fehler.push(wo("kein og:image"));

  const h1 = (src.match(/<h1\b/gi) ?? []).length;
  if (h1 !== 1) fehler.push(wo(`${h1} <h1> statt genau einem`));

  const links = tags(src, "link");
  const canonical = links.find((l) => attr(l, "rel") === "canonical");
  const c = canonical ? attr(canonical, "href") : null;
  if (!c || !/^https?:\/\//.test(c)) fehler.push(wo("Canonical fehlt oder ist nicht absolut"));
  const hreflang = new Set(links.filter((l) => attr(l, "rel") === "alternate" && attr(l, "hreflang")).map((l) => attr(l, "hreflang")));
  for (const h of ["lb", "de", "fr", "en", "x-default"]) if (!hreflang.has(h)) fehler.push(wo(`hreflang ${h} fehlt`));

  for (const m of src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(m[1]);
    } catch {
      fehler.push(wo("JSON-LD lässt sich nicht lesen"));
    }
  }

  for (const img of tags(src, "img")) if (attr(img, "alt") === null) fehler.push(wo(`<img> ohne alt: ${img.slice(0, 80)}`));

  const ids = new Set([...src.matchAll(/\sid=(?:"([^"]+)"|([^\s>]+))/g)].map((m) => m[1] ?? m[2]));
  for (const a of tags(src, "a")) {
    const h = attr(a, "href");
    if (!h) continue;
    // Anker auf derselben Seite
    if (h.startsWith("#")) {
      if (h.length > 1 && !ids.has(decodeURIComponent(h.slice(1)))) fehler.push(wo(`Anker ohne Ziel: ${h}`));
      continue;
    }
    if (!h.startsWith("/") || h.startsWith("//")) continue;
    if (!existiert(decode(h))) fehler.push(wo(`Link ins Leere: ${h}`));
    else if (h.includes("#")) ankerAndererSeiten.push({ von: pfad, href: decode(h) });
  }
}

// Anker auf anderen Seiten: Ziel-Id muss dort stehen
for (const { von, href } of ankerAndererSeiten) {
  const [pfadTeil, anker] = href.split("#");
  let p = pfadTeil.split("?")[0];
  if (basePrefix && p.startsWith(basePrefix)) p = p.slice(basePrefix.length);
  const datei = p.endsWith("/") ? join(dist, p, "index.html") : join(dist, p);
  if (!anker || !existsSync(datei)) continue;
  const ziel = readFileSync(datei, "utf8");
  if (!new RegExp(`\\sid=(?:"${anker}"|${anker}[\\s>])`).test(ziel)) fehler.push(`${von}: Anker ohne Ziel: ${href}`);
}

for (const [key, pfade] of titles) if (pfade.length > 1) warnungen.push(`doppelter Title (${key.split("|")[0]}) auf ${pfade.length} Seiten: ${pfade.slice(0, 3).join(", ")}${pfade.length > 3 ? " …" : ""}`);

const uniqueF = [...new Set(fehler)];
console.log(`SEO-Prüfung: ${geprueft} Seiten, ${uniqueF.length} Fehler, ${warnungen.length} Warnungen`);
if (warnungen.length) {
  console.log("Warnungen (Längen nach Briefing G2):");
  for (const w of warnungen.slice(0, 400)) console.log("  " + w);
  if (warnungen.length > 400) console.log(`  … und ${warnungen.length - 400} weitere`);
}
if (uniqueF.length) {
  console.error("Fehler:");
  for (const f of uniqueF.slice(0, 200)) console.error("  " + f);
  process.exit(1);
}
