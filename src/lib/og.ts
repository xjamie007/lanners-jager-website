/**
 * Open-Graph-Bilder (G2), 1200 × 630, beim Build gerastert:
 *  - Start und Häuser: die zwei Fassaden auf Weiß mit "LANNERS & JAGER" in
 *    League Gothic, als SVG gebaut und mit resvg gerastert.
 *  - Produkte: das Hauptfoto im Glasrahmen (sharp, JPEG: bei Fotos viel kleiner
 *    als PNG, wichtig bei tausenden Artikeln). Ergebnisse liegen im Cache
 *    node_modules/.cache/lj-og, damit ein neuer Build nur geänderte Fotos rechnet.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fassadeSvgInhalt } from "./fassaden.ts";
import type { Photo } from "./catalog/types.ts";
import { BASE_PATH } from "../config/site.ts";

export const OG_W = 1200;
export const OG_H = 630;
const GLAS = "#F1F2F4";
const CACHE = join(process.cwd(), "node_modules", ".cache", "lj-og");
/** Bei Änderungen an Aufbau oder Maßen erhöhen, damit der Cache neu rechnet */
const VERSION = "2";

export async function ogHaeuserPng(): Promise<Buffer> {
  const { Resvg } = await import("@resvg/resvg-js");
  // Fassaden 260 × 360, skaliert auf 378 px Höhe, nebeneinander auf der Straßenlinie
  const s = 1.05;
  const oben = 112;
  const unten = oben + 360 * s;
  const fassade = (haus: "lanners" | "jager", x: number) => `<g transform="translate(${x} ${oben}) scale(${s})">${fassadeSvgInhalt(haus)}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}">
  <rect width="${OG_W}" height="${OG_H}" fill="#FFFFFF"/>
  <text x="64" y="334" font-family="League Gothic" font-size="96" fill="#000000" letter-spacing="1">LANNERS &amp; JAGER</text>
  ${fassade("lanners", 616)}
  ${fassade("jager", 890)}
  <path d="M590 ${unten}H${OG_W}" stroke="#000000" stroke-width="1.75"/>
</svg>`;
  const font = join(process.cwd(), "fonts-src", "LeagueGothic-Regular.ttf");
  const png = new Resvg(svg, { font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: "League Gothic" }, fitTo: { mode: "width", value: OG_W } }).render().asPng();
  return Buffer.from(png);
}

async function fotoBytes(src: string): Promise<Buffer> {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`OG-Bild: ${src} ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  // lokale Datei aus public/ (Demo-Fotos); src enthält den Basis-Pfad
  const ohneBasis = src.startsWith(BASE_PATH) ? src.slice(BASE_PATH.length) : src;
  return readFile(join(process.cwd(), "public", ohneBasis.replace(/^\/+/, "")));
}

/** Hauptfoto im Glasrahmen: Freisteller mit Rand, Modellfotos füllen die Höhe */
export async function ogProduktJpg(photo: Photo): Promise<Buffer> {
  const key = createHash("sha1").update(`${VERSION}|${photo.src}|${photo.fit}`).digest("hex");
  const datei = join(CACHE, `${key}.jpg`);
  try {
    return await readFile(datei);
  } catch {
    /* nicht im Cache */
  }
  const sharp = (await import("sharp")).default;
  const innen = photo.fit === "cover" ? OG_H : Math.round(OG_H * 0.88);
  const foto = await sharp(await fotoBytes(photo.src), { density: 300 })
    .resize({ height: innen, width: Math.round(innen * 0.75), fit: photo.fit === "cover" ? "cover" : "contain", background: GLAS })
    .flatten({ background: GLAS })
    .png()
    .toBuffer();
  const meta = await sharp(foto).metadata();
  const jpg = await sharp({ create: { width: OG_W, height: OG_H, channels: 3, background: GLAS } })
    .composite([{ input: foto, left: Math.round((OG_W - (meta.width ?? 0)) / 2), top: Math.round((OG_H - (meta.height ?? 0)) / 2) }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  await mkdir(CACHE, { recursive: true });
  await writeFile(datei, jpg);
  return jpg;
}
