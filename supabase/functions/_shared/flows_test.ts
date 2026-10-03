/**
 * Durchgehende Tests der Functions mit PGlite (Postgres im Speicher) und dem
 * MockSoftTouchClient: Reservierung über zwei Häuser, Kauf mit Mock-Zahlung,
 * "inzwischen verkauft" (nachpruefen), SoftTouch-Ausfall mit Outbox.
 *   deno test --config supabase/functions/deno.json --allow-all supabase/functions/_shared/
 */
import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { PGlite } from "npm:@electric-sql/pglite@0.5.8";
import type { Db, Row } from "./db.ts";
import { normalizeParam } from "./db.ts";

const ENV: Record<string, string> = {
  SITE_URL: "http://127.0.0.1:4321",
  PUBLIC_DEMO: "true",
  PUBLIC_FEATURE_RESERVE: "true",
  PUBLIC_FEATURE_PAY_COLLECT: "true",
  PUBLIC_FEATURE_PAY_SHIP: "true",
  SOFTTOUCH_MODE: "mock",
  MOCK_FAIL_RATE: "0",
  MAIL_MODE: "log",
  PAYMENT_PROVIDER: "mock",
  ST_STORES_LANNERS: "01",
  ST_STORES_JAGER: "02",
  MAIL_TO_LANNERS: "lanners@demo.invalid",
  MAIL_TO_JAGER: "jager@demo.invalid",
  ALERT_RECIPIENT: "alarm@demo.invalid",
  ORDER_TOKEN_SECRET: "test-secret",
  RATE_LIMIT_SALT: "test-salt",
};
for (const [k, v] of Object.entries(ENV)) Deno.env.set(k, v);

// erst nach den Umgebungsvariablen laden
const { buildCtx, setCtxFactory } = await import("./ctx.ts");
const { syncFull } = await import("./catalog/sync.ts");
const { processOutbox } = await import("./outbox.ts");
const { verifyGroupToken, groupToken } = await import("./security.ts");
const { pickupWindow, todayInLux } = await import("./hours.ts");
const hours = (await import("./generated/content/oeffnungszeiten.json", { with: { type: "json" } })).default;
const reserve = (await import("../reserve/handler.ts")).handler;
const checkout = (await import("../checkout/handler.ts")).handler;
const demoPayment = (await import("../demo-payment/handler.ts")).handler;
const orderStatus = (await import("../order-status/handler.ts")).handler;

// deno-lint-ignore no-explicit-any
type Pg = any;
function wrap(conn: Pg): Db {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      return (await conn.query(sql, params.map(normalizeParam))).rows as T[];
    },
    tx<R>(fn: (db: Db) => Promise<R>) {
      return conn.transaction((tx: Pg) => fn(wrap(tx)));
    },
  };
}

async function neueDb(): Promise<Db> {
  const pg = new PGlite();
  await pg.waitReady;
  const dir = new URL("../../migrations/", import.meta.url);
  for (const name of [...Deno.readDirSync(dir)].map((e) => e.name).filter((n) => n.endsWith(".sql")).sort()) {
    const sql = await Deno.readTextFile(new URL(name, dir));
    if (!sql.includes("lokal-ueberspringen")) await pg.exec(sql);
  }
  const db = wrap(pg);
  setCtxFactory(async () => buildCtx(db));
  const r = await syncFull(buildCtx(db));
  assert(r.ok, `Abgleich: ${r.errors.join(", ")}`);
  return db;
}

const form = (fields: Record<string, string>) => new URLSearchParams(fields).toString();
const post = (fn: (r: Request) => Promise<Response>, path: string, fields: Record<string, string>, ip = "10.0.0.1") =>
  fn(new Request(`http://127.0.0.1:54331/functions/v1/${path}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": ip }, body: form(fields) }));
const ab = (haus: "lanners" | "jager") => pickupWindow((hours as never)[haus], todayInLux(), 14).min;

/** zwei verfügbare Größen der Liddesdale-Jacke, eine je Haus */
async function zweiHaeuser(db: Db): Promise<[string, string]> {
  const rows = await db.query<{ key14: string; house_id: string }>(`select key14, house_id from skus where uid8 = '41010301' and stock > 1 order by key14`);
  const l = rows.find((r) => r.house_id === "lanners")!.key14;
  const j = rows.find((r) => r.house_id === "jager")!.key14;
  return [l, j];
}

/** PGlite arbeitet mit eigenen Timern; die Prüfung auf offene Timer passt hier nicht */
const test = (name: string, fn: () => Promise<void>) => Deno.test({ name, fn, sanitizeOps: false, sanitizeResources: false });

const kontakt = { vorname: "Test", name: "Demokonto", email: "kunde@demo.invalid", mobil: "621 123 456", telefon: "621 123 456", einwilligung: "1", lang: "de", website: "", _t: "" };

test("Reservierung über zwei Häuser: zwei Bestellungen, PRINT RESERVATION, drei Mails", async () => {
  const db = await neueDb();
  const [l, j] = await zweiHaeuser(db);
  const res = await post(reserve, "reserve", { ...kontakt, positionen: JSON.stringify([{ key: l, menge: 1 }, { key: j, menge: 1 }]), abholung_lanners: ab("lanners"), abholung_jager: ab("jager") });
  assertEquals(res.status, 303);
  const loc = new URL(res.headers.get("location")!);
  assertMatch(loc.pathname, /^\/de\/reservieren\/danke\/$/);
  const g = loc.searchParams.get("g")!;
  assert(await verifyGroupToken(g, loc.searchParams.get("t")!));

  const orders = await db.query<{ house_id: string; status: string; st_reservation_key: string | null }>(`select house_id, status, st_reservation_key from orders where group_id = $1::uuid`, [g]);
  assertEquals(orders.length, 2);
  assert(orders.every((o) => o.status === "reserved" && o.st_reservation_key));
  assertEquals((await db.query<Row>(`select 1 from mock_st_messages where data->>'subject' = 'PRINT RESERVATION'`)).length, 2);
  assertEquals((await db.query<Row>(`select 1 from mail_log`)).length, 3);

  // Bestätigungsseite liest den Status nur mit gültigem Token
  const ok = await orderStatus(new Request(`http://x/order-status?g=${g}&t=${loc.searchParams.get("t")}`, { headers: { origin: ENV.SITE_URL } }));
  assertEquals(ok.status, 200);
  const falsch = await orderStatus(new Request(`http://x/order-status?g=${g}&t=${await groupToken(crypto.randomUUID())}`));
  assertEquals(falsch.status, 403);
});

test("Kauf mit Abholung: Mock-Zahlung, Reservierung mit payment_id, Mails", async () => {
  const db = await neueDb();
  const [l] = await zweiHaeuser(db);
  const res = await post(checkout, "checkout", { ...kontakt, haus: "lanners", modus: "collect", abholung: ab("lanners"), positionen: JSON.stringify([{ key: l, menge: 1 }]) });
  assertEquals(res.status, 303);
  const zahlung = new URL(res.headers.get("location")!);
  const p = zahlung.searchParams.get("p")!;
  const g = zahlung.searchParams.get("g")!;
  const t = zahlung.searchParams.get("t")!;
  const fertig = await post(demoPayment, "demo-payment", { lang: "de", p, g, t, aktion: "erfolg" });
  assertEquals(fertig.status, 303);
  const [o] = await db.query<{ status: string; st_reservation_key: string | null }>(`select status, st_reservation_key from orders where group_id = $1::uuid`, [g]);
  assertEquals(o.status, "paid");
  const [r] = await db.query<{ data: { payment_id: string } }>(`select data from mock_st_reservations where key = $1`, [Number(o.st_reservation_key)]);
  assertEquals(r.data.payment_id, p);
});

test("Bezahlt, aber inzwischen verkauft: nachpruefen, keine Reservierung", async () => {
  const db = await neueDb();
  const [l] = await zweiHaeuser(db);
  const res = await post(checkout, "checkout", { ...kontakt, haus: "lanners", modus: "collect", abholung: ab("lanners"), positionen: JSON.stringify([{ key: l, menge: 1 }]) }, "10.0.0.2");
  const u = new URL(res.headers.get("location")!);
  await post(demoPayment, "demo-payment", { lang: "de", p: u.searchParams.get("p")!, g: u.searchParams.get("g")!, t: u.searchParams.get("t")!, aktion: "verkauft" });
  const [o] = await db.query<{ status: string; st_reservation_key: string | null }>(`select status, st_reservation_key from orders where group_id = $1::uuid`, [u.searchParams.get("g")]);
  assertEquals(o.status, "nachpruefen");
  assertEquals(o.st_reservation_key, null);
  assertEquals((await db.query<Row>(`select 1 from mail_log where kind = 'nachpruefen_kunde'`)).length, 1);
});

test("SoftTouch fällt aus: Reservierung angenommen, Outbox trägt sie nach", async () => {
  const db = await neueDb();
  const [l] = await zweiHaeuser(db);
  Deno.env.set("MOCK_FAIL_RATE", "1");
  setCtxFactory(async () => buildCtx(db));
  const res = await post(reserve, "reserve", { ...kontakt, positionen: JSON.stringify([{ key: l, menge: 1 }]), abholung_lanners: ab("lanners") }, "10.0.0.3");
  assertEquals(res.status, 303);
  const g = new URL(res.headers.get("location")!).searchParams.get("g");
  let [o] = await db.query<{ status: string }>(`select status from orders where group_id = $1::uuid`, [g]);
  assertEquals(o.status, "queued");
  assertEquals((await db.query<Row>(`select 1 from outbox where done_at is null`)).length, 1);

  // SoftTouch wieder da: der nächste Lauf trägt nach
  Deno.env.set("MOCK_FAIL_RATE", "0");
  await db.query(`update outbox set next_attempt_at = now() - interval '1 minute'`);
  const r = await processOutbox(buildCtx(db));
  assertEquals(r.done, 1);
  [o] = await db.query<{ status: string }>(`select status from orders where group_id = $1::uuid`, [g]);
  assertEquals(o.status, "reserved");
});

test("Honeypot: Weiterleitung ohne Bestellung", async () => {
  const db = await neueDb();
  const [l] = await zweiHaeuser(db);
  const res = await post(reserve, "reserve", { ...kontakt, website: "http://spam.example", positionen: JSON.stringify([{ key: l, menge: 1 }]), abholung_lanners: ab("lanners") }, "10.0.0.4");
  assertEquals(res.status, 303);
  assertEquals((await db.query<Row>(`select 1 from orders`)).length, 0);
});
