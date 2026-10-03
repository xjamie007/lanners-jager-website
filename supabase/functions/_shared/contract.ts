/**
 * Vertrag zwischen statischer Seite (Formulare, Islands) und Edge Functions.
 * Reine Typen und Konstanten; von beiden Seiten importiert, damit Feldnamen,
 * Fehlercodes und Antworten nicht auseinanderlaufen.
 */

export type Lang = "lb" | "de" | "fr" | "en";
export type HouseId = "lanners" | "jager";
export type Mode = "reserve" | "collect" | "ship";

/** Formularfelder, die alle Formulare teilen */
export const F = {
  lang: "lang",
  /** Pfad der Bestätigungsseite in der Sprache (relativ, wird gegen SITE_URL geprüft) */
  ok: "_ok",
  /** Pfad des Formulars für die Rückkehr mit Fehlern */
  back: "_back",
  /** Honeypot: muss leer bleiben */
  honeypot: "website",
  /** Zeitpunkt, zu dem das Formular angezeigt wurde (Bots schicken in unter 2 s) */
  zeit: "_t",
} as const;

/** Fehlercodes in ?fehler= (keine personenbezogenen Daten in der URL, D10.9) */
export type FehlerCode = "felder" | "bestand" | "preis" | "zuviele" | "allgemein" | "tasche";

/** Positionen einer Reservierung oder Bestellung (verstecktes Feld "positionen", JSON) */
export interface Position {
  key: string;
  menge: number;
  /** Stückpreis laut Tasche in Cent, nur zum Erkennen von Preisänderungen */
  preis?: number;
}

export interface StockSku {
  key14: string;
  house: HouseId;
  sizeX: string;
  sizeY: string;
  available: number;
  /** Cent, aus der letzten Synchronisation (Supabase), nicht live */
  price?: number;
  nettoPrice?: number;
}

export interface StockResponse {
  uid8: string;
  asOf: string;
  skus: StockSku[];
}

export type OrderStatus = "pending" | "paid" | "reserved" | "queued" | "nachpruefen" | "failed" | "canceled" | "expired";

export interface OrderView {
  id: string;
  number: string;
  house: HouseId;
  mode: Mode;
  status: OrderStatus;
  reservationNo: string | null;
  pickupFrom: string | null;
  holdUntil: string | null;
  items: { key: string; marke: string; name: string; farbe: string; groesse: string; menge: number; preis: number }[];
  totals: { zwischensumme: number; versand: number; gesamt: number } | null;
  email: string;
  address: string | null;
  paymentUrl: string | null;
}

export interface OrderStatusResponse {
  group: string;
  orders: OrderView[];
}

export interface DemoMail {
  id: string;
  createdAt: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  lang: string;
  kind: string;
}

/** Gruppen-Referenz, die die Danke-Seite im Browser behält (Demo-Postausgang) */
export interface GroupRef {
  g: string;
  t: string;
  art: "reservierung" | "bestellung" | "anfrage";
  zeit: number;
}

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const KEY14 = /^\d{14}$/;
export const UID8 = /^\d{8}$/;

/** Postleitzahl: "L-9050" und "9050" werden beide angenommen und als "L-9050" gespeichert (F2) */
export function normalizePostcode(raw: string, country: string): string | null {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (country === "LU") {
    const m = /^(?:L-?)?(\d{4})$/.exec(s);
    return m ? `L-${m[1]}` : null;
  }
  return /^[A-Z0-9-]{3,10}$/.test(s) ? s : null;
}

/** E-Mail: pragmatisch, wie das Browser-Feld type=email */
export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && v.length <= 254;
}

/** Telefon: Ziffern, Leerzeichen, +, /, -, ( ); mindestens 6 Ziffern */
export function isPhone(v: string): boolean {
  const digits = v.replace(/\D/g, "");
  return /^[\d\s+()/.-]{6,25}$/.test(v.trim()) && digits.length >= 6 && digits.length <= 15;
}
