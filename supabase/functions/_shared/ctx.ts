/**
 * Laufzeit-Kontext der Functions: Datenbank, SoftTouch-Clients je Haus,
 * Zahlungsanbieter je Haus, Mailversand. In Supabase über SUPABASE_DB_URL,
 * im lokalen Demo-Server (_dev/serve.ts) mit PGlite (setCtxFactory).
 */
import { createPostgresDb, type Db } from "./db.ts";
import { env, envReq, functionsBase, siteUrl } from "./env.ts";
import { houses, type HouseId } from "./generated/config/houses.ts";
import { softtouch } from "./generated/config/softtouch.ts";
import type { SoftTouchClient } from "./softtouch/client.ts";
import { HttpSoftTouchClient } from "./softtouch/http.ts";
import { MockSoftTouchClient } from "./softtouch/mock.ts";
import type { PaymentProvider } from "./payment/provider.ts";
import { MockPaymentProvider } from "./payment/mock.ts";
import { MollieProvider } from "./payment/mollie.ts";
import { LogMailer, SmtpMailer, type Mailer } from "./mail/mailer.ts";

export interface HouseConn {
  house: HouseId;
  client: SoftTouchClient;
  /** Filial-IDs dieses Hauses */
  stores: string[];
  /** POS für Web-Reservierungen (OP-04.11), sonst Standard des Kontos */
  pos?: string;
}

export interface AccountGroup {
  client: SoftTouchClient;
  houses: HouseId[];
  stores: string[];
}

export interface Ctx {
  db: Db;
  mode: "mock" | "http";
  conn(house: HouseId): HouseConn;
  /** Jedes Konto nur einmal, auch wenn beide Häuser darauf zeigen (D10.1) */
  accounts(): AccountGroup[];
  storeToHouse: Record<string, HouseId>;
  channel: number;
  pay(house: HouseId): PaymentProvider;
  mail: Mailer;
  /** Empfänger der Mails an ein Haus */
  mailTo(house: HouseId): string;
  siteUrl: string;
  functionsUrl: string;
  now(): Date;
}

export function storesOf(house: HouseId): string[] {
  const h = houses.find((x) => x.id === house)!;
  const v = env(h.softtouch.stores);
  return (v ? v.split(",") : h.softtouch.demoStoreIds).map((s) => s.trim().padStart(2, "0")).filter(Boolean);
}

export function buildCtx(db: Db, opts: { now?: () => Date } = {}): Ctx {
  const mode = (env("SOFTTOUCH_MODE") ?? "mock") === "http" ? "http" : "mock";
  const conns = new Map<HouseId, HouseConn>();
  const byAccount = new Map<string, SoftTouchClient>();
  const mock = mode === "mock" ? new MockSoftTouchClient(db, { failRate: Number(env("MOCK_FAIL_RATE") ?? 0), now: opts.now }) : null;

  for (const h of houses) {
    let client: SoftTouchClient;
    if (mock) client = mock;
    else {
      const accountId = envReq(h.softtouch.account);
      const existing = byAccount.get(accountId);
      client =
        existing ??
        new HttpSoftTouchClient({ apiBase: softtouch.apiBase, accountId, token: envReq(h.softtouch.token), timeoutMs: softtouch.requestTimeoutMs, pageSize: softtouch.pageSize });
      byAccount.set(accountId, client);
    }
    conns.set(h.id, { house: h.id, client, stores: storesOf(h.id), pos: env(`ST_POS_${h.id.toUpperCase()}`) });
  }

  const storeToHouse: Record<string, HouseId> = {};
  for (const c of conns.values()) for (const s of c.stores) storeToHouse[s] = c.house;

  const pays = new Map<HouseId, PaymentProvider>();
  const provider = env("PAYMENT_PROVIDER") ?? "mock";
  const mockPay = new MockPaymentProvider(db);
  const pay = (house: HouseId): PaymentProvider => {
    if (provider !== "mollie") return mockPay;
    if (!pays.has(house)) pays.set(house, new MollieProvider(envReq(houses.find((h) => h.id === house)!.payment)));
    return pays.get(house)!;
  };

  return {
    db,
    mode,
    conn: (h) => conns.get(h)!,
    accounts() {
      const groups = new Map<SoftTouchClient, AccountGroup>();
      for (const c of conns.values()) {
        const g = groups.get(c.client) ?? { client: c.client, houses: [], stores: [] };
        g.houses.push(c.house);
        g.stores.push(...c.stores);
        groups.set(c.client, g);
      }
      return [...groups.values()];
    },
    storeToHouse,
    channel: Number(env("ST_ONLINE_CHANNEL") ?? softtouch.onlineChannel),
    pay,
    mail: (env("MAIL_MODE") ?? "log") === "smtp" ? new SmtpMailer() : new LogMailer(db),
    mailTo: (house) => env(houses.find((h) => h.id === house)!.mailTo) ?? `${house}@demo.invalid`,
    siteUrl: siteUrl(),
    functionsUrl: functionsBase(),
    now: opts.now ?? (() => new Date()),
  };
}

let factory: () => Promise<Ctx> = async () => buildCtx(await createPostgresDb(envReq("SUPABASE_DB_URL")));
let current: Promise<Ctx> | null = null;

export function setCtxFactory(f: () => Promise<Ctx>) {
  factory = f;
  current = null;
}

export function getCtx(): Promise<Ctx> {
  if (!current) current = factory();
  return current;
}
