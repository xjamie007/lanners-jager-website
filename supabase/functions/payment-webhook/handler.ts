/**
 * POST /payment-webhook (Zahlungsanbieter, z. B. Mollie: Body "id=tr_…").
 * Der Inhalt wird nicht übernommen: Der Status wird beim Anbieter nachgelesen.
 * Antwortet immer 200, damit der Anbieter nicht endlos wiederholt.
 */
import { getCtx } from "../_shared/ctx.ts";
import { readForm, text } from "../_shared/http.ts";
import { processPayment } from "../_shared/payment-flow.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return text(405, "POST");
  const f = await readForm(req);
  const id = (f.get("id") ?? "").trim();
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return text(200, "ignoriert");
  try {
    const ctx = await getCtx();
    const r = await processPayment(ctx, id);
    return text(200, r);
  } catch (e) {
    console.error("payment-webhook:", (e as Error).message);
    // 500: der Anbieter versucht es später noch einmal
    return text(500, "Fehler");
  }
}
