/**
 * Lokaler Demo-Server: alle Edge Functions unter http://127.0.0.1:54331/functions/v1/<name>
 * mit PGlite (Postgres als WebAssembly, ohne Docker) und denselben Migrationen.
 * Plant selbst, was in Supabase pg_cron erledigt (Delta-Abgleich, Outbox).
 *
 *   npm run dev:api        (liest ../../.env)
 *
 * Nur für die Entwicklung und die lokale Demo. In Supabase laufen die Functions
 * mit SUPABASE_DB_URL gegen Postgres (siehe _shared/ctx.ts).
 */
import { PGlite } from "npm:@electric-sql/pglite@0.5.8";
import type { Db, Row } from "../_shared/db.ts";
import { normalizeParam } from "../_shared/db.ts";
import { buildCtx, setCtxFactory, getCtx } from "../_shared/ctx.ts";
import { syncFull, syncDelta } from "../_shared/catalog/sync.ts";
import { processOutbox } from "../_shared/outbox.ts";

const PORT = Number(Deno.env.get("DEV_API_PORT") ?? 54331);
const root = new URL("../../", import.meta.url);
const dataDir = decodeURIComponent(new URL("../.demo-db/", root).pathname);
const fresh = Deno.args.includes("--neu");

if (fresh) await Deno.remove(dataDir, { recursive: true }).catch(() => undefined);
// deno-lint-ignore no-explicit-any
type Pg = any;
const pg: Pg = new PGlite(dataDir);
await pg.waitReady;

function wrap(conn: Pg): Db {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const r = await conn.query(sql, params.map(normalizeParam));
      return r.rows as T[];
    },
    tx<R>(fn: (db: Db) => Promise<R>) {
      return conn.transaction((tx: Pg) => fn(wrap(tx)));
    },
  };
}
const db = wrap(pg);

// Migrationen (ohne die pg_cron-Datei, die lokal übersprungen wird)
await db.query(`create table if not exists _migrationen (name text primary key, at timestamptz default now())`);
const migDir = new URL("migrations/", root);
const files = [...Deno.readDirSync(migDir)].map((e) => e.name).filter((n) => n.endsWith(".sql")).sort();
for (const name of files) {
  const done = await db.query<Row>(`select 1 from _migrationen where name = $1`, [name]);
  if (done.length) continue;
  const sql = await Deno.readTextFile(new URL(name, migDir));
  if (sql.includes("lokal-ueberspringen")) {
    await db.query(`insert into _migrationen (name) values ($1)`, [name]);
    continue;
  }
  await pg.exec(sql);
  await db.query(`insert into _migrationen (name) values ($1)`, [name]);
  console.log(`Migration: ${name}`);
}

setCtxFactory(async () => buildCtx(db));

const names = ["stock", "reserve", "checkout", "payment-webhook", "demo-payment", "order-status", "forms", "demo-mail", "catalog-export", "sync-full", "sync-delta", "outbox", "rebuild", "retention", "order-ready"];
const handlers = new Map<string, (req: Request) => Promise<Response>>();
for (const n of names) {
  const mod = await import(`../${n}/handler.ts`);
  handlers.set(n, mod.handler);
}

// Erstbefüllung: Katalog aus den Fixtures (wie der nächtliche Abgleich)
const ctx = await getCtx();
const hatArtikel = await db.query<Row>(`select 1 from articles limit 1`);
if (!hatArtikel.length || fresh) {
  const r = await syncFull(ctx);
  console.log(`Abgleich: ${r.ok ? "ok" : "FEHLER"}, ${r.pages} Seiten, ${r.changes} Artikel, ${r.apiCalls} API-Aufrufe`, r.errors.slice(0, 3));
}

// Zeitpläne wie pg_cron (lokal ohne Zeitfenster)
setInterval(() => void syncDelta(ctx).catch((e) => console.error("delta:", e.message)), 10 * 60000);
setInterval(() => void processOutbox(ctx).then((r) => (r.done || r.retried || r.failed) && console.log("outbox:", r)).catch((e) => console.error("outbox:", e.message)), 60000);

Deno.serve({ port: PORT, hostname: "127.0.0.1", onListen: () => console.log(`Functions: http://127.0.0.1:${PORT}/functions/v1/<name>`) }, async (req) => {
  const url = new URL(req.url);
  // Nur lokal: Tabellen ansehen, z. B. /_dev/tabelle?name=mock_st_messages
  if (url.pathname === "/_dev/tabelle") {
    const name = url.searchParams.get("name") ?? "";
    const erlaubt = ["orders", "outbox", "mail_log", "requests", "holds", "sync_runs", "app_state", "mock_st_customers", "mock_st_delivery_addresses", "mock_st_reservations", "mock_st_messages", "mock_st_stock_adjust", "mock_payments"];
    if (!erlaubt.includes(name)) return new Response("Tabelle nicht erlaubt", { status: 400 });
    const rows = await db.query(`select * from ${name} order by 1 desc limit 50`);
    return new Response(JSON.stringify(rows, null, 2), { headers: { "content-type": "application/json; charset=utf-8" } });
  }
  const m = /^\/functions\/v1\/([a-z-]+)\/?$/.exec(url.pathname);
  const h = m ? handlers.get(m[1]) : undefined;
  if (!h) return new Response("Nicht gefunden", { status: 404 });
  const t0 = performance.now();
  try {
    const res = await h(req);
    console.log(`${req.method} ${m![1]} ${res.status} ${Math.round(performance.now() - t0)} ms`);
    return res;
  } catch (e) {
    console.error(`${m![1]}:`, e);
    return new Response("Interner Fehler", { status: 500 });
  }
});
