/**
 * Produktfotos spiegeln (D10.4.7): neue oder geänderte Fotos vom Foto-Server der
 * Häuser laden und im Storage-Bucket `produktfotos` ablegen. Schlüssel ist der
 * Dateiname, geprüft über sha256. Maße werden aus dem Dateikopf gelesen, damit
 * width/height ins Markup kommen. Im Mock-Modus liegen die Demo-Fotos in der Seite.
 */
import type { Db } from "../db.ts";
import { env } from "../env.ts";
import { sha256Hex } from "../security.ts";

export function imageSize(b: Uint8Array): { width: number; height: number } | null {
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const dv = new DataView(b.buffer, b.byteOffset);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  // JPEG: SOF-Marker suchen
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      const len = (b[i + 2] << 8) | b[i + 3];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
      }
      i += 2 + len;
    }
    return null;
  }
  // WebP
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") {
    const chunk = String.fromCharCode(...b.slice(12, 16));
    if (chunk === "VP8X") return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (chunk === "VP8 ") return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

function serviceKey(): string | undefined {
  const k = env("SUPABASE_SERVICE_ROLE_KEY");
  if (k) return k;
  try {
    const keys = JSON.parse(env("SUPABASE_SECRET_KEYS") ?? "{}");
    return keys.default;
  } catch {
    return undefined;
  }
}

/** Im Mock-Modus: Demo-Silhouetten liegen in public/demo-fotos/ der Website */
export async function markDemoPhotos(db: Db) {
  await db.query(`update article_files set storage_path = 'demo-fotos/' || filename, width = 900, height = 1200 where storage_path is null`);
}

/** Echte Fotos spiegeln, höchstens `limit` je Lauf (Rest beim nächsten Lauf) */
export async function mirrorPhotos(db: Db, limit = 300): Promise<{ done: number; errors: string[] }> {
  const base = env("ST_PHOTO_BASE_URL");
  const supa = env("SUPABASE_URL");
  const key = serviceKey();
  const errors: string[] = [];
  if (!base || !supa || !key) return { done: 0, errors: ["ST_PHOTO_BASE_URL, SUPABASE_URL oder Service-Key fehlt: Fotos nicht gespiegelt"] };
  const todo = await db.query<{ filename: string }>(`select distinct filename from article_files where storage_path is null or sha256 is null limit $1`, [limit]);
  let done = 0;
  for (const { filename } of todo) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, "")}/${encodeURIComponent(filename)}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const sha = await sha256Hex(bytes);
      const size = imageSize(bytes);
      const path = filename;
      const up = await fetch(`${supa}/storage/v1/object/produktfotos/${encodeURIComponent(path)}`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, apikey: key, "content-type": res.headers.get("content-type") ?? "image/jpeg", "x-upsert": "true", "cache-control": "max-age=31536000" },
        body: bytes,
      });
      if (!up.ok) throw new Error(`Storage HTTP ${up.status}`);
      await db.query(`update article_files set storage_path = $2, sha256 = $3, width = coalesce($4, width), height = coalesce($5, height) where filename = $1`, [
        filename,
        path,
        sha,
        size?.width ?? null,
        size?.height ?? null,
      ]);
      done++;
    } catch (e) {
      errors.push(`${filename}: ${(e as Error).message}`);
    }
  }
  return { done, errors };
}
