/**
 * GET /stock?uid8=12345601 (öffentlich, D10.4)
 * Prüft ^\d{8}$, CORS nur für SITE_URL, 30 Anfragen pro Minute und IP (gehasht).
 * Antwort: { uid8, asOf, skus: [{ key14, house, sizeX, sizeY, available, price, nettoPrice }] }
 */
import { getCtx } from "../_shared/ctx.ts";
import { json, preflight, clientIp } from "../_shared/http.ts";
import { hashIp, rateLimit } from "../_shared/security.ts";
import { stockForProduct } from "../_shared/stock.ts";
import { UID8 } from "../_shared/contract.ts";
import { shop } from "../_shared/generated/config/shop.ts";

export async function handler(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "GET") return json(req, { error: "methode" }, 405);
  const uid8 = new URL(req.url).searchParams.get("uid8") ?? "";
  if (!UID8.test(uid8)) return json(req, { error: "uid8" }, 400);
  const ctx = await getCtx();
  if (!(await rateLimit(ctx.db, `stock:${await hashIp(clientIp(req))}`, shop.rateLimit.stockProMinute, 60))) {
    return json(req, { error: "zuviele" }, 429, { "retry-after": "60" });
  }
  try {
    return json(req, await stockForProduct(ctx, uid8));
  } catch (e) {
    console.error("stock:", (e as Error).message);
    return json(req, { error: "softtouch" }, 503);
  }
}
