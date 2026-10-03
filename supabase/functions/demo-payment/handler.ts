/**
 * POST /demo-payment (nur Demo, MockPaymentProvider): Der Besucher wählt auf
 * der Demo-Zahlungsseite den Ausgang. Danach läuft derselbe Weg wie beim echten
 * Webhook (processPayment), dann 303 auf die Danke-Seite.
 */
import { getCtx } from "../_shared/ctx.ts";
import { readForm, redirect303, safePath, siteHref, text } from "../_shared/http.ts";
import { verifyGroupToken } from "../_shared/security.ts";
import { env, features } from "../_shared/env.ts";
import { isLang, type Lang } from "../_shared/i18n.ts";
import { STATIC_PATHS } from "../_shared/paths.ts";
import { MockPaymentProvider } from "../_shared/payment/mock.ts";
import { processPayment } from "../_shared/payment-flow.ts";
import { ordersByGroup } from "../_shared/orders.ts";
import { MockSoftTouchClient } from "../_shared/softtouch/mock.ts";
import { invalidateStock } from "../_shared/catalog/store.ts";
import { liveAvailability } from "../_shared/stock.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return text(405, "POST");
  if (!features().demo || (env("PAYMENT_PROVIDER") ?? "mock") !== "mock") return text(404, "Nur in der Demo");
  const f = await readForm(req);
  const lang: Lang = isLang(f.get("lang")) ? (f.get("lang") as Lang) : "lb";
  const ok = safePath(f.get("_ok"), STATIC_PATHS.kasseDanke[lang]);
  const p = f.get("p") ?? "";
  const g = f.get("g") ?? "";
  const t = f.get("t") ?? "";
  if (!(await verifyGroupToken(g, t))) return text(403, "Token ungültig");
  const ctx = await getCtx();
  const orders = await ordersByGroup(ctx.db, g);
  if (!orders.some((o) => o.payment_id === p)) return text(404, "Zahlung unbekannt");
  const aktion = f.get("aktion");
  // "verkauft": bezahlt, aber das Stück ist inzwischen im Laden weg (Weg "nachpruefen")
  if (aktion === "verkauft") {
    const order = orders.find((o) => o.payment_id === p)!;
    const client = ctx.conn(order.house_id).client;
    if (client instanceof MockSoftTouchClient) {
      // den ganzen Bestand des ersten Artikels "verkaufen", damit er sicher fehlt
      const live = await liveAvailability(ctx, [order.items[0].key.slice(0, 8)], order.id);
      const erster = order.items[0];
      await client.simulateSale(erster.key, Math.max(live.get(erster.key)?.stock ?? 0, erster.menge));
      await invalidateStock(ctx.db, order.items.map((i) => i.key.slice(0, 8)));
    }
  }
  const status = aktion === "erfolg" || aktion === "verkauft" ? "paid" : aktion === "fehler" ? "failed" : "canceled";
  await new MockPaymentProvider(ctx.db).setStatus(p, status);
  await processPayment(ctx, p);
  return redirect303(siteHref(ok, { g, t }));
}
