/**
 * Lasttest-Katalog (Briefing D10.10: "Build mit 3.000 Testartikeln gemessen").
 * Vervielfältigt die Demo-Fixtures zu --count Online-Artikeln mit eigenen
 * Artikelnummern (Größen, Bestände, Preise, Fotos wie im Original) und schreibt
 * die fertigen Build-Zeilen nach .loadtest/catalog-<count>.json.
 * Alles bleibt als DEMO gekennzeichnet (detail5) und wird nie deployt.
 *   node scripts/generate-demo-catalog.ts --count 3000
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fixtureRows } from "../src/lib/catalog/source.ts";
import type { CatalogRows } from "../src/lib/catalog/types.ts";

const arg = process.argv.indexOf("--count");
const count = arg > 0 ? Number(process.argv[arg + 1]) : 3000;
if (!Number.isInteger(count) || count < 1) throw new Error("--count <Zahl>");

const basis = fixtureRows();
const vorlagen = basis.articles.filter((a) => a.online);
const out: CatalogRows = { ...basis, source: "loadtest", articles: [], skus: [], texts: [], files: [], priceHistory: [] };

for (let i = 0; i < count; i++) {
  const v = vorlagen[i % vorlagen.length];
  const runde = Math.floor(i / vorlagen.length);
  // erste Runde: Originale; danach neue Artikelnummern ab 600000
  const id6 = runde === 0 ? v.id6 : String(600000 + i).padStart(6, "0");
  const uid8 = id6 + v.uid8.slice(6);
  const neu = (key: string) => (key.startsWith(v.uid8) ? uid8 + key.slice(8) : key);
  const slug = Object.fromEntries(Object.entries(v.slug).map(([l, s]) => [l, runde === 0 ? s : `${s}-${runde}`])) as typeof v.slug;
  out.articles.push({ ...v, uid8, id6, slug, related: runde === 0 ? v.related : [], online_sort: (v.online_sort ?? 0) + runde * 1000, detail2: runde === 0 ? v.detail2 : `${v.detail2 || v.detail1} ${runde}` });
  for (const s of basis.skus.filter((x) => x.uid8 === v.uid8)) out.skus.push({ ...s, uid8, key14: neu(s.key14) });
  for (const t of basis.texts.filter((x) => x.uid8 === v.uid8)) out.texts.push({ ...t, uid8 });
  for (const f of basis.files.filter((x) => x.uid8 === v.uid8)) out.files.push({ ...f, uid8 });
  for (const p of basis.priceHistory.filter((x) => x.key14.startsWith(v.uid8))) out.priceHistory.push({ ...p, key14: neu(p.key14) });
}

const dir = join(process.cwd(), ".loadtest");
mkdirSync(dir, { recursive: true });
const datei = join(dir, `catalog-${count}.json`);
writeFileSync(datei, JSON.stringify(out));
console.log(`${datei}: ${out.articles.length} Artikel, ${out.skus.length} Schlüssel, ${out.files.length} Fotos`);
