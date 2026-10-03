/**
 * Datenbankzugriff mit reinem SQL ($1-Parameter). Zwei Umsetzungen derselben
 * Schnittstelle: Postgres (postgres.js über SUPABASE_DB_URL, in Supabase) und
 * PGlite (lokaler Demo-Server, siehe _dev/serve.ts). So läuft exakt dasselbe SQL.
 */
export type Row = Record<string, unknown>;

export interface Db {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Alle Aufrufe in fn laufen in einer Transaktion */
  tx<R>(fn: (db: Db) => Promise<R>): Promise<R>;
}

type PgSql = {
  unsafe: (q: string, p?: unknown[]) => Promise<Row[]>;
  begin: <R>(fn: (s: PgSql) => Promise<R>) => Promise<R>;
};

function wrapPostgres(sql: PgSql): Db {
  return {
    async query<T>(q: string, params: unknown[] = []) {
      const rows = await sql.unsafe(q, params.map(normalizeParam));
      return [...rows] as T[];
    },
    tx<R>(fn: (db: Db) => Promise<R>) {
      return sql.begin((s) => fn(wrapPostgres(s)));
    },
  };
}

/** JS-Werte für $n: Objekte und Arrays als JSON (im SQL mit ::jsonb gecastet) */
export function normalizeParam(v: unknown): unknown {
  if (v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === "object") return JSON.stringify(v);
  return v;
}

let pg: Db | null = null;
export async function createPostgresDb(url: string): Promise<Db> {
  if (pg) return pg;
  const { default: postgres } = await import("npm:postgres@3.4.9");
  // Supabase: Transaktions-Pooler (Port 6543) braucht prepare: false
  const sql = postgres(url, { prepare: false, max: 4, idle_timeout: 20, connect_timeout: 10 }) as unknown as PgSql;
  pg = wrapPostgres(sql);
  return pg;
}

/** Hilfe: Zahl aus numeric (kommt je nach Treiber als string) */
export const num = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0));
/** Cent aus numeric(10,2) */
export const cents = (v: unknown): number => Math.round(num(v) * 100);
/** Datum (date) als YYYY-MM-DD, egal ob Date oder string */
export const isoDate = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};
