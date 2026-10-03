/**
 * Kopiert die reinen Konfigurations- und Inhaltsdateien aus src/ nach
 * supabase/functions/_shared/generated/, damit die Edge Functions (Deno) sie
 * importieren können. Quelle bleibt src/ (wie im Briefing festgelegt).
 *
 *   node scripts/sync-shared.ts          kopieren
 *   node scripts/sync-shared.ts --check  nur prüfen (CI): Abweichung = Fehler
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "supabase/functions/_shared/generated");
const check = process.argv.includes("--check");

/** Nur reine Dateien ohne import.meta.env (site.ts liest Umgebungsvariablen und bleibt draußen) */
const sources: { dir: string; files: string[] }[] = [
  { dir: "src/config", files: ["houses.ts", "softtouch.ts", "shop.ts", "versand.ts", "flags.ts"] },
  { dir: "src/content", files: ["oeffnungszeiten.json", "warengruppen.json"] },
  { dir: "src/i18n", files: ["lb.json", "de.json", "fr.json", "en.json", "static-routes.ts"] },
];

const header = (src: string) => `// GENERIERT aus ${src} durch scripts/sync-shared.ts. Nicht hier bearbeiten.\n`;
let diff = 0;
for (const s of sources) {
  const outDir = join(OUT, s.dir.replace(/^src\//, ""));
  mkdirSync(outDir, { recursive: true });
  for (const f of s.files) {
    const srcPath = join(root, s.dir, f);
    if (!existsSync(srcPath)) continue;
    const content = readFileSync(srcPath, "utf8");
    const out = f.endsWith(".ts") ? header(`${s.dir}/${f}`) + content : content;
    const target = join(outDir, f);
    const before = existsSync(target) ? readFileSync(target, "utf8") : null;
    if (before !== out) {
      diff++;
      if (check) console.error(`Nicht synchron: ${s.dir}/${f}`);
      else writeFileSync(target, out);
    }
  }
}
// verwaiste Dateien melden
for (const sub of readdirSync(OUT, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const f of readdirSync(join(OUT, sub.name))) {
    const known = sources.some((s) => s.dir.endsWith(sub.name) && s.files.includes(f));
    if (!known) console.warn(`Verwaist: _shared/generated/${sub.name}/${f}`);
  }
}
if (check && diff > 0) {
  console.error(`${diff} Datei(en) nicht synchron. npm run sync-shared ausführen.`);
  process.exit(1);
}
console.log(check ? "Geteilte Dateien synchron." : `Geteilte Dateien: ${diff} aktualisiert.`);
