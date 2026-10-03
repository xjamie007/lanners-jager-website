/**
 * Live-Bestand (D10.4 stock, D10.5/6 Live-Abruf vor dem Abschluss).
 * products?ids=<uid8>&detail=stock je Konto, minus aktive Halte-Mengen.
 * Für die Produktseite 60 Sekunden in stock_cache; vor Reservierung und Zahlung
 * immer frisch.
 */
import type { Ctx } from "./ctx.ts";
import { cents } from "./db.ts";
import { activeHolds } from "./orders.ts";
import { splitKey14 } from "./catalog/transform.ts";
import { softtouch } from "./generated/config/softtouch.ts";
import type { StockResponse, StockSku } from "./contract.ts";

/** Verfügbare Menge je Schlüssel, frisch von SoftTouch (wirft SoftTouchError) */
export async function liveAvailability(ctx: Ctx, uid8s: string[], excludeOrder?: string): Promise<Map<string, { stock: number; available: number; house: "lanners" | "jager" }>> {
  const out = new Map<string, { stock: number; available: number; house: "lanners" | "jager" }>();
  const unique = [...new Set(uid8s)];
  for (const group of ctx.accounts()) {
    const records = await group.client.getStock(unique, group.stores);
    for (const r of records) {
      const key14 = String(r.key).padStart(14, "0");
      const house = ctx.storeToHouse[String(r.store).padStart(2, "0")];
      if (!house) continue;
      out.set(key14, { stock: Math.max(0, Number(r.stock) || 0), available: Math.max(0, Number(r.stock) || 0), house });
    }
  }
  const holds = await activeHolds(ctx.db, [...out.keys()], excludeOrder);
  for (const [k, v] of out) v.available = Math.max(0, v.stock - (holds.get(k) ?? 0));
  return out;
}

export async function stockForProduct(ctx: Ctx, uid8: string): Promise<StockResponse> {
  const cached = await ctx.db.query<{ payload: StockResponse }>(
    `select payload from stock_cache where uid8 = $1 and fetched_at > now() - make_interval(secs => $2)`,
    [uid8, softtouch.stockCacheSeconds],
  );
  let base: StockResponse;
  if (cached[0]) base = cached[0].payload;
  else {
    const live = await liveAvailability(ctx, [uid8]);
    const skus: StockSku[] = [...live.entries()].map(([key14, v]) => {
      const k = splitKey14(key14);
      return { key14, house: v.house, sizeX: k.sizeX, sizeY: k.sizeY, available: v.stock };
    });
    base = { uid8, asOf: ctx.now().toISOString(), skus };
    await ctx.db.query(
      `insert into stock_cache (uid8, payload, fetched_at) values ($1, $2::jsonb, now()) on conflict (uid8) do update set payload = excluded.payload, fetched_at = now()`,
      [uid8, base],
    );
  }
  // Halte-Mengen und Preise (aus dem letzten Abgleich) bei jedem Aufruf frisch
  const keys = base.skus.map((s) => s.key14);
  const holds = await activeHolds(ctx.db, keys);
  const prices = await ctx.db.query<{ key14: string; price: string; netto_price: string }>(
    `select key14, price::text, netto_price::text from skus where key14 in (select jsonb_array_elements_text($1::jsonb))`,
    [keys],
  );
  const pm = new Map(prices.map((p) => [p.key14, p]));
  return {
    uid8,
    asOf: base.asOf,
    skus: base.skus.map((s) => ({
      ...s,
      available: Math.max(0, s.available - (holds.get(s.key14) ?? 0)),
      price: pm.has(s.key14) ? cents(pm.get(s.key14)!.price) : undefined,
      nettoPrice: pm.has(s.key14) ? cents(pm.get(s.key14)!.netto_price) : undefined,
    })),
  };
}
