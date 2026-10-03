/**
 * MockSoftTouchClient (Briefing D10.8): dieselbe Schnittstelle wie der echte
 * Client, Daten aus den Fixtures (exakt im Format der Doku). Was die Demo
 * verändert (Kunden, Reservierungen, Bestand), liegt in Tabellen mock_st_*,
 * damit es über mehrere Function-Aufrufe hinweg gilt.
 * MOCK_FAIL_RATE (0 bis 1) lässt Aufrufe gezielt mit HTTP 500 scheitern.
 */
import type { Db } from "../db.ts";
import { SoftTouchError, type SoftTouchClient } from "./client.ts";
import { loadFixtures } from "./fixtures.ts";
import { todayInLux } from "../hours.ts";
import type {
  ProductQuery,
  StCustomer,
  StCustomerInput,
  StDeliveryAddress,
  StDeliveryAddressInput,
  StMessage,
  StMessageInput,
  StProduct,
  StReservation,
  StReservationInput,
  StStockRecord,
} from "./types.ts";

export interface MockOptions {
  failRate: number;
  now?: () => Date;
}

type Adjust = { delta: number; updated: number };

export class MockSoftTouchClient implements SoftTouchClient {
  readonly account = "demo";
  calls = 0;
  private db: Db;
  private o: MockOptions;

  constructor(db: Db, o: MockOptions) {
    this.db = db;
    this.o = o;
  }

  private now() {
    return this.o.now ? this.o.now() : new Date();
  }

  private call() {
    this.calls++;
    if (this.o.failRate > 0 && Math.random() < this.o.failRate) {
      throw new SoftTouchError("Mock: HTTP 500 (MOCK_FAIL_RATE)", 500, true);
    }
  }

  private fx() {
    return loadFixtures(todayInLux(this.now()));
  }

  private async adjustments(): Promise<Map<string, Adjust>> {
    const rows = await this.db.query<{ key14: string; delta: number; updated: string }>(
      `select key14, delta::int as delta, (extract(epoch from updated_at) * 1000)::float8::text as updated from mock_st_stock_adjust`,
    );
    return new Map(rows.map((r) => [r.key14, { delta: Number(r.delta), updated: Number(r.updated) }]));
  }

  private apply(p: StProduct, adj: Map<string, Adjust>): StProduct {
    const a = adj.get(String(p.key));
    if (!a) return p;
    const ts = new Date(a.updated);
    const stamp = `${ts.toISOString().slice(0, 10)} ${ts.toISOString().slice(11, 19)}`;
    return { ...p, stock: Math.max(0, p.stock + a.delta), timestamp: stamp > p.timestamp ? stamp : p.timestamp };
  }

  async getStores() {
    this.call();
    return this.fx().stores;
  }
  async getSeasons() {
    this.call();
    return this.fx().seasons;
  }
  async getBrands() {
    this.call();
    return this.fx().brands;
  }
  async getCategories() {
    this.call();
    return this.fx().categories;
  }
  async getColors() {
    this.call();
    return this.fx().colors;
  }
  async getSizeTables() {
    this.call();
    return this.fx().sizetables;
  }
  async getFilePresets() {
    this.call();
    return this.fx().filePresets;
  }
  async getTextPresets() {
    this.call();
    return this.fx().textPresets;
  }
  async getWashInstructions() {
    this.call();
    return this.fx().washInstructions;
  }

  async getProducts(q: ProductQuery): Promise<StProduct[]> {
    this.call();
    const adj = await this.adjustments();
    let list = this.fx().products.map((p) => this.apply(p, adj));
    const channelField = (ch: number) => (ch === 1 ? "online" : `online${ch}`);
    if (q.online) list = list.filter((p) => Number((p as unknown as Record<string, unknown>)[channelField(q.online!)]) === 1);
    if (q.ids) {
      const ids = q.ids.split(",").map((s) => s.trim());
      list = list.filter((p) => ids.some((id) => String(p.key).startsWith(id)));
    }
    if (q.stores) {
      const stores = q.stores.split(",").map((s) => s.trim().padStart(2, "0"));
      list = list.filter((p) => stores.includes(p.store));
    }
    if (q.updated_since_minutes) {
      const since = new Date(this.now().getTime() - q.updated_since_minutes * 60000);
      const stamp = `${since.toISOString().slice(0, 10)} ${since.toISOString().slice(11, 19)}`;
      list = list.filter((p) => p.timestamp >= stamp);
    }
    list.sort((a, b) => a.key - b.key);
    const skip = q.skip ?? 0;
    const take = Math.min(q.take ?? 100, 500);
    const page = list.slice(skip, skip + take);
    if (q.detail === "stock") return page.map((p) => ({ key: p.key, edi: p.edi, store: p.store, stock: p.stock })) as unknown as StProduct[];
    return page;
  }

  async getStock(uid8s: string[], stores?: string[]): Promise<StStockRecord[]> {
    if (uid8s.length === 0) return [];
    return (await this.getProducts({ ids: uid8s.join(","), detail: "stock", stores: stores?.join(","), take: 500 })) as unknown as StStockRecord[];
  }

  async findCustomersByEmail(email: string): Promise<StCustomer[]> {
    this.call();
    const rows = await this.db.query<{ id: number; data: Record<string, unknown> }>(
      `select id::int as id, data from mock_st_customers where account = $1 and lower(data->>'email') = lower($2) order by id`,
      [this.account, email],
    );
    return rows.map((r) => ({ key: Number(r.id), ...r.data }) as StCustomer);
  }

  async createCustomer(input: StCustomerInput): Promise<StCustomer> {
    this.call();
    if (!input.name) throw new SoftTouchError("Mock: name is required", 400, false);
    const rows = await this.db.query<{ id: number }>(`insert into mock_st_customers (account, data) values ($1, $2::jsonb) returning id::int as id`, [this.account, input]);
    return { key: Number(rows[0].id), active: true, ...input } as unknown as StCustomer;
  }

  async createDeliveryAddress(input: StDeliveryAddressInput): Promise<StDeliveryAddress> {
    this.call();
    const c = await this.db.query(`select 1 from mock_st_customers where id = $1`, [input.customer]);
    if (c.length === 0) throw new SoftTouchError("Mock: customer not found", 400, false);
    const rows = await this.db.query<{ id: number }>(`insert into mock_st_delivery_addresses (account, data) values ($1, $2::jsonb) returning id::int as id`, [this.account, input]);
    return { key: Number(rows[0].id), ...input };
  }

  async createReservation(input: StReservationInput): Promise<StReservation> {
    this.call();
    const c = await this.db.query(`select 1 from mock_st_customers where id = $1`, [input.customer_id]);
    if (c.length === 0) throw new SoftTouchError("Mock: customer_id does not exist", 400, false);
    const products = new Map(this.fx().products.map((p) => [String(p.key), p]));
    for (const it of input.items) {
      if (!products.has(String(it.product_uid))) throw new SoftTouchError(`Mock: product_uid ${it.product_uid} does not exist`, 400, false);
    }
    return this.db.tx(async (db) => {
      const next = await db.query<{ n: number }>(`select coalesce(max(key), 999100000)::bigint + 1 as n from mock_st_reservations`);
      const key = Number(next[0].n);
      const items = input.items.map((it, i) => {
        const p = products.get(String(it.product_uid))!;
        const unit = it.net_price ?? p.netto_price;
        return {
          key: i + 1,
          product_uid: Number(it.product_uid),
          quantity: it.quantity,
          unit_price: unit,
          discount: 0,
          price_to_pay: Math.round(unit * it.quantity * 100) / 100,
          description: `${p.detail2} [${p.detail1}] ${p.sizeXdescription}${p.sizeYdescription ? "/" + p.sizeYdescription : ""}`,
        };
      });
      const reservation: StReservation = {
        key,
        label_barcode: `${key}0`,
        store_id: input.store_id ?? "01",
        customer_id: input.customer_id,
        delivery_address_id: input.delivery_address_id ?? null,
        price_to_pay: Math.round(items.reduce((s, i) => s + i.price_to_pay, 0) * 100) / 100,
        processed: false,
        payment_id: input.payment_id ?? "",
        items,
      };
      await db.query(`insert into mock_st_reservations (key, account, data) values ($1, $2, $3::jsonb)`, [key, this.account, { ...reservation, remarks: input.remarks ?? "" }]);
      // Wie bei SoftTouch: Der Bestand sinkt sofort
      for (const it of input.items) {
        await db.query(
          `insert into mock_st_stock_adjust (key14, delta, updated_at) values ($1, $2, now())
           on conflict (key14) do update set delta = mock_st_stock_adjust.delta + excluded.delta, updated_at = now()`,
          [String(it.product_uid).padStart(14, "0"), -Math.abs(it.quantity)],
        );
      }
      return reservation;
    });
  }

  async sendMessage(input: StMessageInput): Promise<StMessage> {
    this.call();
    if (!input.message) throw new SoftTouchError("Mock: message is required", 400, false);
    const rows = await this.db.query<{ id: number }>(`insert into mock_st_messages (account, data) values ($1, $2::jsonb) returning id::int as id`, [this.account, input]);
    const now = this.now().toISOString();
    return { key: Number(rows[0].id), store: input.store ?? "", pos: input.pos ?? "", user: input.user ?? "", subject: input.subject, message: input.message, date: now.slice(0, 10), time: now.slice(11, 16), acknowledged: false };
  }

  /** Demo-Steuerung: ein Stück "im Laden verkaufen" (zeigt, wie es online verschwindet) */
  async simulateSale(key14: string, qty = 1) {
    await this.db.query(
      `insert into mock_st_stock_adjust (key14, delta, updated_at) values ($1, $2, now())
       on conflict (key14) do update set delta = mock_st_stock_adjust.delta + excluded.delta, updated_at = now()`,
      [key14, -Math.abs(qty)],
    );
  }
}
