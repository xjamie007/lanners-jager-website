/**
 * Startet die ganze Demo mit einem Befehl (npm run demo):
 *  - Functions lokal (Deno + PGlite, ohne Docker) auf http://127.0.0.1:54331
 *  - Website (astro dev) auf http://127.0.0.1:4321
 * Strg+C beendet beides. Mit --neu beginnt die Demo-Datenbank leer
 * (Reservierungen, Bestellungen, Mails, Mock-Kasse).
 *
 * Beide Ports sind fest: Die Functions erlauben nur SITE_URL als Herkunft (CORS)
 * und leiten nach Formularen dorthin zurück.
 *
 * `--ignore-lock`: Astro 7 schiebt `astro dev` sonst in KI-Agent-Umgebungen
 * (auch in der Vorschau der Claude-App) selbst in den Hintergrund; dann ließe er
 * sich mit diesem Skript nicht mehr beenden.
 */
import { spawn, type ChildProcess } from "node:child_process";

const neu = process.argv.includes("--neu");
const kinder: ChildProcess[] = [];
let stoppt = false;

function stop(code = 0) {
  if (stoppt) return;
  stoppt = true;
  for (const k of kinder) if (k.exitCode === null && !k.killed) k.kill("SIGINT");
  setTimeout(() => process.exit(code), 500);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

// Functions: Ausgabe mit Präfix
const api = spawn("deno", ["task", "--config", "supabase/functions/deno.json", neu ? "dev:neu" : "dev"], { stdio: ["ignore", "pipe", "pipe"] });
const mitPraefix = (chunk: Buffer) =>
  chunk
    .toString()
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => `[api] ${l}`)
    .join("\n");
api.stdout?.on("data", (c: Buffer) => console.log(mitPraefix(c)));
api.stderr?.on("data", (c: Buffer) => console.error(mitPraefix(c)));
api.on("exit", (code) => {
  console.log(`[api] beendet (${code ?? "Signal"})`);
  stop(code ?? 1);
});
kinder.push(api);

// Website: direkt am Terminal, damit Astro seine normale Ausgabe zeigt
const web = spawn("npx", ["astro", "dev", "--ignore-lock"], { stdio: ["ignore", "inherit", "inherit"] });
web.on("exit", (code) => {
  console.log(`[web] beendet (${code ?? "Signal"})`);
  stop(code ?? 1);
});
kinder.push(web);

console.log("Demo: http://127.0.0.1:4321/lb/  (Functions: http://127.0.0.1:54331/functions/v1/…, Strg+C beendet)");
