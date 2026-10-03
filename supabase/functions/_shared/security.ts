/**
 * Sicherheit: HMAC-Token für Bestellungen (order-status, Demo-Postausgang),
 * Hash der IP (nie gespeichert), Rate-Limit, Prüfung der Cron- und Build-Geheimnisse.
 */
import type { Db } from "./db.ts";
import { env } from "./env.ts";

const enc = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hmac(secret: string, data: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(data));
  return b64url(sig).slice(0, 32);
}

function orderSecret(): string {
  const s = env("ORDER_TOKEN_SECRET");
  if (!s) throw new Error("ORDER_TOKEN_SECRET fehlt");
  return s;
}

/** Token für eine Gruppe (Reservierung über zwei Häuser, Bestellung, Anfrage) */
export const groupToken = (groupId: string) => hmac(orderSecret(), `gruppe:${groupId}`);

export async function verifyGroupToken(groupId: string, token: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(groupId) || !token) return false;
  const expected = await groupToken(groupId);
  return timingSafeEqual(expected, token);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** IP nur als Prüfsumme mit Salz (D10.4: "die IP wird gehasht, nicht gespeichert") */
export async function hashIp(ip: string): Promise<string> {
  return hmac(env("RATE_LIMIT_SALT") ?? "ohne-salz", `ip:${ip}`);
}

/**
 * Feste Fenster: true = erlaubt. Zählt in rate_limits (key, Fensterbeginn).
 * @param windowSeconds 60 für "pro Minute", 3600 für "pro Stunde"
 */
export async function rateLimit(db: Db, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await db.query<{ count: number }>(
    `insert into rate_limits (key, window_start, count)
     values ($1, to_timestamp(floor(extract(epoch from now()) / $2) * $2), 1)
     on conflict (key, window_start) do update set count = rate_limits.count + 1
     returning count::int as count`,
    [key, windowSeconds],
  );
  return (rows[0]?.count ?? 0) <= limit;
}

/** Cron-Aufrufe (pg_cron über pg_net) tragen x-cron-secret */
export function cronAuthorized(req: Request): boolean {
  const s = env("CRON_SECRET");
  const got = req.headers.get("x-cron-secret") ?? "";
  return !!s && timingSafeEqual(s, got);
}

/** Build in GitHub Actions trägt x-build-secret (catalog-export) */
export function buildAuthorized(req: Request): boolean {
  const s = env("BUILD_SECRET");
  const got = req.headers.get("x-build-secret") ?? "";
  return !!s && timingSafeEqual(s, got);
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
