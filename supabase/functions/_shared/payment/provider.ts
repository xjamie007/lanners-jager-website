/**
 * Zahlungsanbieter (D10.6.4) hinter einer Schnittstelle, je Haus mit eigenem
 * Schlüssel (zwei Firmen, zwei Konten). Umsetzungen: MockPaymentProvider (Demo)
 * und MollieProvider (EU-Anbieter, Testmodus mit Testschlüsseln).
 * Der Status wird immer beim Anbieter nachgelesen, nie aus dem Webhook übernommen.
 */
export type PaymentStatus = "open" | "pending" | "paid" | "failed" | "canceled" | "expired";

export interface CreatePaymentInput {
  orderId: string;
  groupId: string;
  token: string;
  amountCents: number;
  description: string;
  /** Danke-Seite mit ?g=&t= */
  redirectUrl: string;
  webhookUrl: string;
  lang: "lb" | "de" | "fr" | "en";
}

export interface CreatedPayment {
  id: string;
  checkoutUrl: string;
}

export interface PaymentMethod {
  id: string;
  description: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  getStatus(paymentId: string): Promise<PaymentStatus>;
  listMethods(amountCents: number, lang: CreatePaymentInput["lang"]): Promise<PaymentMethod[]>;
}

/** Mollie-Locale: LB → de_DE (Briefing), sonst passend */
export const mollieLocale = (lang: CreatePaymentInput["lang"]) => ({ lb: "de_DE", de: "de_DE", fr: "fr_FR", en: "en_US" })[lang];
