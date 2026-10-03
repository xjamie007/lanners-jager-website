/**
 * Schreiben der transformierten Zeilen in Postgres. Massenweise über
 * jsonb_to_recordset (ein Statement je 1000 Zeilen statt Tausender Einzelaufrufe).
 */
import type { Db } from "../db.ts";
import type { ArticleRow, FileRow, SkuRow, TextRow } from "./transform.ts";

const CHUNK = 1000;
function* chunks<T>(list: T[], n = CHUNK): Generator<T[]> {
  for (let i = 0; i < list.length; i += n) yield list.slice(i, i + n);
}

export async function upsertMaster(db: Db, table: string, account: string, rows: Record<string, unknown>[], keyOf: (r: Record<string, unknown>) => string) {
  if (!/^st_[a-z_]+$/.test(table)) throw new Error("Ungültige Tabelle");
  for (const part of chunks(rows)) {
    await db.query(
      `insert into ${table} (account, key, data, updated_at)
       select $1, x.key, x.data, now() from jsonb_to_recordset($2::jsonb) as x(key text, data jsonb)
       on conflict (account, key) do update set data = excluded.data, updated_at = now()`,
      [account, part.map((r) => ({ key: keyOf(r), data: r }))],
    );
  }
}

export async function upsertArticles(db: Db, rows: ArticleRow[]) {
  for (const part of chunks(rows)) {
    await db.query(
      `insert into articles (uid8, id6, variant, account, brand_id, season_id, cat1, cat2, cat3, cat4, cat5, cat6, cat7,
          detail1, detail2, detail3, detail4, detail5, description1, color_id, colorbrand, size_table_id, online, status,
          in_the_picture, online_sort, first_delivery, last_delivery, expected_delivery, related, wash_instructions, slug,
          st_timestamp, online_since, offline_since, updated_at)
       select x.uid8, x.id6, x.variant, x.account, x.brand_id, x.season_id, x.cat1, x.cat2, x.cat3, x.cat4, x.cat5, x.cat6, x.cat7,
          x.detail1, x.detail2, x.detail3, x.detail4, x.detail5, x.description1, x.color_id, x.colorbrand, x.size_table_id, x.online, x.status,
          x.in_the_picture, x.online_sort, x.first_delivery, x.last_delivery, x.expected_delivery,
          array(select jsonb_array_elements_text(x.related)), array(select (jsonb_array_elements_text(x.wash_instructions))::int), x.slug,
          x.st_timestamp, case when x.online then now() end, case when x.online then null else now() end, now()
       from jsonb_to_recordset($1::jsonb) as x(uid8 text, id6 text, variant int, account text, brand_id text, season_id text,
          cat1 text, cat2 text, cat3 text, cat4 text, cat5 text, cat6 text, cat7 text, detail1 text, detail2 text, detail3 text,
          detail4 text, detail5 text, description1 text, color_id text, colorbrand text, size_table_id text, online boolean, status text,
          in_the_picture boolean, online_sort int, first_delivery date, last_delivery date, expected_delivery date, related jsonb,
          wash_instructions jsonb, slug jsonb, st_timestamp text)
       on conflict (uid8) do update set
          id6 = excluded.id6, variant = excluded.variant, account = excluded.account, brand_id = excluded.brand_id, season_id = excluded.season_id,
          cat1 = excluded.cat1, cat2 = excluded.cat2, cat3 = excluded.cat3, cat4 = excluded.cat4, cat5 = excluded.cat5, cat6 = excluded.cat6, cat7 = excluded.cat7,
          detail1 = excluded.detail1, detail2 = excluded.detail2, detail3 = excluded.detail3, detail4 = excluded.detail4, detail5 = excluded.detail5,
          description1 = excluded.description1, color_id = excluded.color_id, colorbrand = excluded.colorbrand, size_table_id = excluded.size_table_id,
          online = excluded.online, status = excluded.status, in_the_picture = excluded.in_the_picture, online_sort = excluded.online_sort,
          first_delivery = excluded.first_delivery, last_delivery = excluded.last_delivery, expected_delivery = excluded.expected_delivery,
          related = excluded.related, wash_instructions = excluded.wash_instructions, slug = excluded.slug, st_timestamp = excluded.st_timestamp,
          online_since = case when excluded.online and not articles.online then now() else coalesce(articles.online_since, case when excluded.online then now() end) end,
          offline_since = case when excluded.online then null when articles.online then now() else articles.offline_since end,
          updated_at = now()`,
      [part],
    );
  }
}

/** Gibt die Schlüssel zurück, deren Preis sich geändert hat (für den Rebuild) */
export async function upsertSkus(db: Db, rows: SkuRow[]): Promise<{ priceChanged: number }> {
  let priceChanged = 0;
  for (const part of chunks(rows)) {
    const r = await db.query<{ changed: boolean }>(
      `with x as (
         select * from jsonb_to_recordset($1::jsonb) as x(key14 text, uid8 text, size_x text, size_y text, size_x_label text, size_y_label text,
           store_id text, house_id text, stock int, backorder int, price numeric, netto_price numeric, discount_percentage numeric, vat numeric, edi text)
       ), old as (
         select s.key14, s.netto_price from skus s join x on x.key14 = s.key14
       ), up as (
         insert into skus (key14, uid8, size_x, size_y, size_x_label, size_y_label, store_id, house_id, stock, backorder, price, netto_price, discount_percentage, vat, edi, updated_at)
         select key14, uid8, size_x, size_y, size_x_label, size_y_label, store_id, house_id, stock, backorder, price, netto_price, discount_percentage, vat, edi, now() from x
         on conflict (key14) do update set uid8 = excluded.uid8, size_x = excluded.size_x, size_y = excluded.size_y, size_x_label = excluded.size_x_label,
           size_y_label = excluded.size_y_label, store_id = excluded.store_id, house_id = excluded.house_id, stock = excluded.stock, backorder = excluded.backorder,
           price = excluded.price, netto_price = excluded.netto_price, discount_percentage = excluded.discount_percentage, vat = excluded.vat, edi = excluded.edi, updated_at = now()
         returning key14
       )
       select (x.netto_price is distinct from old.netto_price) as changed from x left join old on old.key14 = x.key14`,
      [part],
    );
    priceChanged += r.filter((x) => x.changed).length;
  }
  return { priceChanged };
}

export async function replaceTexts(db: Db, uid8s: string[], rows: TextRow[]) {
  for (const part of chunks(uid8s)) await db.query(`delete from article_texts where uid8 in (select jsonb_array_elements_text($1::jsonb))`, [part]);
  for (const part of chunks(rows)) {
    await db.query(
      `insert into article_texts (uid8, type, lang, kind, sort, text)
       select uid8, type, lang, kind, sort, text from jsonb_to_recordset($1::jsonb) as x(uid8 text, type text, lang text, kind text, sort int, text text)`,
      [part],
    );
  }
}

/** Dateien ersetzen, dabei bereits gespiegelte Fotos (storage_path, sha256) behalten */
export async function replaceFiles(db: Db, uid8s: string[], rows: (FileRow & { storage_path?: string | null; width?: number | null; height?: number | null })[]) {
  const old = new Map<string, { storage_path: string | null; width: number | null; height: number | null; sha256: string | null }>();
  for (const part of chunks(uid8s)) {
    const r = await db.query<{ uid8: string; filename: string; storage_path: string | null; width: number | null; height: number | null; sha256: string | null }>(
      `select uid8, filename, storage_path, width, height, sha256 from article_files where uid8 in (select jsonb_array_elements_text($1::jsonb))`,
      [part],
    );
    for (const f of r) old.set(`${f.uid8}|${f.filename}`, f);
    await db.query(`delete from article_files where uid8 in (select jsonb_array_elements_text($1::jsonb))`, [part]);
  }
  const merged = rows.map((f) => {
    const o = old.get(`${f.uid8}|${f.filename}`);
    return { ...f, storage_path: f.storage_path ?? o?.storage_path ?? null, width: f.width ?? o?.width ?? null, height: f.height ?? o?.height ?? null, sha256: o?.sha256 ?? null };
  });
  for (const part of chunks(merged)) {
    await db.query(
      `insert into article_files (uid8, type, variant, sort, filename, role, fit, storage_path, width, height, sha256)
       select uid8, type, variant, sort, filename, role, fit, storage_path, width, height, sha256
       from jsonb_to_recordset($1::jsonb) as x(uid8 text, type text, variant int, sort int, filename text, role text, fit text, storage_path text, width int, height int, sha256 text)`,
      [part],
    );
  }
}

/** Mark-and-sweep: Was im Komplett-Abgleich nicht zurückkam, ist offline. Nur nach vollständigem Erfolg aufrufen. */
export async function markMissingOffline(db: Db, seen: string[]): Promise<number> {
  const r = await db.query<{ uid8: string }>(
    `update articles set online = false, offline_since = coalesce(offline_since, now()), updated_at = now()
     where online and uid8 not in (select jsonb_array_elements_text($1::jsonb)) returning uid8`,
    [seen],
  );
  return r.length;
}

export async function setOffline(db: Db, uid8s: string[]): Promise<number> {
  if (uid8s.length === 0) return 0;
  const r = await db.query<{ uid8: string }>(
    `update articles set online = false, offline_since = coalesce(offline_since, now()), updated_at = now()
     where online and uid8 in (select jsonb_array_elements_text($1::jsonb)) returning uid8`,
    [uid8s],
  );
  return r.length;
}

/** Täglicher Schnappschuss der Verkaufspreise (30-Tage-Angabe) */
export async function snapshotPrices(db: Db, today: string) {
  await db.query(
    `insert into price_history (key14, date, netto_price)
     select key14, $1::date, netto_price from skus
     on conflict (key14, date) do update set netto_price = excluded.netto_price`,
    [today],
  );
}

export async function invalidateStock(db: Db, uid8s: string[]) {
  if (uid8s.length) await db.query(`delete from stock_cache where uid8 in (select jsonb_array_elements_text($1::jsonb))`, [uid8s]);
}

export async function getState<T>(db: Db, key: string): Promise<T | null> {
  const r = await db.query<{ value: T }>(`select value from app_state where key = $1`, [key]);
  return r[0]?.value ?? null;
}

/** null löscht den Eintrag (app_state.value ist not null) */
export async function setState(db: Db, key: string, value: unknown) {
  if (value === null || value === undefined) {
    await db.query(`delete from app_state where key = $1`, [key]);
    return;
  }
  await db.query(`insert into app_state (key, value, updated_at) values ($1, $2::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`, [key, value]);
}
