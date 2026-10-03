/**
 * Geometrie der zwei Fassaden (PLATZHALTER, OP-08.2, OP-08.3), gemeinsam für
 * src/components/Fassade.astro und das Open-Graph-Bild (src/pages/og/haeuser.png.ts).
 * Koordinaten im viewBox 0 0 260 360. Siehe Fassade.astro.
 */
export type El = { tag: "path"; d: string } | { tag: "rect"; x: number; y: number; w: number; h: number } | { tag: "circle"; cx: number; cy: number; r: number };
export interface Glas {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
}
export interface FassadeGeometrie {
  strokes: El[];
  glass: Glas[];
  band: { x: number; y: number; w: number; h: number; fill: string };
  letters: { d: string; x: number; y: number }[];
}

export function fassadeGeometrie(haus: "lanners" | "jager"): FassadeGeometrie {
  const strokes: El[] = [];
  const glass: Glas[] = [];
  const p = (d: string) => strokes.push({ tag: "path", d });
  const r = (x: number, y: number, w: number, h: number) => strokes.push({ tag: "rect", x, y, w, h });

  /** Fenster: Rahmen, Glas, Sprosse, Kämpfer, Fensterbank */
  function fenster(x: number, y: number, w: number, h: number, sill = true) {
    r(x, y, w, h);
    glass.push({ x: x + 2.5, y: y + 2.5, w: w - 5, h: h - 5 });
    p(`M${x + w / 2} ${y}V${y + h}`);
    p(`M${x} ${y + h * 0.34}H${x + w}`);
    if (sill) p(`M${x - 4} ${y + h + 4}H${x + w + 4}`);
  }

  const LETTERS: Record<string, string> = {
    J: "M6 0V8.5C6 10.8 4.8 12 3 12C1.2 12 0 10.8 0 9",
    A: "M0 12L4 0L8 12M1.35 8H6.65",
    G: "M7.8 2.6C7.1 0.9 5.8 0 4 0C1.6 0 0 2.4 0 6C0 9.6 1.6 12 4 12C6.4 12 8 10.2 8 7.2V6.6H4.6",
    E: "M7 0H0V12H7M0 6H5.6",
    R: "M0 12V0H4.4C6.6 0 8 1.3 8 3.3C8 5.3 6.6 6.6 4.4 6.6H0M4.2 6.6L8 12",
    L: "M0 0V12H7",
    N: "M0 12V0L8 12V0",
    S: "M7.6 2.2C7 0.8 5.8 0 4 0C1.8 0 0.4 1.2 0.4 3C0.4 4.9 1.9 5.6 4 6C6.3 6.4 8 7.2 8 9.1C8 11 6.4 12 4 12C2 12 0.6 11.2 0 9.6",
  };
  function schriftzug(word: string, cx: number, y: number) {
    const total = word.length * 8 + (word.length - 1) * 4;
    const x0 = cx - total / 2;
    return [...word].map((ch, i) => ({ d: LETTERS[ch], x: x0 + i * 12, y }));
  }

  let band: FassadeGeometrie["band"];
  let letters: FassadeGeometrie["letters"];

  if (haus === "jager") {
    // Dach (Mansarde) mit zwei Gauben und Kamin
    p("M8 112L22 72L42 58H176L196 72L208 112H8");
    p("M150 58V42H164V58");
    for (const gx of [50, 138]) {
      p(`M${gx} 104V84L${gx + 14} 72L${gx + 28} 84V104`);
      r(gx + 7, 86, 14, 16);
      glass.push({ x: gx + 9.5, y: 88.5, w: 9, h: 11 });
    }
    // Baukörper
    p("M14 360V112M202 112V360M14 118H202");
    for (const fy of [126, 184, 242]) for (const fx of [28, 70, 112, 154]) fenster(fx, fy, 24, 40);
    // Gerundeter Eckerker mit Haube
    p("M202 132V282M248 132V282");
    p("M202 132C202 106 248 106 248 132");
    p("M225 112V98");
    strokes.push({ tag: "circle", cx: 225, cy: 95, r: 3 });
    p("M202 282Q225 318 248 282");
    for (const fy of [140, 192, 244]) {
      for (const fx of [208, 229]) {
        r(fx, fy, 13, 30);
        glass.push({ x: fx + 2.5, y: fy + 2.5, w: 8, h: 25 });
      }
    }
    // Ladenfront
    p("M14 296H250");
    band = { x: 14, y: 300, w: 236, h: 20, fill: "#808080" };
    r(14, 300, 236, 20);
    for (const [x, w] of [[22, 82], [158, 84]]) {
      r(x, 326, w, 34);
      glass.push({ x: x + 2.5, y: 328.5, w: w - 5, h: 31.5 });
    }
    r(114, 326, 34, 34);
    p("M131 326V360");
    glass.push({ x: 116.5, y: 328.5, w: 29, h: 31.5 });
    letters = schriftzug("JAGER", 132, 304);
  } else {
    // Giebel mit Rundfenster
    p("M14 96L130 38L246 96H14");
    strokes.push({ tag: "circle", cx: 130, cy: 72, r: 10 });
    glass.push({ x: 122, y: 64, w: 16, h: 16, r: 8 });
    // Baukörper
    p("M22 360V96M238 96V360M22 104H238");
    for (const fy of [118, 180, 242]) for (const fx of [44, 112, 180]) fenster(fx, fy, 36, 44);
    // Ladenfront
    p("M22 296H238");
    band = { x: 22, y: 300, w: 216, h: 20, fill: "#002E52" };
    r(22, 300, 216, 20);
    r(30, 326, 134, 34);
    glass.push({ x: 32.5, y: 328.5, w: 129, h: 31.5 });
    r(176, 326, 54, 34);
    p("M203 326V360");
    glass.push({ x: 178.5, y: 328.5, w: 49, h: 31.5 });
    letters = schriftzug("LANNERS", 130, 304);
  }
  return { strokes, glass, band, letters };
}

/** Inhalt eines <svg viewBox="0 0 260 360"> ohne Animation (für das Open-Graph-Bild) */
export function fassadeSvgInhalt(haus: "lanners" | "jager", farbe = "#000000"): string {
  const g = fassadeGeometrie(haus);
  const glas = g.glass.map((x) => (x.r ? `<circle cx="${x.x + x.r}" cy="${x.y + x.r}" r="${x.r}" fill="#F1F2F4"/>` : `<rect x="${x.x}" y="${x.y}" width="${x.w}" height="${x.h}" fill="#F1F2F4"/>`)).join("");
  const band = `<rect x="${g.band.x}" y="${g.band.y}" width="${g.band.w}" height="${g.band.h}" fill="${g.band.fill}"/>`;
  const striche = g.strokes
    .map((s) => (s.tag === "path" ? `<path d="${s.d}"/>` : s.tag === "rect" ? `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/>` : `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"/>`))
    .join("");
  const buchstaben = g.letters.map((l) => `<path d="${l.d}" transform="translate(${l.x} ${l.y})"/>`).join("");
  return `${glas}${band}<g fill="none" stroke="${farbe}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${striche}</g><g fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${buchstaben}</g>`;
}
