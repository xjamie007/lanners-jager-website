/**
 * Echter SoftTouch-Client. Basis https://api.softtouch.eu/{1|2}/accounts/{accountId}/,
 * Token im Authorization-Header (Bearer). Jeder Aufruf läuft gegen die Live-Datenbank
 * der Häuser: wenig Aufrufe, Seiten zu 500, Zeitlimit, Antwort prüfen.
 * HTTP 500 oder unlesbare Antwort = retryable (Outbox), 400/404/409 = nicht.
 */
import { SoftTouchError, type SoftTouchClient } from "./client.ts";
import { parse, productsSchema, stockSchema, listSchema, customersSchema, customerSchema, reservationSchema, deliveryAddressSchema, messageSchema } from "./schemas.ts";
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

export interface HttpClientOptions {
  apiBase: string;
  accountId: string;
  token: string;
  timeoutMs: number;
  pageSize: number;
}

export class HttpSoftTouchClient implements SoftTouchClient {
  readonly account: string;
  calls = 0;
  private o: HttpClientOptions;

  constructor(o: HttpClientOptions) {
    this.o = o;
    this.account = o.accountId;
  }

  private async request(version: 1 | 2, path: string, query: Record<string, string | number | undefined> = {}, init: { method?: string; body?: unknown } = {}): Promise<unknown> {
    const url = new URL(`${this.o.apiBase.replace(/\/+$/, "")}/${version}/accounts/${encodeURIComponent(this.o.accountId)}/${path}`);
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.o.timeoutMs);
    this.calls++;
    let res: Response;
    try {
      res = await fetch(url, {
        method: init.method ?? "GET",
        headers: {
          authorization: `Bearer ${this.o.token}`,
          accept: "application/json",
          ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: ctrl.signal,
      });
    } catch (e) {
      throw new SoftTouchError(`SoftTouch nicht erreichbar: ${(e as Error).message}`, 0, true);
    } finally {
      clearTimeout(timer);
    }
    const raw = await res.text();
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      throw new SoftTouchError(`SoftTouch-Antwort nicht lesbar (HTTP ${res.status})`, res.status, true);
    }
    if (!res.ok) {
      const msg = (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
      throw new SoftTouchError(`SoftTouch ${init.method ?? "GET"} ${path}: ${msg}`, res.status, res.status >= 500 || res.status === 429);
    }
    return body;
  }

  private async list<T>(version: 1 | 2, path: string, query: Record<string, string | number | undefined> = {}): Promise<T[]> {
    const out: T[] = [];
    for (let skip = 0; ; skip += this.o.pageSize) {
      const page = parse(listSchema, await this.request(version, path, { ...query, take: this.o.pageSize, skip }), path) as T[];
      out.push(...page);
      if (page.length < this.o.pageSize) break;
    }
    return out;
  }

  getStores() {
    return this.list<StStore>(1, "stores", { display: "full" });
  }
  getSeasons() {
    return this.list<StSeason>(1, "seasons", { display: "full" });
  }
  getBrands() {
    return this.list<StBrand>(1, "brands", { display: "full" });
  }
  getCategories() {
    return this.list<StCategory>(1, "categories", { display: "full" });
  }
  getColors() {
    return this.list<StColor>(1, "colors", { display: "full" });
  }
  getSizeTables() {
    return this.list<StSizeTable>(1, "sizetables", { display: "full" });
  }
  getFilePresets() {
    return this.list<StPreset>(1, "file_presets");
  }
  getTextPresets() {
    return this.list<StPreset>(1, "text_presets");
  }
  getWashInstructions() {
    return this.list<StWashInstruction>(2, "wash_instructions");
  }

  async getProducts(q: ProductQuery): Promise<StProduct[]> {
    const body = await this.request(1, "products", q as Record<string, string | number | undefined>);
    return parse(productsSchema, body, "products") as unknown as StProduct[];
  }

  async getStock(uid8s: string[], stores?: string[]): Promise<StStockRecord[]> {
    if (uid8s.length === 0) return [];
    const body = await this.request(1, "products", { ids: uid8s.join(","), detail: "stock", stores: stores?.join(","), take: this.o.pageSize });
    return parse(stockSchema, body, "products?detail=stock") as unknown as StStockRecord[];
  }

  async findCustomersByEmail(email: string): Promise<StCustomer[]> {
    const body = await this.request(1, "customers", { email });
    return parse(customersSchema, body, "customers") as unknown as StCustomer[];
  }

  async createCustomer(input: StCustomerInput): Promise<StCustomer> {
    const body = await this.request(1, "customers", {}, { method: "POST", body: input });
    return parse(customerSchema, body, "POST customers") as unknown as StCustomer;
  }

  async createDeliveryAddress(input: StDeliveryAddressInput): Promise<StDeliveryAddress> {
    const body = await this.request(1, "deliveryaddresses", {}, { method: "POST", body: input });
    return parse(deliveryAddressSchema, body, "POST deliveryaddresses") as unknown as StDeliveryAddress;
  }

  async createReservation(input: StReservationInput): Promise<StReservation> {
    const body = await this.request(1, "reservations", {}, { method: "POST", body: input });
    return parse(reservationSchema, body, "POST reservations") as unknown as StReservation;
  }

  async sendMessage(input: StMessageInput): Promise<StMessage> {
    const body = await this.request(1, "messages", {}, { method: "POST", body: input });
    return parse(messageSchema, body, "POST messages") as unknown as StMessage;
  }

  /** Vorbereitet (D10.6.6): GET cheques?cheque=&checksum=; nicht claimed und im Gültigkeitszeitraum */
  async validateCheque(cheque: string, checksum: string): Promise<StCheque | null> {
    const body = (await this.request(1, "cheques", { cheque, checksum })) as StCheque[] | null;
    const c = Array.isArray(body) ? body[0] : null;
    if (!c) return null;
    const claimed = c.claimed === true || c.claimed === 1;
    return claimed ? null : c;
  }
}
