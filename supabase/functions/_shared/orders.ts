/**
 * Bestellungen und Reservierungen (Tabelle orders): Typen, Laden, Nummern,
 * Ansicht für die Danke-Seite, Halte-Mengen.
 */
import type { Db } from "./db.ts";
import { cents, isoDate } from "./db.ts";
import type { HouseId, Mode, OrderStatus, OrderView } from "./contract.ts";
import type { Lang } from "./i18n.ts";
import { houseIds } from "./generated/config/houses.ts";

export interface Adresse {
  strasse: string;
  zusatz?: string;
  plz: string;
  ort: string;
  land: string;
}

export interface Kunde {
  vorname: string;
  name: string;
  email: string;
  mobil?: string;
  telefon?: string;
  bemerkung?: string;
  adresse?: Adresse;
  rechnung?: Adresse | null;
}

export interface OrderItem {
  key: string;
  uid8: string;
  marke: string;
  name: string;
  farbe: string;
  groesse: string;
  menge: number;
  /** Stückpreis in Cent (zum Zeitpunkt der Bestellung) */
  preis: number;
}

export interface Order {
  id: string;
  group_id: string;
  number: string;
  house_id: HouseId;
  mode: Mode;
  status: OrderStatus;
  customer: Kunde;
  items: OrderItem[];
  totals: { zwischensumme: number; versand: number; gesamt: number } | null;
  pickup_from: string | null;
  hold_until: string | null;
  payment_id: string | null;
  payment_url: string | null;
  st_customer_id: number | null;
  st_delivery_address_id: number | null;
  st_reservation_key: string | null;
  lang: Lang;
  created_at: string;
}

const COLS = `id::text, group_id::text, number, house_id, mode, status, customer, items, totals, pickup_from::text, hold_until::text,
  payment_id, payment_url, st_customer_id::float8 as st_customer_id, st_delivery_address_id::float8 as st_delivery_address_id, st_reservation_key, lang, created_at::text`;

function norm(r: Record<string, unknown>): Order {
  return {
    ...(r as unknown as Order),
    pickup_from: isoDate(r.pickup_from),
    hold_until: isoDate(r.hold_until),
    st_customer_id: r.st_customer_id === null || r.st_customer_id === undefined ? null : Number(r.st_customer_id),
    st_delivery_address_id: r.st_delivery_address_id === null || r.st_delivery_address_id === undefined ? null : Number(r.st_delivery_address_id),
  };
}

export async function ordersByGroup(db: Db, groupId: string): Promise<Order[]> {
  const rows = await db.query(`select ${COLS} from orders where group_id = $1::uuid and anonymized_at is null`, [groupId]);
  // Reihenfolge der Häuser wie überall auf der Seite (Konfiguration), nicht alphabetisch
  const order = (h: string) => houseIds.indexOf(h as HouseId);
  return rows.map(norm).sort((a, b) => order(a.house_id) - order(b.house_id));
}

export async function orderById(db: Db, id: string): Promise<Order | null> {
  const rows = await db.query(`select ${COLS} from orders where id = $1::uuid`, [id]);
  return rows[0] ? norm(rows[0]) : null;
}

export async function orderByPayment(db: Db, paymentId: string): Promise<Order | null> {
  const rows = await db.query(`select ${COLS} from orders where payment_id = $1`, [paymentId]);
  return rows[0] ? norm(rows[0]) : null;
}

export async function orderByReservation(db: Db, key: string): Promise<Order | null> {
  const rows = await db.query(`select ${COLS} from orders where st_reservation_key = $1`, [key]);
  return rows[0] ? norm(rows[0]) : null;
}

/** Lesbare Bestellnummer, z. B. W-261002-4821 */
export async function newNumber(db: Db, today: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const n = `W-${today.slice(2).replace(/-/g, "")}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const exists = await db.query(`select 1 from orders where number = $1`, [n]);
    if (exists.length === 0) return n;
  }
  return `W-${crypto.randomUUID().slice(0, 8)}`;
}

export async function setStatus(db: Db, id: string, status: OrderStatus, extra: Record<string, unknown> = {}) {
  const sets = ["status = $2", "updated_at = now()"];
  const params: unknown[] = [id, status];
  for (const [k, v] of Object.entries(extra)) {
    params.push(v);
    sets.push(`${k} = $${params.length}`);
  }
  await db.query(`update orders set ${sets.join(", ")} where id = $1::uuid`, params);
}

export function adresseText(a?: Adresse | null): string {
  if (!a) return "";
  return [a.strasse, a.zusatz, `${a.plz} ${a.ort}`, a.land].filter(Boolean).join(", ");
}

export function toView(o: Order, paymentUrl: string | null = null): OrderView {
  return {
    id: o.id,
    number: o.number,
    house: o.house_id,
    mode: o.mode,
    status: o.status,
    reservationNo: o.st_reservation_key,
    pickupFrom: o.pickup_from,
    holdUntil: o.hold_until,
    items: o.items.map((i) => ({ key: i.key, marke: i.marke, name: i.name, farbe: i.farbe, groesse: i.groesse, menge: i.menge, preis: i.preis })),
    totals: o.totals,
    email: o.customer.email,
    address: o.mode === "ship" ? adresseText(o.customer.adresse) : null,
    paymentUrl,
  };
}

/** Aktive Halte-Mengen je Schlüssel (laufende Zahlungen, D10.6) */
export async function activeHolds(db: Db, keys: string[], excludeOrder?: string): Promise<Map<string, number>> {
  if (keys.length === 0) return new Map();
  const rows = await db.query<{ key14: string; qty: number }>(
    `select key14, sum(qty)::int as qty from holds
      where expires_at > now() and key14 in (select jsonb_array_elements_text($1::jsonb))
        and ($2::uuid is null or order_id <> $2::uuid)
      group by key14`,
    [keys, excludeOrder ?? null],
  );
  return new Map(rows.map((r) => [r.key14, Number(r.qty)]));
}

export async function releaseHolds(db: Db, orderId: string) {
  await db.query(`delete from holds where order_id = $1::uuid`, [orderId]);
}

/** Produktdaten für Positionen (Marke, Name, Farbe, Größe, Preis) aus der Datenbank */
export async function itemInfo(db: Db, keys: string[]): Promise<Map<string, Omit<OrderItem, "menge">>> {
  if (keys.length === 0) return new Map();
  const rows = await db.query<Record<string, unknown>>(
    `select s.key14, s.uid8, s.size_x_label, s.size_y_label, s.netto_price, s.house_id, a.detail2, a.detail1, a.colorbrand, a.brand_id,
            coalesce(nullif(b.data->>'alias', ''), b.data->>'name', a.brand_id) as marke
       from skus s join articles a on a.uid8 = s.uid8
       left join st_brands b on b.key = a.brand_id and b.account = a.account
      where s.key14 in (select jsonb_array_elements_text($1::jsonb))`,
    [keys],
  );
  const m = new Map<string, Omit<OrderItem, "menge">>();
  for (const r of rows) {
    const farbe = /^\s*\S+\s+-\s+(.+)$/.exec(String(r.colorbrand ?? ""))?.[1] ?? String(r.colorbrand ?? "");
    const y = String(r.size_y_label ?? "");
    m.set(String(r.key14), {
      key: String(r.key14),
      uid8: String(r.uid8),
      marke: String(r.marke ?? ""),
      name: String(r.detail2 || r.detail1 || ""),
      farbe: farbe.trim(),
      groesse: y ? `${r.size_x_label}/${y}` : String(r.size_x_label ?? ""),
      preis: cents(r.netto_price),
    });
  }
  return m;
}
