/**
 * GET /catalog-export?part=… (nur mit x-build-secret, aus GitHub Actions).
 * Liefert dem Build die Zeilen aus Supabase: Stammdaten, Artikel (online oder
 * in den letzten 30 Tagen offline), Schlüssel, Texte, Dateien, Preisverlauf.
 * Abweichung vom Briefing: statt des Service-Keys ein eigenes, eng begrenztes
 * Geheimnis (nur Lesen dieses Exports). Begründung in der README.
 */
import { getCtx } from "../_shared/ctx.ts";
import { json, text } from "../_shared/http.ts";
import { buildAuthorized } from "../_shared/security.ts";
import { getState } from "../_shared/catalog/store.ts";
import { num } from "../_shared/db.ts";

const ARTIKEL = `online or offline_since > now() - interval '30 days'`;

export async function handler(req: Request): Promise<Response> {
  if (!buildAuthorized(req)) return text(401, "Build-Geheimnis fehlt");
  const ctx = await getCtx();
  const u = new URL(req.url);
  const part = u.searchParams.get("part") ?? "master";
  const offset = Math.max(0, Number(u.searchParams.get("offset") ?? 0));
  const limit = Math.min(5000, Math.max(1, Number(u.searchParams.get("limit") ?? 5000)));
  const db = ctx.db;
  const master = async (table: string) => (await db.query<{ data: unknown }>(`select distinct on (key) data from ${table} order by key, account`)).map((r) => r.data);

  switch (part) {
    case "master": {
      const last = await getState<{ at: string }>(db, "last_full_sync");
      const lastDelta = await db.query<{ at: string }>(`select max(finished_at)::text as at from sync_runs where ok`);
      return json(req, {
        asOf: lastDelta[0]?.at ? new Date(lastDelta[0].at).toISOString() : (last?.at ?? new Date().toISOString()),
        stores: await master("st_stores"),
        brands: await master("st_brands"),
        colors: await master("st_colors"),
        sizetables: await master("st_size_tables"),
        seasons: await master("st_seasons"),
        wash: await master("st_wash_instructions"),
      });
    }
    case "articles": {
      const rows = await db.query<Record<string, unknown>>(
        `select uid8, id6, variant, account, brand_id, season_id, cat1, cat2, cat3, cat4, cat5, cat6, cat7, detail1, detail2, detail3, detail4, detail5,
                description1, color_id, colorbrand, size_table_id, online, status, in_the_picture, online_sort, first_delivery::text, last_delivery::text,
                expected_delivery::text, to_jsonb(related) as related, to_jsonb(wash_instructions) as wash_instructions, slug, st_timestamp,
                to_char(offline_since at time zone 'Europe/Luxembourg', 'YYYY-MM-DD') as offline_since
           from articles where ${ARTIKEL} order by uid8 offset $1 limit $2`,
        [offset, limit],
      );
      return json(req, rows);
    }
    case "skus": {
      const rows = await db.query<Record<string, unknown>>(
        `select s.key14, s.uid8, s.size_x, s.size_y, s.size_x_label, s.size_y_label, s.store_id, s.house_id, s.stock, s.backorder,
                s.price::text, s.netto_price::text, s.discount_percentage::text, s.vat::text, s.edi
           from skus s join articles a on a.uid8 = s.uid8
          where a.online or a.offline_since > now() - interval '30 days' order by s.key14 offset $1 limit $2`,
        [offset, limit],
      );
      return json(req, rows.map((r) => ({ ...r, price: num(r.price), netto_price: num(r.netto_price), discount_percentage: num(r.discount_percentage), vat: num(r.vat) })));
    }
    case "texts": {
      const rows = await db.query(
        `select t.uid8, t.type, t.lang, t.kind, t.sort, t.text from article_texts t join articles a on a.uid8 = t.uid8
          where a.online or a.offline_since > now() - interval '30 days' order by t.id offset $1 limit $2`,
        [offset, limit],
      );
      return json(req, rows);
    }
    case "files": {
      const rows = await db.query(
        `select f.uid8, f.type, f.variant, f.sort, f.filename, f.role, f.fit, f.storage_path, f.width, f.height from article_files f join articles a on a.uid8 = f.uid8
          where (a.online or a.offline_since > now() - interval '30 days') and f.storage_path is not null order by f.id offset $1 limit $2`,
        [offset, limit],
      );
      return json(req, rows);
    }
    case "priceHistory": {
      const rows = await db.query<Record<string, unknown>>(
        `select p.key14, p.date::text as date, p.netto_price::text as netto_price from price_history p
          where p.date > current_date - 75 and p.key14 in (select key14 from skus where netto_price < price)
          order by p.key14, p.date offset $1 limit $2`,
        [offset, limit],
      );
      return json(req, rows.map((r) => ({ ...r, netto_price: num(r.netto_price) })));
    }
    default:
      return text(400, "part");
  }
}
