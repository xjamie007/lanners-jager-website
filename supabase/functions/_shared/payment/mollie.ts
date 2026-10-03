/**
 * MollieProvider (Mollie B.V., Niederlande). REST-API v2, ein API-Schlüssel je Haus.
 * Testmodus: Schlüssel beginnen mit "test_". Zahlungsarten aus der Methods-API,
 * nicht fest eingebaut. Ungetestet gegen das echte Konto (Schlüssel fehlen, OP-06.1).
 */
import { mollieLocale, type CreatePaymentInput, type CreatedPayment, type PaymentMethod, type PaymentProvider, type PaymentStatus } from "./provider.ts";

const API = "https://api.mollie.com/v2";

export class MollieProvider implements PaymentProvider {
  readonly name = "mollie";
  private key: string;
  constructor(apiKey: string) {
    this.key = apiKey;
  }

  private async call(path: string, init: { method?: string; body?: unknown } = {}): Promise<Record<string, unknown>> {
    const res = await fetch(`${API}${path}`, {
      method: init.method ?? "GET",
      headers: { authorization: `Bearer ${this.key}`, "content-type": "application/json", accept: "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(`Mollie ${path}: HTTP ${res.status} ${(body.detail as string) ?? ""}`);
    return body;
  }

  async createPayment(i: CreatePaymentInput): Promise<CreatedPayment> {
    const p = await this.call("/payments", {
      method: "POST",
      body: {
        amount: { currency: "EUR", value: (i.amountCents / 100).toFixed(2) },
        description: i.description,
        redirectUrl: i.redirectUrl,
        cancelUrl: i.redirectUrl,
        webhookUrl: i.webhookUrl,
        locale: mollieLocale(i.lang),
        metadata: { orderId: i.orderId, groupId: i.groupId },
      },
    });
    const links = p._links as { checkout?: { href: string } } | undefined;
    if (!links?.checkout?.href) throw new Error("Mollie: keine Checkout-URL");
    return { id: String(p.id), checkoutUrl: links.checkout.href };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const p = await this.call(`/payments/${encodeURIComponent(paymentId)}`);
    const s = String(p.status);
    if (s === "paid" || s === "failed" || s === "canceled" || s === "expired" || s === "open" || s === "pending") return s;
    if (s === "authorized") return "pending";
    return "failed";
  }

  async listMethods(amountCents: number, lang: CreatePaymentInput["lang"]): Promise<PaymentMethod[]> {
    const q = new URLSearchParams({ "amount[value]": (Math.max(amountCents, 100) / 100).toFixed(2), "amount[currency]": "EUR", locale: mollieLocale(lang), sequenceType: "oneoff" });
    const r = await this.call(`/methods?${q}`);
    const list = ((r._embedded as { methods?: { id: string; description: string }[] })?.methods ?? []).map((m) => ({ id: m.id, description: m.description }));
    return list;
  }
}
