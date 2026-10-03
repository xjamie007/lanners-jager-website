/**
 * Umgebungsvariablen der Edge Functions. Dieselben Namen wie im Astro-Build
 * (siehe .env.example). Leere Werte zählen als nicht gesetzt.
 */
import { parseFeatures } from "./generated/config/flags.ts";

export function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v === undefined || v === "" ? undefined : v;
}

export function envReq(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Umgebungsvariable fehlt: ${name}`);
  return v;
}

export const features = () => parseFeatures(env);

/** Öffentliche Adresse der Website (CORS, Weiterleitungen), ohne Schrägstrich am Ende */
export const siteUrl = () => (env("SITE_URL") ?? "https://www.DOMAIN.lu").replace(/\/+$/, "");

/** Öffentliche Basis der Functions (für Webhooks und Links in Mails) */
export function functionsBase(): string {
  const explicit = env("FUNCTIONS_PUBLIC_URL") ?? env("PUBLIC_FUNCTIONS_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  const supa = env("SUPABASE_URL");
  return supa ? `${supa.replace(/\/+$/, "")}/functions/v1` : "";
}

export const isDemo = () => features().demo;
