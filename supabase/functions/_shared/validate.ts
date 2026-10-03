/** Serverseitige Prüfung der Formulare (F1–F4). Gibt fehlerhafte Feldnamen zurück. */
import { F, KEY14, isEmail, isPhone, type Position } from "./contract.ts";
import { field } from "./http.ts";

/** Bots: Honeypot gefüllt oder in unter 2 Sekunden abgeschickt */
export function looksLikeBot(f: URLSearchParams, now: number): boolean {
  if (field(f, F.honeypot)) return true;
  const t = Number(f.get(F.zeit));
  return Number.isFinite(t) && t > 0 && now - t < 2000;
}

export function pflicht(f: URLSearchParams, names: string[], err: string[]) {
  for (const n of names) if (!field(f, n)) err.push(n);
}

export function emailFeld(f: URLSearchParams, name: string, err: string[], required = true) {
  const v = field(f, name, 254);
  if ((required || v) && !isEmail(v)) err.push(name);
}

export function telefonFeld(f: URLSearchParams, name: string, err: string[], required = true) {
  const v = field(f, name, 40);
  if ((required || v) && !isPhone(v)) err.push(name);
}

export function positionen(f: URLSearchParams, maxMenge: number): Position[] {
  let raw: unknown;
  try {
    raw = JSON.parse(f.get("positionen") ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, Position>();
  for (const p of raw.slice(0, 50)) {
    const key = String((p as Position)?.key ?? "");
    const menge = Math.trunc(Number((p as Position)?.menge));
    if (!KEY14.test(key) || !(menge >= 1)) continue;
    const prev = merged.get(key);
    merged.set(key, { key, menge: Math.min(maxMenge, (prev?.menge ?? 0) + menge), preis: Number((p as Position).preis) || undefined });
  }
  return [...merged.values()];
}
