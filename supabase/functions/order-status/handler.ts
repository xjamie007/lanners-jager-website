/**
 * GET /order-status?g=<Gruppe>&t=<HMAC> (D10.6.3): t ist ein HMAC über die
 * Gruppen-ID, damit niemand fremde Bestellungen abfragen kann.
 */
import { getCtx } from "../_shared/ctx.ts";
import { json, preflight } from "../_shared/http.ts";
import { verifyGroupToken } from "../_shared/security.ts";
import { ordersByGroup, toView } from "../_shared/orders.ts";

export async function handler(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "GET") return json(req, { error: "methode" }, 405);
  const u = new URL(req.url);
  const g = u.searchParams.get("g") ?? "";
  const t = u.searchParams.get("t") ?? "";
  if (!(await verifyGroupToken(g, t))) return json(req, { error: "token" }, 403);
  const ctx = await getCtx();
  const orders = await ordersByGroup(ctx.db, g);
  return json(req, { group: g, orders: orders.map((o) => toView(o)) });
}
