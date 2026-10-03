/**
 * MockPaymentProvider (Demo): Statt der Seite des Anbieters öffnet sich die
 * Demo-Zahlungsseite der Website (/de/kasse/demo-zahlung/ usw.) mit drei
 * Ausgängen. Der Status liegt in mock_payments.
 */
import type { Db } from "../db.ts";
import type { CreatePaymentInput, CreatedPayment, PaymentMethod, PaymentProvider, PaymentStatus } from "./provider.ts";
import { siteHref } from "../http.ts";
import { STATIC_PATHS } from "../paths.ts";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  private db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  async createPayment(i: CreatePaymentInput): Promise<CreatedPayment> {
    const id = `demo_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    await this.db.query(`insert into mock_payments (id, order_id, amount_cents, description, redirect_url) values ($1, $2, $3, $4, $5)`, [
      id,
      i.orderId,
      i.amountCents,
      i.description,
      i.redirectUrl,
    ]);
    return { id, checkoutUrl: siteHref(STATIC_PATHS.kasseDemo[i.lang], { p: id, g: i.groupId, t: i.token }) };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const rows = await this.db.query<{ status: PaymentStatus }>(`select status from mock_payments where id = $1`, [paymentId]);
    return rows[0]?.status ?? "failed";
  }

  async listMethods(): Promise<PaymentMethod[]> {
    return [{ id: "demo", description: "Demo" }];
  }

  /** Nur Demo: der Ausgang, den der Besucher auf der Demo-Zahlungsseite wählt */
  async setStatus(paymentId: string, status: PaymentStatus) {
    await this.db.query(`update mock_payments set status = $2, updated_at = now() where id = $1 and status in ('open', 'pending')`, [paymentId, status]);
  }
}
