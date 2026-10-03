/**
 * Schnittstelle zur SoftTouch-API (FasMan). Zwei Umsetzungen:
 *  - HttpSoftTouchClient: https://api.softtouch.eu/{1|2}/accounts/{accountId}/
 *  - MockSoftTouchClient: Fixtures + Zustand in der Datenbank (SOFTTOUCH_MODE=mock)
 * Der Wechsel auf echt ist nur eine Umgebungsvariable (Briefing D10.8).
 */
import type {
  ProductQuery,
  StBrand,
  StCategory,
  StCheque,
  StColor,
  StCustomer,
  StCustomerInput,
  StDeliveryAddress,
  StDeliveryAddressInput,
  StMessage,
  StMessageInput,
  StPreset,
  StProduct,
  StReservation,
  StReservationInput,
  StSeason,
  StSizeTable,
  StStockRecord,
  StStore,
  StWashInstruction,
} from "./types.ts";

export class SoftTouchError extends Error {
  /** 0 = Netzwerk/Timeout, sonst HTTP-Status */
  status: number;
  /** 500, Timeout, unlesbare Antwort: später wiederholen, Bestellung nicht abbrechen (Doku) */
  retryable: boolean;
  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

export interface SoftTouchClient {
  /** Kennung für Logs und Tabellen (Konto-ID oder "demo") */
  readonly account: string;
  /** Anzahl der API-Aufrufe seit dem Erzeugen (für sync_runs und das Aufrufbudget) */
  readonly calls: number;

  getStores(): Promise<StStore[]>;
  getSeasons(): Promise<StSeason[]>;
  getBrands(): Promise<StBrand[]>;
  getCategories(): Promise<StCategory[]>;
  getColors(): Promise<StColor[]>;
  getSizeTables(): Promise<StSizeTable[]>;
  getFilePresets(): Promise<StPreset[]>;
  getTextPresets(): Promise<StPreset[]>;
  /** V2 Wash_instructions */
  getWashInstructions(): Promise<StWashInstruction[]>;

  /** Eine Seite GET products (take höchstens 500) */
  getProducts(q: ProductQuery): Promise<StProduct[]>;
  /** GET products?ids=…&detail=stock */
  getStock(uid8s: string[], stores?: string[]): Promise<StStockRecord[]>;

  findCustomersByEmail(email: string): Promise<StCustomer[]>;
  createCustomer(input: StCustomerInput): Promise<StCustomer>;
  createDeliveryAddress(input: StDeliveryAddressInput): Promise<StDeliveryAddress>;
  createReservation(input: StReservationInput): Promise<StReservation>;
  sendMessage(input: StMessageInput): Promise<StMessage>;

  /** Vorbereitet für die spätere Einlösung von Gutscheinen (D10.6.6), nicht eingebaut */
  validateCheque?(cheque: string, checksum: string): Promise<StCheque | null>;
}
