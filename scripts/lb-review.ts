/**
 * docs/lb-review.csv für die Prüfung durch einen Muttersprachler (Briefing A):
 * Schlüssel, DE, LB-Entwurf, dazu FR als Hilfe und eine leere Spalte für die
 * Korrektur. Enthält alle Texte mit review: "lb-native" aus src/i18n/lb.json
 * und aus src/content (Warengruppen, Feiertage).
 *   npm run lb-review
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Tree = { [k: string]: unknown };
const root = process.cwd();
const json = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8")) as Tree;

function isLeaf(v: unknown): v is string | { text: string; review?: string } {
  if (typeof v === "string") return true;
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.text === "string" && Object.keys(o).every((k) => k === "text" || k === "review");
}
function flatten(tree: Tree, prefix = "", out = new Map<string, unknown>()) {
  for (const [k, v] of Object.entries(tree)) {
    if (isLeaf(v)) out.set(prefix + k, v);
    else if (v && typeof v === "object") flatten(v as Tree, prefix + k + ".", out);
  }
  return out;
}
const text = (v: unknown) => (typeof v === "string" ? v : v && typeof v === "object" && "text" in v ? String((v as { text: string }).text) : "");

const rows: string[][] = [];
const lb = flatten(json("src/i18n/lb.json"));
const de = flatten(json("src/i18n/de.json"));
const fr = flatten(json("src/i18n/fr.json"));
for (const [k, v] of lb) {
  if (typeof v === "object" && (v as { review?: string }).review === "lb-native") rows.push([`i18n:${k}`, text(de.get(k)), text(v), text(fr.get(k)), ""]);
}

// Inhalte mit Sprachfeldern { lb: {text, review}, de: "…", fr: "…" }
function inhalte(datei: string, tree: unknown, pfad: string) {
  if (!tree || typeof tree !== "object") return;
  const o = tree as Record<string, unknown>;
  if ("lb" in o && "de" in o && isLeaf(o.lb)) {
    const v = o.lb as { text?: string; review?: string };
    if (typeof v === "object" && v.review === "lb-native") rows.push([`${datei}:${pfad}`, text(o.de), text(o.lb), text(o.fr), ""]);
    return;
  }
  for (const [k, v] of Object.entries(o)) inhalte(datei, v, pfad ? `${pfad}.${k}` : k);
}
for (const datei of ["src/content/warengruppen.json", "src/content/oeffnungszeiten.json"]) inhalte(datei.replace("src/content/", ""), json(datei), "");

const csv = (s: string) => (/[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const out = [["Schlüssel", "DE", "LB-Entwurf", "FR (zur Hilfe)", "LB korrigiert"], ...rows].map((r) => r.map(csv).join(",")).join("\n") + "\n";
mkdirSync(join(root, "docs"), { recursive: true });
// BOM, damit Excel die Umlaute richtig liest
writeFileSync(join(root, "docs/lb-review.csv"), "﻿" + out);
console.log(`docs/lb-review.csv: ${rows.length} Texte zur Prüfung`);
