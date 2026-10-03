/**
 * Konfiguration der Website (Astro-Seite). Liest Umgebungsvariablen beim Build.
 * Edge Functions lesen dieselben Namen über Deno.env (siehe _shared/env.ts).
 */
import { parseFeatures, canBuy, activeModes } from "./flags.ts";
import { houses } from "./houses.ts";

// import.meta.env gibt es nur unter Vite; Skripte und Tests laufen in Node
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
const get = (name: string): string | undefined => {
  const v = env[name] ?? (typeof process !== "undefined" ? process.env[name] : undefined);
  return v === "" ? undefined : v;
};

export const features = parseFeatures(get);
export const buyEnabled = canBuy(features);
export const modes = activeModes(features);

/** Platzhalter, bis die Domain feststeht (OP-02.3) */
export const SITE_URL = (get("SITE_URL") ?? "https://www.DOMAIN.lu").replace(/\/+$/, "");

/** Basis-Pfad, falls die Demo unter einem Unterordner läuft (GitHub Pages Projektseite) */
export const BASE_PATH = ("/" + (get("BASE_PATH") ?? "").replace(/^\/+|\/+$/g, "") + "/").replace(/\/\/+/g, "/");

/** Basis der Supabase Edge Functions, z. B. https://<ref>.supabase.co/functions/v1 */
export const FUNCTIONS_URL = (get("PUBLIC_FUNCTIONS_URL") ?? "").replace(/\/+$/, "");

/** Arbeitstitel (OP-02.2) */
export const SITE_NAME = "Lanners & Jager";

export { houses };
