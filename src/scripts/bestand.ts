/** Live-Bestand für mehrere Artikel (Tasche, Reservierung, Kasse). null = nicht erreichbar. */
import { config } from "./config.ts";
import type { StockResponse } from "../../supabase/functions/_shared/contract.ts";

export interface LiveSku {
  available: number;
  house: "lanners" | "jager";
  nettoPrice?: number;
}

export async function liveBestand(uid8s: string[]): Promise<Map<string, LiveSku> | null> {
  const base = config().functionsUrl;
  if (!base || uid8s.length === 0) return null;
  try {
    const results = await Promise.all(
      [...new Set(uid8s)].map(async (u) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        try {
          const res = await fetch(`${base}/stock?uid8=${u}`, { signal: ctrl.signal, headers: { accept: "application/json" } });
          if (!res.ok) throw new Error(String(res.status));
          return (await res.json()) as StockResponse;
        } finally {
          clearTimeout(timer);
        }
      }),
    );
    const map = new Map<string, LiveSku>();
    for (const r of results) {
      if (!r || !Array.isArray(r.skus)) throw new Error("Antwort ungültig");
      for (const s of r.skus) map.set(s.key14, { available: Math.max(0, Number(s.available) || 0), house: s.house, nettoPrice: s.nettoPrice });
    }
    return map;
  } catch {
    return null;
  }
}
