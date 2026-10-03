/** /og/haeuser.png: Open-Graph-Bild für Start und Häuser (G2) */
import type { APIRoute } from "astro";
import { ogHaeuserPng } from "../../lib/og.ts";

export const GET: APIRoute = async () => new Response(new Uint8Array(await ogHaeuserPng()), { headers: { "content-type": "image/png" } });
