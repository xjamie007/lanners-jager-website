/** /og/produkt/{uid8}.jpg: Hauptfoto im Glasrahmen (G2) */
import type { APIRoute } from "astro";
import { getCatalog } from "../../../lib/catalog/index.ts";
import { ogProduktJpg } from "../../../lib/og.ts";
import type { Photo } from "../../../lib/catalog/types.ts";

export async function getStaticPaths() {
  const cat = await getCatalog();
  return cat.articles.filter((a) => a.photos[0]).map((a) => ({ params: { uid8: a.uid8 }, props: { photo: a.photos[0] } }));
}

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await ogProduktJpg((props as { photo: Photo }).photo)), { headers: { "content-type": "image/jpeg" } });
