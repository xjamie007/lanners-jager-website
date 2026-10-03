/**
 * Spezifikation des Demo-Katalogs (Briefing D10.8).
 *
 * ALLES HIER IST DEMO: Artikelnummern, Bestände, Texte und die meisten Preise sind
 * erfunden und nur mit PUBLIC_DEMO=true erlaubt. Jeder Artikel trägt in detail5
 * "DEMO". Belegt (Letzshop) sind nur die Preise von Barbour Classic Beaufort Olive
 * (399,95 € und 349,00 €), Lacoste-Polo Marine/Schwarz/Rot/Weiß (je 95,00 €) und
 * der Lacoste-Strickmütze (55,00 €).
 *
 * Aus dieser Datei erzeugt scripts/build-fixtures.ts die Fixtures im exakten
 * Format der SoftTouch-Doku (supabase/functions/_shared/softtouch/fixtures/).
 */
import demoFotoListe from "../demo-fotos/fotos.json" with { type: "json" };

export type HouseKey = "lanners" | "jager";
export type Profile = "viel" | "gemischt" | "knapp" | "leer";

export interface TextSpec {
  lang: string;
  kurz: string;
  material: string;
}

export interface VariantSpec {
  v: number;
  colorbrand: string;
  color: string;
  /** Highlight "Neu eingetroffen" (in_the_picture) */
  neu?: boolean;
  /** Rabatt in Prozent (discount_percentage), netto_price wird berechnet */
  rabatt?: number;
  /** Bestand je Haus und Größe, überschreibt das Zufallsprofil */
  bestand?: Partial<Record<HouseKey, Record<string, number>>>;
  profil?: Profile;
  /** erwartete Nachlieferung in Tagen ab Erzeugung */
  nachlieferungTage?: number;
  /** Lieferung vor so vielen Tagen (first_delivery) */
  geliefertVorTagen?: number;
  /** Nur diese Größen haben überhaupt einen Schlüssel (z. B. Restgrößen) */
  nurGroessen?: string[];
}

export interface ArticleSpec {
  id: number;
  brand: string;
  season: string;
  cat1: "0101" | "0102";
  cat2: string;
  ref: string;
  name: string;
  desc: string;
  table: string;
  /** 1D: Größen (Texte aus der Größentabelle). 2D: [x[], y[]] */
  sizes: string[] | [string[], string[]];
  price: number;
  wash: number[];
  houses: HouseKey[];
  variants: VariantSpec[];
  texts: { de?: TextSpec; fr?: TextSpec };
  related?: number[];
  silhouette: string;
  /** dritte Ansicht (Detailfoto, Preset 03 = cover) */
  detailFoto?: boolean;
}

const S_XL = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const S_3XL = ["S", "M", "L", "XL", "2XL", "3XL"];
const S_2XL = ["S", "M", "L", "XL", "2XL"];
const D_XSXL = ["XS", "S", "M", "L", "XL"];
const H_46_58 = ["46", "48", "50", "52", "54", "56", "58"];
const H_46_56 = ["46", "48", "50", "52", "54", "56"];
const D_34_44 = ["34", "36", "38", "40", "42", "44"];
const D_36_48 = ["36", "38", "40", "42", "44", "46", "48"];
const D_36_46 = ["36", "38", "40", "42", "44", "46"];
const KRAGEN = ["39", "40", "41", "42", "43", "44"];
const HUT = ["55", "56", "57", "58", "59", "60", "61"];
const GUERTEL = ["85", "90", "95", "100", "105", "110"];
const TU = ["TU"];
const W_H: [string[], string[]] = [["29", "30", "31", "32", "33", "34", "36", "38"], ["L30", "L32", "L34"]];
const W_GARDEUR: [string[], string[]] = [["31", "32", "33", "34", "36", "38"], ["L30", "L32", "L34"]];
const W_D: [string[], string[]] = [["25", "26", "27", "28", "29", "30", "31"], ["L30", "L32"]];

export const articles: ArticleSpec[] = [
  // ───────────── JAGER, Grand-Rue 32 ─────────────
  {
    id: 410101, brand: "101", season: "NOS", cat1: "0101", cat2: "0201", ref: "MWX0017", name: "Classic Beaufort Wax Jacket",
    desc: "Beaufort Wachsjacke olive", table: "10", sizes: S_XL, price: 399.95, wash: [14, 6, 7, 11, 13], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "OL71 - Olive", color: "0600", neu: true, geliefertVorTagen: 9,
      bestand: { jager: { XS: 2, S: 1, M: 3, L: 4, XL: 2, "2XL": 2, "3XL": 1, "4XL": 0 } } }],
    texts: {
      de: { lang: "Die gewachste Jagdjacke aus Baumwolle mit Cordkragen, großen Pattentaschen und der typischen Rückentasche. Wird mit den Jahren schöner.", kurz: "Gewachste Jacke mit Cordkragen", material: "Außen 100 % Baumwolle, gewachst. Futter 100 % Baumwolle (Tartan)." },
      fr: { lang: "La veste de chasse en coton ciré, col en velours côtelé, grandes poches à rabat et la poche dorsale typique. Elle embellit avec les années.", kurz: "Veste cirée à col en velours", material: "Extérieur 100 % coton ciré. Doublure 100 % coton (tartan)." },
    },
    related: [410601, 410701, 410801], silhouette: "jacke", detailFoto: true,
  },
  {
    id: 410102, brand: "101", season: "W25", cat1: "0101", cat2: "0201", ref: "MWX0017-25", name: "Classic Beaufort",
    desc: "Beaufort Vorsaison olive", table: "10", sizes: S_XL, price: 349.0, wash: [14, 6, 7, 11, 13], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "OL71 - Olive", color: "0600", geliefertVorTagen: 300, nurGroessen: ["M", "XL", "2XL"],
      bestand: { jager: { M: 1, XL: 2, "2XL": 1 } } }],
    texts: {
      de: { lang: "Der Klassiker aus der Vorsaison, nur noch in wenigen Größen: gewachste Baumwolle, Cordkragen, Rückentasche.", kurz: "Wachsjacke, Restgrößen", material: "Außen 100 % Baumwolle, gewachst. Futter 100 % Baumwolle." },
      fr: { lang: "Le classique de la saison précédente, dans quelques tailles seulement : coton ciré, col en velours, poche dorsale.", kurz: "Veste cirée, dernières tailles", material: "Extérieur 100 % coton ciré. Doublure 100 % coton." },
    },
    related: [410101], silhouette: "jacke",
  },
  {
    id: 410103, brand: "101", season: "W26", cat1: "0101", cat2: "0201", ref: "MQU0001", name: "Liddesdale Steppjacke",
    desc: "Liddesdale Quilt", table: "10", sizes: S_3XL, price: 189.95, wash: [2, 6, 7, 9, 12], houses: ["jager", "lanners"],
    variants: [
      { v: 1, colorbrand: "NY91 - Navy", color: "0710", neu: true, geliefertVorTagen: 6, profil: "gemischt" },
      { v: 2, colorbrand: "OL51 - Olive", color: "0600", rabatt: 30, geliefertVorTagen: 70, profil: "knapp" },
    ],
    texts: {
      de: { lang: "Leichte Steppjacke mit Rautensteppung, Cordbesatz am Kragen und Druckknöpfen. Passt unter einen Mantel und über einen Pullover.", kurz: "Leichte Steppjacke", material: "100 % Polyamid, Wattierung 100 % Polyester. Besatz 100 % Baumwolle." },
      fr: { lang: "Veste matelassée légère à surpiqûres losanges, col bordé de velours et boutons-pression. Se porte sous un manteau ou sur un pull.", kurz: "Veste matelassée légère", material: "100 % polyamide, ouatine 100 % polyester. Garnitures 100 % coton." },
    },
    related: [410105, 410801], silhouette: "jacke",
  },
  {
    id: 410104, brand: "101", season: "W26", cat1: "0101", cat2: "0204", ref: "MSH4980", name: "Tattersall Hemd Regular Fit",
    desc: "Tattersall Hemd", table: "10", sizes: S_3XL, price: 89.95, wash: [3, 6, 7, 10, 12], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "TA11 - Tattersall Grün", color: "0600", geliefertVorTagen: 30, profil: "viel" }],
    texts: {
      de: { lang: "Kariertes Hemd aus weicher Baumwolle mit Button-down-Kragen. Unter dem Pullover genauso gut wie allein.", kurz: "Kariertes Baumwollhemd", material: "100 % Baumwolle." },
      fr: { lang: "Chemise à carreaux en coton doux, col boutonné. Aussi bien sous un pull que seule.", kurz: "Chemise à carreaux en coton", material: "100 % coton." },
    },
    related: [410103, 410105], silhouette: "hemd",
  },
  {
    id: 410105, brand: "101", season: "W26", cat1: "0101", cat2: "0206", ref: "MKN0345", name: "Essential Lambswool Pullover",
    desc: "Lambswool Rundhals", table: "10", sizes: S_3XL, price: 119.95, wash: [4, 6, 8, 11, 12], houses: ["jager"],
    variants: [
      { v: 1, colorbrand: "NY91 - Navy", color: "0710", geliefertVorTagen: 40, profil: "gemischt" },
      { v: 2, colorbrand: "GN31 - Racing Green", color: "0600", neu: true, geliefertVorTagen: 4, profil: "gemischt" },
    ],
    texts: {
      fr: { lang: "Pull col rond en laine d'agneau, chaud et léger. Côtes aux poignets et à la base.", kurz: "Pull en laine d'agneau", material: "100 % laine d'agneau." },
    },
    related: [410104], silhouette: "strick",
  },
  {
    id: 410201, brand: "102", season: "NOS", cat1: "0101", cat2: "0205", ref: "L1212", name: "Polo L.12.12 Classic Fit",
    desc: "Polo L1212", table: "10", sizes: S_3XL, price: 95.0, wash: [3, 6, 7, 10, 12], houses: ["jager"],
    variants: [
      { v: 1, colorbrand: "166 - Marine", color: "0710", neu: true, geliefertVorTagen: 12, bestand: { jager: { S: 3, M: 5, L: 6, XL: 4, "2XL": 2, "3XL": 1 } } },
      { v: 2, colorbrand: "031 - Schwarz", color: "0001", geliefertVorTagen: 50, profil: "viel" },
      { v: 3, colorbrand: "240 - Rot", color: "0400", geliefertVorTagen: 50, profil: "gemischt" },
      { v: 4, colorbrand: "001 - Weiß", color: "0100", geliefertVorTagen: 50, bestand: { jager: { S: 0, M: 1, L: 0, XL: 2, "2XL": 0, "3XL": 0 } } },
    ],
    texts: {
      de: { lang: "Das Original-Polo aus Petit Piqué mit dem gestickten Krokodil auf der Brust, Zwei-Knopf-Leiste und gerippten Ärmelbündchen.", kurz: "Polo aus Petit Piqué", material: "100 % Baumwolle (Petit Piqué)." },
      fr: { lang: "Le polo original en petit piqué avec le crocodile brodé sur la poitrine, patte deux boutons et bords-côtes aux manches.", kurz: "Polo en petit piqué", material: "100 % coton (petit piqué)." },
    },
    related: [410301, 410202], silhouette: "polo", detailFoto: true,
  },
  {
    id: 410202, brand: "102", season: "W26", cat1: "0101", cat2: "0222", ref: "RB0001", name: "Strickmütze aus Wolle",
    desc: "Mütze Wolle", table: "16", sizes: TU, price: 55.0, wash: [4, 6, 8, 11, 13], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "166 - Marine", color: "0710", neu: true, geliefertVorTagen: 8, bestand: { jager: { TU: 3 } } }],
    texts: {
      de: { lang: "Gerippte Strickmütze mit breitem Umschlag und kleinem Krokodil.", kurz: "Gerippte Mütze", material: "100 % Wolle." },
      fr: { lang: "Bonnet en maille côtelée à large revers, petit crocodile.", kurz: "Bonnet côtelé", material: "100 % laine." },
    },
    related: [410201], silhouette: "muetze",
  },
  {
    id: 410203, brand: "102", season: "W26", cat1: "0101", cat2: "0206", ref: "AH1985", name: "Pullover Rundhals Baumwolle",
    desc: "Pullover Rundhals", table: "10", sizes: S_3XL, price: 139.0, wash: [3, 6, 8, 10, 12], houses: ["jager", "lanners"],
    variants: [{ v: 1, colorbrand: "CCA - Grau meliert", color: "0020", geliefertVorTagen: 25, profil: "gemischt" }],
    texts: {
      de: { lang: "Feiner Rundhalspullover aus Baumwolle, angenehm für drinnen und unter der Jacke.", kurz: "Feiner Baumwollpullover", material: "100 % Baumwolle." },
    },
    silhouette: "strick",
  },
  {
    id: 410204, brand: "102", season: "NOS", cat1: "0101", cat2: "0210", ref: "5H3389", name: "Boxershorts 3er-Pack",
    desc: "Boxer 3er", table: "10", sizes: S_2XL, price: 49.0, wash: [3, 6, 7, 11, 13], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "031 - Schwarz", color: "0001", geliefertVorTagen: 60, profil: "viel" }],
    texts: {
      de: { lang: "Drei Boxershorts aus Stretch-Baumwolle mit weichem Bund.", kurz: "Drei Boxershorts", material: "95 % Baumwolle, 5 % Elasthan." },
      fr: { lang: "Trois boxers en coton stretch à ceinture douce.", kurz: "Lot de trois boxers", material: "95 % coton, 5 % élasthanne." },
    },
    silhouette: "polo",
  },
  {
    id: 410301, brand: "103", season: "NOS", cat1: "0101", cat2: "0208", ref: "00501-0114", name: "501 Original Fit",
    desc: "501 Original", table: "20", sizes: W_H, price: 119.95, wash: [3, 6, 7, 10, 12], houses: ["jager"],
    variants: [
      { v: 1, colorbrand: "0114 - Dark Stonewash", color: "0700", neu: true, geliefertVorTagen: 10, profil: "gemischt" },
      { v: 2, colorbrand: "0165 - Black", color: "0001", geliefertVorTagen: 45, profil: "knapp" },
    ],
    texts: {
      de: { lang: "Die Jeans mit Knopfleiste, gerade geschnitten, aus festem Denim. Gerade Beinform, sitzt an der Taille.", kurz: "Gerade Jeans mit Knopfleiste", material: "100 % Baumwolle (Denim)." },
      fr: { lang: "Le jean à braguette boutonnée, coupe droite, en denim robuste. Jambe droite, taille normale.", kurz: "Jean droit à boutons", material: "100 % coton (denim)." },
    },
    related: [410201, 410302], silhouette: "jeans", detailFoto: true,
  },
  {
    id: 410302, brand: "103", season: "W26", cat1: "0101", cat2: "0201", ref: "72334-0130", name: "Trucker Jacket",
    desc: "Jeansjacke", table: "10", sizes: S_2XL, price: 109.95, wash: [3, 6, 7, 10, 12], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "0130 - Medium Stonewash", color: "0700", geliefertVorTagen: 35, profil: "gemischt" }],
    texts: {
      fr: { lang: "La veste en jean classique : poches poitrine à rabat, pattes de serrage à la taille.", kurz: "Veste en jean", material: "100 % coton." },
    },
    related: [410301], silhouette: "jacke",
  },
  {
    id: 410303, brand: "103", season: "W26", cat1: "0101", cat2: "0208", ref: "04511-1163", name: "511 Slim",
    desc: "511 Slim", table: "20", sizes: W_H, price: 109.95, wash: [3, 6, 7, 10, 12], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "1163 - Rock Cod", color: "0700", geliefertVorTagen: 20, profil: "gemischt" }],
    texts: {
      de: { lang: "Schmal geschnittene Jeans mit etwas Stretch, unter der Hüfte sitzend.", kurz: "Schmale Jeans", material: "99 % Baumwolle, 1 % Elasthan." },
      fr: { lang: "Jean coupe slim avec un peu de stretch, taille légèrement basse.", kurz: "Jean slim", material: "99 % coton, 1 % élasthanne." },
    },
    silhouette: "jeans",
  },
  {
    id: 410401, brand: "104", season: "W26", cat1: "0101", cat2: "0221", ref: "2598101", name: "Fedora Wollfilz",
    desc: "Fedora Wollfilz", table: "14", sizes: HUT, price: 129.0, wash: [1, 6, 7, 11, 13], houses: ["jager"],
    variants: [
      { v: 1, colorbrand: "6 - Braun", color: "0300", neu: true, geliefertVorTagen: 7, bestand: { jager: { "55": 1, "56": 2, "57": 3, "58": 2, "59": 1, "60": 0, "61": 1 } } },
      { v: 2, colorbrand: "3 - Grau", color: "0020", geliefertVorTagen: 120, nachlieferungTage: 11, bestand: { jager: { "55": 0, "56": 0, "57": 0, "58": 0, "59": 0, "60": 0, "61": 0 } } },
    ],
    texts: {
      de: { lang: "Klassischer Fedora aus Wollfilz mit Ripsband, in Form gebracht in der Hutstube von Stetson.", kurz: "Fedora aus Wollfilz", material: "100 % Wolle (Filz). Band: 100 % Polyester." },
      fr: { lang: "Fedora classique en feutre de laine avec ruban gros-grain.", kurz: "Fedora en feutre de laine", material: "100 % laine (feutre). Ruban : 100 % polyester." },
    },
    related: [410403, 410501], silhouette: "hut",
  },
  {
    id: 410402, brand: "104", season: "W26", cat1: "0101", cat2: "0221", ref: "6610502", name: "Flatcap Wolle Fischgrat",
    desc: "Flatcap Fischgrat", table: "14", sizes: HUT, price: 79.0, wash: [1, 6, 7, 11, 12], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "63 - Braun Fischgrat", color: "0300", geliefertVorTagen: 30, profil: "gemischt" }],
    texts: {
      de: { lang: "Schirmmütze aus Wolle mit Fischgratmuster und gefüttertem Innenband.", kurz: "Schirmmütze aus Wolle", material: "100 % Wolle. Futter 100 % Baumwolle." },
      fr: { lang: "Casquette plate en laine à chevrons, bandeau intérieur doublé.", kurz: "Casquette plate en laine", material: "100 % laine. Doublure 100 % coton." },
    },
    silhouette: "hut",
  },
  {
    id: 410403, brand: "104", season: "NOS", cat1: "0101", cat2: "0222", ref: "7711101", name: "Baseball Cap Baumwolle",
    desc: "Cap Baumwolle", table: "16", sizes: TU, price: 49.0, wash: [4, 6, 8, 11, 13], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "2 - Navy", color: "0710", geliefertVorTagen: 15, bestand: { jager: { TU: 7 } } }],
    texts: {
      de: { lang: "Baseballkappe aus gewaschener Baumwolle, hinten verstellbar.", kurz: "Verstellbare Kappe", material: "100 % Baumwolle." },
      fr: { lang: "Casquette en coton lavé, réglable à l'arrière.", kurz: "Casquette réglable", material: "100 % coton." },
    },
    silhouette: "muetze",
  },
  {
    id: 410501, brand: "106", season: "W26", cat1: "0101", cat2: "0221", ref: "FH-CAP-01", name: "Flatcap Tweed",
    desc: "Flatcap Tweed", table: "14", sizes: HUT, price: 69.95, wash: [1, 6, 7, 11, 12], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "800 - Grau", color: "0020", geliefertVorTagen: 18, profil: "knapp" }],
    texts: {
      fr: { lang: "Casquette plate en tweed de laine, doublure matelassée.", kurz: "Casquette en tweed", material: "100 % laine. Doublure 100 % polyester." },
    },
    silhouette: "hut",
  },
  {
    id: 410502, brand: "106", season: "W26", cat1: "0101", cat2: "0222", ref: "FH-BEAN-02", name: "Strickmütze Merino",
    desc: "Mütze Merino", table: "16", sizes: TU, price: 39.95, wash: [4, 6, 8, 11, 13], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "990 - Anthrazit", color: "0020", geliefertVorTagen: 22, bestand: { jager: { TU: 1 } } }],
    texts: {
      de: { lang: "Leichte Mütze aus Merinowolle, glatt gestrickt.", kurz: "Mütze aus Merinowolle", material: "100 % Merinowolle." },
      fr: { lang: "Bonnet léger en laine mérinos, maille unie.", kurz: "Bonnet en mérinos", material: "100 % laine mérinos." },
    },
    silhouette: "muetze",
  },
  {
    id: 410601, brand: "101", season: "NOS", cat1: "0101", cat2: "0225", ref: "USC0001", name: "Tartan Lambswool Schal",
    desc: "Schal Tartan", table: "16", sizes: TU, price: 59.95, wash: [4, 6, 8, 11, 12], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "TN11 - Classic Tartan", color: "1000", geliefertVorTagen: 26, bestand: { jager: { TU: 4 } } }],
    texts: {
      de: { lang: "Weicher Schal aus Lammwolle im Barbour-Tartan, mit Fransen.", kurz: "Schal aus Lammwolle", material: "100 % Lammwolle." },
      fr: { lang: "Écharpe douce en laine d'agneau au tartan Barbour, à franges.", kurz: "Écharpe en laine d'agneau", material: "100 % laine d'agneau." },
    },
    silhouette: "schal",
  },
  {
    id: 410701, brand: "101", season: "NOS", cat1: "0101", cat2: "0223", ref: "MAC0001", name: "Ledergürtel",
    desc: "Gürtel Leder", table: "15", sizes: GUERTEL, price: 69.95, wash: [1], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "BR11 - Braun", color: "0300", geliefertVorTagen: 90, profil: "gemischt" }],
    texts: {
      de: { lang: "Gürtel aus Vollrindleder mit Dornschließe aus Messing.", kurz: "Gürtel aus Rindleder", material: "100 % Rindleder. Schließe: Messing." },
      fr: { lang: "Ceinture en cuir de vachette pleine fleur, boucle ardillon en laiton.", kurz: "Ceinture en cuir", material: "100 % cuir de vachette. Boucle : laiton." },
    },
    silhouette: "guertel",
  },
  {
    id: 410801, brand: "105", season: "W26", cat1: "0101", cat2: "0207", ref: "BENNY-3", name: "Benny Chino Modern Fit",
    desc: "Chino Benny", table: "20", sizes: W_GARDEUR, price: 139.95, wash: [3, 6, 7, 10, 12], houses: ["jager"],
    variants: [
      { v: 1, colorbrand: "69 - Navy", color: "0710", geliefertVorTagen: 28, profil: "gemischt" },
      { v: 2, colorbrand: "14 - Beige", color: "0200", rabatt: 20, geliefertVorTagen: 95, profil: "knapp" },
    ],
    texts: {
      de: { lang: "Chino aus Baumwolle mit etwas Stretch, gerade geschnitten mit leicht schmalerem Bein.", kurz: "Chino mit Stretch", material: "98 % Baumwolle, 2 % Elasthan." },
      fr: { lang: "Chino en coton légèrement stretch, coupe droite à jambe un peu plus étroite.", kurz: "Chino stretch", material: "98 % coton, 2 % élasthanne." },
    },
    related: [410104], silhouette: "hose",
  },
  {
    id: 410802, brand: "105", season: "W26", cat1: "0101", cat2: "0207", ref: "BILL-5", name: "Bill Cordhose",
    desc: "Cordhose Bill", table: "20", sizes: W_GARDEUR, price: 149.95, wash: [3, 6, 7, 10, 12], houses: ["jager"],
    variants: [{ v: 1, colorbrand: "26 - Braun", color: "0300", neu: true, geliefertVorTagen: 5, profil: "gemischt" }],
    texts: {
      de: { lang: "Feincordhose mit Bundfalte, bequem im Sitz.", kurz: "Hose aus Feincord", material: "98 % Baumwolle, 2 % Elasthan." },
    },
    silhouette: "hose",
  },

  // ───────────── LANNERS, Grand-Rue 18, Herren ─────────────
  {
    id: 420101, brand: "201", season: "W26", cat1: "0101", cat2: "0203", ref: "50479341", name: "Anzug H-Huge Slim Fit",
    desc: "Anzug Huge", table: "11", sizes: H_46_58, price: 699.0, wash: [1, 6, 7, 10, 12], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "404 - Dark Blue", color: "0710", neu: true, geliefertVorTagen: 11, bestand: { lanners: { "46": 1, "48": 2, "50": 3, "52": 3, "54": 2, "56": 1, "58": 0 } } },
      { v: 2, colorbrand: "021 - Anthrazit", color: "0020", rabatt: 20, geliefertVorTagen: 140, profil: "knapp" },
    ],
    texts: {
      de: { lang: "Anzug aus Schurwolle mit schmalem Schnitt, Sakko mit zwei Knöpfen und Hose ohne Bundfalte. Für Büro, Hochzeit und alles dazwischen.", kurz: "Schmaler Anzug aus Schurwolle", material: "100 % Schurwolle. Futter 100 % Viskose." },
      fr: { lang: "Costume en laine vierge à coupe ajustée, veste deux boutons et pantalon sans pinces. Pour le bureau, un mariage et tout le reste.", kurz: "Costume ajusté en laine vierge", material: "100 % laine vierge. Doublure 100 % viscose." },
    },
    related: [420102, 420111], silhouette: "sakko", detailFoto: true,
  },
  {
    id: 420102, brand: "201", season: "NOS", cat1: "0101", cat2: "0204", ref: "50469345", name: "Hemd H-Hank Slim Fit",
    desc: "Hemd Hank", table: "13", sizes: KRAGEN, price: 109.0, wash: [3, 6, 7, 10, 12], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "100 - Weiß", color: "0100", geliefertVorTagen: 33, profil: "viel" },
      { v: 2, colorbrand: "450 - Hellblau", color: "0700", geliefertVorTagen: 33, profil: "gemischt" },
    ],
    texts: {
      de: { lang: "Bügelleichtes Businesshemd aus Baumwolle mit Kent-Kragen, schmal geschnitten.", kurz: "Bügelleichtes Hemd", material: "100 % Baumwolle." },
      fr: { lang: "Chemise business en coton facile à repasser, col Kent, coupe ajustée.", kurz: "Chemise facile à repasser", material: "100 % coton." },
    },
    related: [420101], silhouette: "hemd",
  },
  {
    id: 420103, brand: "201", season: "W26", cat1: "0101", cat2: "0202", ref: "50496201", name: "Mantel H-Hyde",
    desc: "Mantel Hyde", table: "11", sizes: H_46_56, price: 549.0, wash: [1, 6, 7, 10, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "001 - Schwarz", color: "0001", geliefertVorTagen: 75, bestand: { lanners: { "46": 0, "48": 0, "50": 0, "52": 0, "54": 0, "56": 0 } } }],
    texts: {
      de: { lang: "Langer Mantel aus Woll-Kaschmir-Mischung mit verdeckter Knopfleiste.", kurz: "Mantel mit Kaschmir", material: "90 % Schurwolle, 10 % Kaschmir." },
      fr: { lang: "Manteau long en laine mélangée de cachemire, patte de boutonnage cachée.", kurz: "Manteau avec cachemire", material: "90 % laine vierge, 10 % cachemire." },
    },
    silhouette: "mantel",
  },
  {
    id: 420104, brand: "201", season: "NOS", cat1: "0101", cat2: "0205", ref: "50468301", name: "Polo Pallas",
    desc: "Polo Pallas", table: "10", sizes: S_3XL, price: 99.0, wash: [3, 6, 7, 10, 12], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "100 - Weiß", color: "0100", geliefertVorTagen: 20, profil: "viel" },
      { v: 2, colorbrand: "402 - Dark Blue", color: "0710", neu: true, geliefertVorTagen: 3, profil: "viel" },
      { v: 3, colorbrand: "001 - Schwarz", color: "0001", geliefertVorTagen: 20, profil: "gemischt" },
    ],
    texts: {
      de: { lang: "Polo aus Baumwoll-Piqué mit Logo-Stickerei, normale Passform.", kurz: "Polo aus Piqué", material: "100 % Baumwolle." },
      fr: { lang: "Polo en piqué de coton avec logo brodé, coupe normale.", kurz: "Polo en piqué", material: "100 % coton." },
    },
    silhouette: "polo",
  },
  {
    id: 420105, brand: "206", season: "W26", cat1: "0101", cat2: "0201", ref: "430210", name: "Steppjacke mit Stehkragen",
    desc: "Jacke Stehkragen", table: "10", sizes: ["M", "L", "XL", "2XL", "3XL"], price: 229.95, wash: [2, 6, 7, 9, 12], houses: ["lanners", "jager"],
    variants: [
      { v: 1, colorbrand: "35 - Olive", color: "0600", neu: true, geliefertVorTagen: 9, profil: "gemischt" },
      { v: 2, colorbrand: "47 - Navy", color: "0710", geliefertVorTagen: 40, profil: "gemischt" },
    ],
    texts: {
      de: { lang: "Wasserabweisende Steppjacke mit Stehkragen, Zwei-Wege-Reißverschluss und vier Taschen.", kurz: "Wasserabweisende Steppjacke", material: "100 % Polyamid. Wattierung 100 % Polyester (recycelt)." },
      fr: { lang: "Veste matelassée déperlante à col montant, zip double sens et quatre poches.", kurz: "Veste matelassée déperlante", material: "100 % polyamide. Ouatine 100 % polyester (recyclé)." },
    },
    related: [420106], silhouette: "jacke",
  },
  {
    id: 420106, brand: "206", season: "W26", cat1: "0101", cat2: "0207", ref: "476515", name: "Chino Madison",
    desc: "Chino Madison", table: "11", sizes: H_46_56, price: 99.95, wash: [3, 6, 7, 10, 12], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "14 - Beige", color: "0200", geliefertVorTagen: 55, profil: "viel" },
      { v: 2, colorbrand: "47 - Navy", color: "0710", rabatt: 40, geliefertVorTagen: 160, profil: "knapp" },
    ],
    texts: {
      de: { lang: "Chino aus Baumwoll-Twill mit Stretch, gerade geschnitten.", kurz: "Chino aus Twill", material: "97 % Baumwolle, 3 % Elasthan." },
      fr: { lang: "Chino en twill de coton stretch, coupe droite.", kurz: "Chino en twill", material: "97 % coton, 3 % élasthanne." },
    },
    silhouette: "hose",
  },
  {
    id: 420107, brand: "206", season: "W26", cat1: "0101", cat2: "0204", ref: "409125", name: "Flanellhemd Regular Fit",
    desc: "Flanellhemd", table: "10", sizes: S_3XL, price: 79.95, wash: [3, 6, 7, 10, 12], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "56 - Rot kariert", color: "0400", geliefertVorTagen: 16, profil: "gemischt" },
      { v: 2, colorbrand: "43 - Blau kariert", color: "0700", geliefertVorTagen: 16, profil: "gemischt" },
    ],
    texts: {
      de: { lang: "Weiches Hemd aus angerautem Baumwollflanell, kariert.", kurz: "Kariertes Flanellhemd", material: "100 % Baumwolle." },
    },
    silhouette: "hemd",
  },
  {
    id: 420108, brand: "203", season: "W26", cat1: "0101", cat2: "0208", ref: "PTR650", name: "Jeans Tailwheel Slim",
    desc: "Jeans Tailwheel", table: "20", sizes: W_H, price: 119.95, wash: [3, 6, 7, 10, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "DSD - Dark Sky", color: "0700", neu: true, geliefertVorTagen: 13, profil: "gemischt" }],
    texts: {
      de: { lang: "Schmale Jeans aus Komfort-Denim mit leichter Waschung.", kurz: "Schmale Jeans", material: "92 % Baumwolle, 6 % Polyester, 2 % Elasthan." },
      fr: { lang: "Jean slim en denim confort, délavage léger.", kurz: "Jean slim", material: "92 % coton, 6 % polyester, 2 % élasthanne." },
    },
    silhouette: "jeans",
  },
  {
    id: 420109, brand: "207", season: "W26", cat1: "0101", cat2: "0206", ref: "11411370", name: "Strickpullover Rundhals",
    desc: "Strick Rundhals", table: "10", sizes: S_3XL, price: 89.95, wash: [4, 6, 8, 11, 12], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "5900 - Marine", color: "0710", geliefertVorTagen: 21, profil: "viel" },
      { v: 2, colorbrand: "4400 - Bordeaux", color: "0410", geliefertVorTagen: 21, profil: "gemischt" },
    ],
    texts: {
      de: { lang: "Pullover aus Baumwoll-Woll-Mischung mit Rundhalsausschnitt.", kurz: "Rundhalspullover", material: "70 % Baumwolle, 30 % Wolle." },
      fr: { lang: "Pull col rond en coton et laine.", kurz: "Pull col rond", material: "70 % coton, 30 % laine." },
    },
    silhouette: "strick",
  },
  {
    id: 420110, brand: "205", season: "W26", cat1: "0101", cat2: "0204", ref: "176322", name: "Oxford-Hemd Regular Fit",
    desc: "Oxford Hemd", table: "10", sizes: S_2XL, price: 89.95, wash: [3, 6, 7, 10, 12], houses: ["lanners", "jager"],
    variants: [{ v: 1, colorbrand: "0006 - White", color: "0100", geliefertVorTagen: 27, profil: "gemischt" }],
    texts: {
      de: { lang: "Hemd aus Oxford-Baumwolle mit Button-down-Kragen und Brusttasche.", kurz: "Oxford-Hemd", material: "100 % Baumwolle (Bio)." },
      fr: { lang: "Chemise en coton Oxford, col boutonné, poche poitrine.", kurz: "Chemise Oxford", material: "100 % coton (bio)." },
    },
    silhouette: "hemd",
  },
  {
    id: 420111, brand: "201", season: "NOS", cat1: "0101", cat2: "0223", ref: "50471301", name: "Ledergürtel Celie",
    desc: "Gürtel Celie", table: "15", sizes: GUERTEL, price: 89.0, wash: [1], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "001 - Schwarz", color: "0001", geliefertVorTagen: 100, profil: "viel" },
      { v: 2, colorbrand: "202 - Braun", color: "0300", geliefertVorTagen: 100, profil: "gemischt" },
    ],
    texts: {
      de: { lang: "Gürtel aus italienischem Leder mit polierter Schließe.", kurz: "Ledergürtel", material: "100 % Rindleder." },
      fr: { lang: "Ceinture en cuir italien, boucle polie.", kurz: "Ceinture en cuir", material: "100 % cuir de vachette." },
    },
    silhouette: "guertel",
  },
  {
    id: 420112, brand: "201", season: "W26", cat1: "0101", cat2: "0225", ref: "50477301", name: "Schal aus Wolle",
    desc: "Schal Wolle", table: "16", sizes: TU, price: 79.0, wash: [4, 6, 8, 11, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "410 - Navy", color: "0710", geliefertVorTagen: 19, bestand: { lanners: { TU: 2 } } }],
    texts: {
      de: { lang: "Schal aus weicher Schurwolle mit Fransen.", kurz: "Wollschal", material: "100 % Schurwolle." },
      fr: { lang: "Écharpe en laine vierge douce, à franges.", kurz: "Écharpe en laine", material: "100 % laine vierge." },
    },
    silhouette: "schal",
  },
  {
    id: 420113, brand: "201", season: "W26", cat1: "0101", cat2: "0222", ref: "50475302", name: "Strickmütze Logo",
    desc: "Mütze Logo", table: "16", sizes: TU, price: 59.0, wash: [4, 6, 8, 11, 13], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "001 - Schwarz", color: "0001", geliefertVorTagen: 14, bestand: { lanners: { TU: 0 } } }],
    texts: {
      de: { lang: "Mütze aus Rippstrick mit Logo-Aufnäher.", kurz: "Mütze aus Rippstrick", material: "100 % Wolle." },
    },
    silhouette: "muetze",
  },
  {
    id: 420114, brand: "204", season: "W26", cat1: "0101", cat2: "0201", ref: "D30650M", name: "Steppjacke Alexander",
    desc: "Alexander", table: "10", sizes: S_3XL, price: 249.0, wash: [2, 6, 7, 11, 13], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "10000 - Schwarz", color: "0001", geliefertVorTagen: 24, profil: "gemischt" },
      { v: 2, colorbrand: "90000 - Navy", color: "0710", neu: true, geliefertVorTagen: 2, profil: "viel" },
    ],
    texts: {
      de: { lang: "Steppjacke mit tierfreier Wattierung, Kapuze und Strickbündchen innen.", kurz: "Steppjacke ohne Daunen", material: "100 % Nylon. Wattierung: PLUMTECH® 100 % Polyester." },
      fr: { lang: "Doudoune à ouatine sans matière animale, capuche et poignets en maille intérieurs.", kurz: "Doudoune sans plumes", material: "100 % nylon. Ouatine : PLUMTECH® 100 % polyester." },
    },
    silhouette: "jacke",
  },
  {
    id: 420115, brand: "205", season: "W26", cat1: "0101", cat2: "0206", ref: "175011", name: "Pullover mit Struktur",
    desc: "Struktur Pulli", table: "10", sizes: S_2XL, price: 119.95, wash: [4, 6, 8, 11, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "0217 - Ecru", color: "0200", geliefertVorTagen: 37, profil: "knapp" }],
    texts: {
      fr: { lang: "Pull en maille texturée, col rond, coupe décontractée.", kurz: "Pull texturé", material: "60 % coton, 40 % laine." },
    },
    silhouette: "strick",
  },

  // ───────────── LANNERS, Grand-Rue 18, Damen ─────────────
  {
    id: 430101, brand: "202", season: "W26", cat1: "0102", cat2: "0206", ref: "R2103", name: "Pullover Rundhals Merino",
    desc: "Pulli Merino", table: "12", sizes: D_36_48, price: 149.95, wash: [4, 6, 8, 11, 12], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "248 - Camel", color: "0200", neu: true, geliefertVorTagen: 6, bestand: { lanners: { "36": 1, "38": 3, "40": 4, "42": 2, "44": 2, "46": 1, "48": 0 } } },
      { v: 2, colorbrand: "395 - Navy", color: "0710", geliefertVorTagen: 30, profil: "gemischt" },
      { v: 3, colorbrand: "471 - Rosé", color: "0500", rabatt: 30, geliefertVorTagen: 110, profil: "knapp" },
    ],
    texts: {
      de: { lang: "Feiner Rundhalspullover aus Merinowolle, leicht tailliert.", kurz: "Merino-Pullover", material: "100 % Merinowolle extrafein." },
      fr: { lang: "Pull fin col rond en laine mérinos, légèrement cintré.", kurz: "Pull en mérinos", material: "100 % laine mérinos extrafine." },
    },
    related: [430105], silhouette: "strick", detailFoto: true,
  },
  {
    id: 430102, brand: "202", season: "W26", cat1: "0102", cat2: "0206", ref: "R2205", name: "Strickjacke mit Knöpfen",
    desc: "Strickjacke", table: "12", sizes: D_36_48, price: 169.95, wash: [4, 6, 8, 11, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "157 - Grau meliert", color: "0020", geliefertVorTagen: 44, profil: "gemischt" }],
    texts: {
      de: { lang: "Lange Strickjacke mit Hornknöpfen und Taschen.", kurz: "Lange Strickjacke", material: "70 % Wolle, 30 % Kaschmir." },
      fr: { lang: "Long gilet à boutons façon corne et poches.", kurz: "Long gilet", material: "70 % laine, 30 % cachemire." },
    },
    silhouette: "strick",
  },
  {
    id: 430103, brand: "202", season: "W26", cat1: "0102", cat2: "0206", ref: "R2310", name: "Pullover V-Ausschnitt",
    desc: "Pulli V", table: "12", sizes: D_36_48, price: 139.95, wash: [4, 6, 8, 11, 12], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "100 - Weiß", color: "0100", geliefertVorTagen: 18, profil: "gemischt" },
      { v: 2, colorbrand: "395 - Navy", color: "0710", geliefertVorTagen: 18, profil: "viel" },
    ],
    texts: {
      de: { lang: "Pullover aus Baumwolle mit V-Ausschnitt, gerade geschnitten.", kurz: "Pullover mit V-Ausschnitt", material: "100 % Baumwolle." },
    },
    silhouette: "strick",
  },
  {
    id: 430104, brand: "204", season: "W26", cat1: "0102", cat2: "0201", ref: "D31060W", name: "Steppjacke Giga",
    desc: "Giga", table: "10", sizes: D_XSXL, price: 219.0, wash: [2, 6, 7, 11, 13], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "10000 - Schwarz", color: "0001", rabatt: 30, geliefertVorTagen: 85, profil: "gemischt" },
      { v: 2, colorbrand: "10011 - Beige", color: "0200", neu: true, geliefertVorTagen: 5, profil: "viel" },
    ],
    texts: {
      de: { lang: "Taillierte Steppjacke mit tierfreier Wattierung und Kapuze.", kurz: "Taillierte Steppjacke", material: "100 % Nylon. Wattierung: PLUMTECH® 100 % Polyester." },
      fr: { lang: "Doudoune cintrée à ouatine sans matière animale, avec capuche.", kurz: "Doudoune cintrée", material: "100 % nylon. Ouatine : PLUMTECH® 100 % polyester." },
    },
    silhouette: "jacke",
  },
  {
    id: 430105, brand: "204", season: "W26", cat1: "0102", cat2: "0202", ref: "D40580W", name: "Mantel Lysa",
    desc: "Lysa", table: "10", sizes: D_XSXL, price: 329.0, wash: [2, 6, 7, 11, 13], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "10000 - Schwarz", color: "0001", geliefertVorTagen: 32, profil: "knapp" }],
    texts: {
      de: { lang: "Langer Steppmantel mit Kapuze und Zwei-Wege-Reißverschluss.", kurz: "Langer Steppmantel", material: "100 % Nylon. Wattierung: PLUMTECH® 100 % Polyester." },
      fr: { lang: "Long manteau matelassé à capuche et zip double sens.", kurz: "Long manteau matelassé", material: "100 % nylon. Ouatine : PLUMTECH® 100 % polyester." },
    },
    silhouette: "mantel",
  },
  {
    id: 430106, brand: "205", season: "W26", cat1: "0102", cat2: "0211", ref: "176890", name: "Bluse aus Viskose",
    desc: "Bluse Viskose", table: "10", sizes: D_XSXL, price: 99.95, wash: [5, 6, 8, 9, 12], houses: ["lanners"],
    variants: [
      { v: 1, colorbrand: "0001 - Weiß", color: "0100", geliefertVorTagen: 26, profil: "gemischt" },
      { v: 2, colorbrand: "6125 - Print", color: "1000", rabatt: 25, geliefertVorTagen: 120, profil: "knapp" },
    ],
    texts: {
      de: { lang: "Fließende Bluse mit verdeckter Knopfleiste und weiten Ärmeln.", kurz: "Fließende Bluse", material: "100 % Viskose (LENZING™ ECOVERO™)." },
      fr: { lang: "Blouse fluide à patte cachée et manches amples.", kurz: "Blouse fluide", material: "100 % viscose (LENZING™ ECOVERO™)." },
    },
    silhouette: "hemd",
  },
  {
    id: 430107, brand: "205", season: "W26", cat1: "0102", cat2: "0208", ref: "177212", name: "Jeans The Line",
    desc: "Jeans Line", table: "21", sizes: W_D, price: 129.95, wash: [3, 6, 7, 10, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "6098 - Blue", color: "0700", geliefertVorTagen: 15, profil: "gemischt" }],
    texts: {
      de: { lang: "Hoch sitzende Jeans mit geradem Bein.", kurz: "Gerade Jeans, hohe Taille", material: "99 % Baumwolle, 1 % Elasthan." },
      fr: { lang: "Jean taille haute à jambe droite.", kurz: "Jean droit taille haute", material: "99 % coton, 1 % élasthanne." },
    },
    silhouette: "jeans",
  },
  {
    id: 430108, brand: "201", season: "W26", cat1: "0102", cat2: "0203", ref: "50490010", name: "Blazer Jocaluah",
    desc: "Blazer", table: "12", sizes: D_34_44, price: 399.0, wash: [1, 6, 7, 10, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "001 - Schwarz", color: "0001", neu: true, geliefertVorTagen: 8, profil: "gemischt" }],
    texts: {
      de: { lang: "Taillierter Blazer aus Stretch-Schurwolle mit einem Knopf.", kurz: "Taillierter Blazer", material: "97 % Schurwolle, 3 % Elasthan." },
      fr: { lang: "Blazer cintré un bouton en laine vierge stretch.", kurz: "Blazer cintré", material: "97 % laine vierge, 3 % élasthanne." },
    },
    related: [430110], silhouette: "sakko",
  },
  {
    id: 430109, brand: "201", season: "W26", cat1: "0102", cat2: "0209", ref: "50491202", name: "Kleid aus Jersey",
    desc: "Kleid Jersey", table: "12", sizes: D_34_44, price: 279.0, wash: [5, 6, 8, 9, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "404 - Dark Blue", color: "0710", geliefertVorTagen: 29, profil: "knapp" }],
    texts: {
      de: { lang: "Knielanges Kleid aus fließendem Jersey mit Bindegürtel.", kurz: "Jerseykleid", material: "95 % Viskose, 5 % Elasthan." },
      fr: { lang: "Robe genou en jersey fluide avec ceinture à nouer.", kurz: "Robe en jersey", material: "95 % viscose, 5 % élasthanne." },
    },
    silhouette: "kleid",
  },
  {
    id: 430110, brand: "201", season: "W26", cat1: "0102", cat2: "0207", ref: "50490011", name: "Hose Tiluna",
    desc: "Hose Tiluna", table: "12", sizes: D_34_44, price: 199.0, wash: [1, 6, 7, 10, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "001 - Schwarz", color: "0001", geliefertVorTagen: 8, profil: "gemischt" }],
    texts: {
      de: { lang: "Schmale Hose mit Bügelfalte, passend zum Blazer.", kurz: "Hose mit Bügelfalte", material: "97 % Schurwolle, 3 % Elasthan." },
      fr: { lang: "Pantalon étroit à pli marqué, assorti au blazer.", kurz: "Pantalon à pli", material: "97 % laine vierge, 3 % élasthanne." },
    },
    related: [430108], silhouette: "hose",
  },
  {
    id: 430111, brand: "201", season: "W26", cat1: "0102", cat2: "0211", ref: "50490551", name: "Bluse Banora",
    desc: "Bluse Banora", table: "12", sizes: D_34_44, price: 149.0, wash: [5, 6, 8, 9, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "118 - Offwhite", color: "0100", geliefertVorTagen: 41, profil: "gemischt" }],
    texts: {
      de: { lang: "Bluse aus Seidenmischung mit Stehkragen.", kurz: "Bluse mit Stehkragen", material: "70 % Viskose, 30 % Seide." },
    },
    silhouette: "hemd",
  },
  {
    id: 430112, brand: "206", season: "W26", cat1: "0102", cat2: "0201", ref: "361000", name: "Jacke mit Kapuze Damen",
    desc: "Damenjacke", table: "12", sizes: D_36_46, price: 219.95, wash: [2, 6, 7, 9, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "35 - Olive", color: "0600", geliefertVorTagen: 23, profil: "gemischt" }],
    texts: {
      de: { lang: "Wasserabweisende Jacke mit abnehmbarer Kapuze und Kordelzug in der Taille.", kurz: "Wasserabweisende Jacke", material: "100 % Polyester (recycelt)." },
      fr: { lang: "Veste déperlante à capuche amovible et cordon à la taille.", kurz: "Veste déperlante", material: "100 % polyester (recyclé)." },
    },
    silhouette: "jacke",
  },
  {
    id: 430113, brand: "202", season: "W26", cat1: "0102", cat2: "0225", ref: "R9001", name: "Schal Kaschmirmischung",
    desc: "Schal Kaschmir", table: "16", sizes: TU, price: 99.95, wash: [4, 6, 8, 11, 12], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "248 - Camel", color: "0200", geliefertVorTagen: 12, bestand: { lanners: { TU: 5 } } }],
    texts: {
      de: { lang: "Großer, weicher Schal aus Wolle und Kaschmir.", kurz: "Schal mit Kaschmir", material: "80 % Wolle, 20 % Kaschmir." },
      fr: { lang: "Grande écharpe douce en laine et cachemire.", kurz: "Écharpe avec cachemire", material: "80 % laine, 20 % cachemire." },
    },
    silhouette: "schal",
  },
  {
    id: 430114, brand: "205", season: "W26", cat1: "0102", cat2: "0224", ref: "177901", name: "Shopper aus Leder",
    desc: "Shopper Leder", table: "16", sizes: TU, price: 159.95, wash: [1], houses: ["lanners"],
    variants: [{ v: 1, colorbrand: "0008 - Schwarz", color: "0001", neu: true, geliefertVorTagen: 4, bestand: { lanners: { TU: 1 } } }],
    texts: {
      de: { lang: "Großer Shopper aus weichem Leder mit Innentasche.", kurz: "Shopper aus Leder", material: "100 % Rindleder. Futter 100 % Baumwolle." },
      fr: { lang: "Grand cabas en cuir souple avec poche intérieure.", kurz: "Cabas en cuir", material: "100 % cuir de vachette. Doublure 100 % coton." },
    },
    silhouette: "tasche",
  },
];

/**
 * Demo-Fotos je Artikel: Stockfotos (Unsplash-Lizenz), einheitlich freigestellt auf
 * Weiß (scripts/demo-fotos/aufbereiten.py) als WebP in public/demo-fotos/:
 * demo-<id>-1.webp (Freisteller) und demo-<id>-2.webp (Detail), je 900 und 480 px
 * breit. Liste mit Quelle und Fotograf: scripts/demo-fotos/fotos.json, Nachweis in
 * src/content/bildnachweis.json. Nur zur Demo, sie zeigen nicht den echten Artikel
 * (D10.8). Fehlt ein Artikel in der Liste, bleibt die Strichzeichnung der Silhouette.
 */
export const demoFotos = new Set<number>(demoFotoListe.map((f) => f.uid));
