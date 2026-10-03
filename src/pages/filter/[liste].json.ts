/**
 * /filter/{liste}.json: die uid8 einer Liste in der empfohlenen Reihenfolge
 * (für alle Sprachen gleich). Geladen von src/scripts/filter.ts.
 */
import type { APIRoute } from "astro";
import { getCatalog } from "../../lib/catalog/index.ts";
import { listDefinitions } from "../../lib/lists.ts";
import { dateiId } from "../../lib/filterindex.ts";

export async function getStaticPaths() {
  const cat = await getCatalog();
  return listDefinitions(cat).map((l) => ({ params: { liste: dateiId(l.id) }, props: { uids: l.uids } }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify({ v: 1, uids: (props as { uids: string[] }).uids }), { headers: { "content-type": "application/json; charset=utf-8" } });
