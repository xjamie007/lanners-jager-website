/**
 * Misst den Build mit dem Lasttest-Katalog (npm run loadtest): Astro-Build und
 * Pagefind über .loadtest/catalog-<n>.json nach dist-loadtest/ (nie deployt).
 * Das Ergebnis steht in der Konsole und in .loadtest/ergebnis.json (für die README).
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cpus, totalmem } from "node:os";

const root = process.cwd();
const dateien = readdirSync(join(root, ".loadtest")).filter((f) => /^catalog-\d+\.json$/.test(f));
if (!dateien.length) throw new Error("Zuerst: node scripts/generate-demo-catalog.ts --count 3000");
const datei = join(root, ".loadtest", dateien.sort((a, b) => Number(b.match(/\d+/)![0]) - Number(a.match(/\d+/)![0]))[0]);
const artikel = Number(datei.match(/catalog-(\d+)/)![1]);
const out = "dist-loadtest";
const env = { ...process.env, CATALOG_FILE: datei, ASTRO_OUT_DIR: out };

function lauf(cmd: string, args: string[]): number {
  const t0 = performance.now();
  const r = spawnSync(cmd, args, { env, stdio: ["ignore", "inherit", "inherit"], cwd: root });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: Code ${r.status}`);
  return (performance.now() - t0) / 1000;
}
function zaehle(dir: string): { html: number; bytes: number } {
  let html = 0;
  let bytes = 0;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) {
      const r = zaehle(p);
      html += r.html;
      bytes += r.bytes;
    } else {
      bytes += s.size;
      if (n.endsWith(".html")) html++;
    }
  }
  return { html, bytes };
}

const astro = lauf("npx", ["astro", "build"]);
const pagefind = lauf("npx", ["pagefind", "--site", out]);
const z = existsSync(join(root, out)) ? zaehle(join(root, out)) : { html: 0, bytes: 0 };
const ergebnis = {
  datum: new Date().toISOString(),
  artikel,
  seiten: z.html,
  groesseMB: Math.round(z.bytes / 1e6),
  astroSekunden: Math.round(astro),
  pagefindSekunden: Math.round(pagefind),
  gesamtSekunden: Math.round(astro + pagefind),
  rechner: `${cpus()[0]?.model ?? "?"}, ${cpus().length} Kerne, ${Math.round(totalmem() / 1e9)} GB`,
  node: process.version,
};
writeFileSync(join(root, ".loadtest", "ergebnis.json"), JSON.stringify(ergebnis, null, 2));
console.log(`\nLasttest: ${artikel} Artikel → ${z.html} Seiten (${ergebnis.groesseMB} MB) in ${ergebnis.gesamtSekunden} s (Astro ${ergebnis.astroSekunden} s, Pagefind ${ergebnis.pagefindSekunden} s) auf ${ergebnis.rechner}`);
