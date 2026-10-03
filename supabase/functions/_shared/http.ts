/**
 * HTTP-Hilfen: CORS nur für SITE_URL, JSON-Antworten, 303-Weiterleitungen auf
 * geprüfte Pfade der eigenen Seite, Formulare lesen, Client-IP.
 */
import { siteUrl } from "./env.ts";

export function allowedOrigin(): string {
  try {
    return new URL(siteUrl()).origin;
  } catch {
    return "";
  }
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigin();
  if (!origin || origin !== allowed) return { vary: "origin" };
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, accept",
    "access-control-max-age": "600",
    vary: "origin",
  };
}

export function preflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export function json(req: Request, data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsHeaders(req), ...extra },
  });
}

/** Nur Pfade der eigenen Seite: /lb/…, /de/…, /fr/…, /en/… (kein offener Redirect) */
export function safePath(p: string | null | undefined, fallback: string): string {
  if (!p) return fallback;
  if (!/^\/(lb|de|fr|en)\/[a-z0-9\-/]*$/.test(p) || p.includes("//")) return fallback;
  return p;
}

/** Zieladresse auf der Seite, mit optionalem Basis-Pfad aus SITE_URL */
export function siteHref(path: string, params: Record<string, string | undefined> = {}, hash = ""): string {
  const base = siteUrl();
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, v);
  return url.toString() + hash;
}

export function redirect303(location: string): Response {
  return new Response(null, { status: 303, headers: { location, "cache-control": "no-store" } });
}

export async function readForm(req: Request): Promise<URLSearchParams> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded")) return new URLSearchParams(await req.text());
  if (type.includes("multipart/form-data")) {
    const fd = await req.formData();
    const p = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (typeof v === "string") p.append(k, v);
    return p;
  }
  if (type.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) p.append(k, String(v));
    return p;
  }
  return new URLSearchParams(await req.text());
}

/** Client-IP (Supabase setzt x-forwarded-for). Wird nur gehasht verwendet. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? req.headers.get("cf-connecting-ip") ?? "0.0.0.0";
}

export function text(status: number, body: string): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

export const field = (f: URLSearchParams, name: string, max = 500): string => (f.get(name) ?? "").trim().slice(0, max);
