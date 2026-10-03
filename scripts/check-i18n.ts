/**
 * Prüft die Übersetzungen vor dem Build (npm run check:i18n):
 *  - alle vier Sprachen haben dieselben Schlüssel
 *  - Platzhalter ({name}) stimmen je Schlüssel überein
 *  - keine leeren Texte
 *  - jeder lëtzebuergesch Text trägt review: "lb-native" (Briefing C2)
 *  - jeder im Code fest geschriebene Schlüssel (t(lang, "…"), tr("…")) existiert
 * Fehler beenden den Build mit Code 1.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

type Leaf = string | { text: string; review?: string };
type Tree = { [k: string]: Leaf | Tree };
const LANGS = ["lb", "de", "fr", "en"] as const;
const root = process.cwd();

function isLeaf(v: unknown): v is Leaf {
  if (typeof v === "string") return true;
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.text === "string" && Object.keys(o).every((k) => k === "text" || k === "review");
}
function flatten(tree: Tree, prefix = "", out = new Map<string, Leaf>()): Map<string, Leaf> {
  for (const [k, v] of Object.entries(tree)) {
    if (isLeaf(v)) out.set(prefix + k, v);
    else flatten(v as Tree, prefix + k + ".", out);
  }
  return out;
}
const text = (l: Leaf) => (typeof l === "string" ? l : l.text);
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const dicts = Object.fromEntries(LANGS.map((l) => [l, flatten(JSON.parse(readFileSync(join(root, "src/i18n", `${l}.json`), "utf8")) as Tree)])) as Record<(typeof LANGS)[number], Map<string, Leaf>>;
const fehler: string[] = [];
const alle = new Set(LANGS.flatMap((l) => [...dicts[l].keys()]));

for (const key of alle) {
  for (const l of LANGS) {
    const v = dicts[l].get(key);
    if (v === undefined) {
      fehler.push(`${l}: Schlüssel fehlt: ${key}`);
      continue;
    }
    if (!text(v).trim()) fehler.push(`${l}: leerer Text: ${key}`);
    if (l === "lb" && (typeof v === "string" || v.review !== "lb-native")) fehler.push(`lb: ohne review "lb-native": ${key}`);
  }
  const de = dicts.de.get(key);
  if (!de) continue;
  for (const l of LANGS) {
    const v = dicts[l].get(key);
    if (v && vars(text(v)) !== vars(text(de))) fehler.push(`${l}: Platzhalter weichen von de ab: ${key} ({${vars(text(v))}} statt {${vars(text(de))}})`);
  }
}

// Schlüssel im Code (nur feste Zeichenketten; zusammengesetzte prüft der Build selbst)
function dateien(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    if (n === "generated" || n === "node_modules") continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) dateien(p, out);
    else if (/\.(ts|astro)$/.test(n)) out.push(p);
  }
  return out;
}
const muster = [/\bt\(\s*(?:lang|cfg\.lang|o\.lang|fresh\.lang|"(?:lb|de|fr|en)")\s*,\s*"([a-zA-Z0-9_.]+)"/g, /\btp?\(\s*lang\s*,\s*"([a-zA-Z0-9_.]+)"/g, /\btrp?\(\s*"([a-zA-Z0-9_.]+)"/g];
for (const datei of [...dateien(join(root, "src")), ...dateien(join(root, "supabase/functions"))]) {
  const src = readFileSync(datei, "utf8");
  for (const re of muster) {
    for (const m of src.matchAll(re)) {
      const key = m[1];
      // Plural: key_one/key_other
      if (!dicts.de.has(key) && !dicts.de.has(`${key}_other`)) fehler.push(`${relative(root, datei)}: unbekannter Schlüssel "${key}"`);
    }
  }
}

const unique = [...new Set(fehler)];
if (unique.length) {
  console.error(`Übersetzungen: ${unique.length} Fehler`);
  for (const f of unique.slice(0, 200)) console.error("  " + f);
  process.exit(1);
}
const lbCount = [...dicts.lb.keys()].length;
console.log(`Übersetzungen: ${alle.size} Schlüssel in 4 Sprachen, ${lbCount} lëtzebuergesch Texte zur Prüfung markiert. OK.`);
