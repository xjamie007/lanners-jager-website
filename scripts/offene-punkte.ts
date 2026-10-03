/**
 * OFFENE-PUNKTE.md aus dem Register src/content/offene-punkte.json (Briefing A, B7):
 * je Punkt Seite, Übersetzungsschlüssel bzw. Konfiguration, was fehlt, dazu die
 * Fundstellen im Code (wo der sichtbare Platzhalter steht).
 *   npm run offene-punkte
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

interface Punkt {
  id: string;
  bereich: string;
  status: "fehlt" | "unbestaetigt" | "entscheidung";
  was: string;
  seiten: string[];
  schluessel: string[];
}
const root = process.cwd();
const register = JSON.parse(readFileSync(join(root, "src/content/offene-punkte.json"), "utf8")) as { punkte: Punkt[] };

// Fundstellen: jede Datei, die die Id nennt (Offen-Komponente, Konfiguration, Texte)
function dateien(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    if (["node_modules", "generated", "dist", ".astro"].includes(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) dateien(p, out);
    else if (/\.(ts|astro|json)$/.test(n) && !p.endsWith("offene-punkte.json")) out.push(p);
  }
  return out;
}
const quellen = [...dateien(join(root, "src")), ...dateien(join(root, "supabase/functions"))].map((p) => ({ p: relative(root, p), s: readFileSync(p, "utf8") }));
const fundstellen = (id: string) => {
  const re = new RegExp(`["'\` (]${id.replace(/\./g, "\\.")}(?![0-9.])`);
  return quellen.filter((q) => re.test(q.s)).map((q) => q.p);
};

const STATUS: Record<Punkt["status"], string> = { fehlt: "fehlt", unbestaetigt: "unbestätigt", entscheidung: "Entscheidung" };
const zelle = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const liste = (xs: string[]) => (xs.length ? xs.map((x) => zelle(x)).join("<br>") : "–");

const bereiche = new Map<string, Punkt[]>();
for (const p of register.punkte) bereiche.set(p.bereich, [...(bereiche.get(p.bereich) ?? []), p]);
const zaehl = (s: Punkt["status"]) => register.punkte.filter((p) => p.status === s).length;

const md: string[] = [
  "# Offene Punkte",
  "",
  "Erzeugt aus `src/content/offene-punkte.json` mit `npm run offene-punkte`. Bitte dort pflegen, nicht hier.",
  "",
  "Auf der Website ist jede betroffene Stelle sichtbar markiert, je nach Sprache als „[fehlt]“ oder „[unbestätigt]“ (LB „[feelt]“ / „[net confirméiert]“), mit der Nummer des Punkts im Tooltip. Nichts davon ist erfunden. Die einzige Ausnahme sind die Demo-Artikel; sie tragen überall „Demo“ und erscheinen nur mit `PUBLIC_DEMO=true`.",
  "",
  `**Stand:** ${register.punkte.length} Punkte: ${zaehl("fehlt")} fehlen, ${zaehl("unbestaetigt")} sind unbestätigt, ${zaehl("entscheidung")} brauchen eine Entscheidung.`,
  "",
  "- **fehlt:** Die Angabe fehlt. Die Seite zeigt einen Platzhalter.",
  "- **unbestätigt:** Ein Wert aus der Recherche steht auf der Seite, markiert. Beim Kunden bestätigen.",
  "- **Entscheidung:** Der Kunde oder Nave entscheidet; die Demo zeigt die beschriebene Lösung.",
  "",
  "Alle luxemburgischen Texte und Slugs sind Entwürfe (OP-13). Sie stehen mit Deutsch und Französisch zur Prüfung in `docs/lb-review.csv` (`npm run lb-review`).",
  "",
];
for (const [bereich, punkte] of bereiche) {
  md.push(`## ${bereich}`, "", "| Nr. | Status | Was fehlt | Seite | Schlüssel / Konfiguration | Fundstellen im Code |", "|---|---|---|---|---|---|");
  for (const p of punkte) md.push(`| ${p.id} | ${STATUS[p.status]} | ${zelle(p.was)} | ${liste(p.seiten)} | ${liste(p.schluessel.map((s) => "`" + s + "`"))} | ${liste(fundstellen(p.id).map((f) => "`" + f + "`"))} |`);
  md.push("");
}
writeFileSync(join(root, "OFFENE-PUNKTE.md"), md.join("\n"));
console.log(`OFFENE-PUNKTE.md: ${register.punkte.length} Punkte in ${bereiche.size} Bereichen`);
