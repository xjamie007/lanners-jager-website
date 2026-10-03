/**
 * Erzeugt die Demo-Fixtures im exakten Format der SoftTouch-Doku.
 *
 *   node scripts/build-fixtures.ts
 *
 * Ausgabe: supabase/functions/_shared/softtouch/fixtures/*.json
 * Bestände mit festem Zufallssamen, damit alle Zustände der Größenleiste
 * vorkommen (viel, letztes Stück, null, nur ein Haus, beide Häuser, 2D, TU).
 * Die Daten sind relativ zu GENERATED_ON; der Mock-Client verschiebt alle Daten
 * zur Laufzeit auf "heute", damit die Demo frisch bleibt.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { articles, demoFotos, type ArticleSpec, type HouseKey, type Profile } from "./fixtures/spec.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "supabase/functions/_shared/softtouch/fixtures");
export const GENERATED_ON = "2026-10-01";
const SEED = 20261001;
const STORE: Record<HouseKey, string> = { lanners: "01", jager: "02" };

// ── Zufall mit festem Samen ────────────────────────────────────────────────
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const pad2 = (n: number) => String(n).padStart(2, "0");

// ── Stammdaten ─────────────────────────────────────────────────────────────
const dummyY = [{ pos: 1, txt: "" }];
const seq = (labels: string[]) => labels.map((txt, i) => ({ pos: i + 1, txt }));
const sizetables = [
  { key: "10", txt: "Konfektion XS-4XL", active: true, priority: 1, sizeX: seq(["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"]), sizeY: dummyY },
  { key: "11", txt: "Herren Konfektion 44-60", active: true, priority: 2, sizeX: seq(["44", "46", "48", "50", "52", "54", "56", "58", "60"]), sizeY: dummyY },
  { key: "12", txt: "Damen Konfektion 32-50", active: true, priority: 3, sizeX: seq(["32", "34", "36", "38", "40", "42", "44", "46", "48", "50"]), sizeY: dummyY },
  { key: "13", txt: "Hemden Kragenweite 37-46", active: true, priority: 4, sizeX: seq(["37", "38", "39", "40", "41", "42", "43", "44", "45", "46"]), sizeY: dummyY },
  { key: "14", txt: "Hutgrößen 54-62", active: true, priority: 5, sizeX: seq(["54", "55", "56", "57", "58", "59", "60", "61", "62"]), sizeY: dummyY },
  { key: "15", txt: "Gürtel 80-120", active: true, priority: 6, sizeX: seq(["80", "85", "90", "95", "100", "105", "110", "115", "120"]), sizeY: dummyY },
  { key: "16", txt: "Einheitsgröße", active: true, priority: 0, sizeX: seq(["TU"]), sizeY: dummyY },
  { key: "20", txt: "Herren Jeans 28-40 mit Länge", active: true, priority: 7, sizeX: seq(["28", "29", "30", "31", "32", "33", "34", "36", "38", "40"]), sizeY: seq(["L30", "L32", "L34", "L36"]) },
  { key: "21", txt: "Damen Jeans 24-34 mit Länge", active: true, priority: 8, sizeX: seq(["24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34"]), sizeY: seq(["L30", "L32", "L34"]) },
];

const stores = [
  {
    key: "01", txt: "Confection Lanners", sort: 1, active: "T", customer_card_group: "", corporation_id: "01", gln: "", surface: 520, rent: 0,
    value1: "", value2: "", status1: "", status2: "", region: "", color: "",
    shipping_name: "Confection Lanners", shipping_company: "", shipping_street_name: "Grand-Rue", shipping_street_number: "18",
    shipping_zip: "9050", shipping_city: "Ettelbruck", shipping_country_iso: "LU", shipping_email: "", shipping_phone: "", must_use_transfer_code: false,
  },
  {
    key: "02", txt: "Jager-Oberlinkels", sort: 2, active: "T", customer_card_group: "", corporation_id: "02", gln: "", surface: 0, rent: 0,
    value1: "", value2: "", status1: "", status2: "", region: "", color: "",
    shipping_name: "Jager-Oberlinkels", shipping_company: "", shipping_street_name: "Grand-Rue", shipping_street_number: "32",
    shipping_zip: "9050", shipping_city: "Ettelbruck", shipping_country_iso: "LU", shipping_email: "", shipping_phone: "", must_use_transfer_code: false,
  },
];

const seasons = [
  { id: "NOS", description: "Never out of stock", detail1: "", detail2: "", detail3: "", detail4: "", detail5: "", active: true, visible: true, from_date: null, to_date: null, lang1: null, lang2: null, lang3: null, lang4: null, lang5: null, web_visible: true },
  { id: "W25", description: "Winter 2025", detail1: "", detail2: "", detail3: "", detail4: "", detail5: "", active: true, visible: true, from_date: "2025-08-01", to_date: "2026-01-31", lang1: null, lang2: null, lang3: null, lang4: null, lang5: null, web_visible: true },
  { id: "W26", description: "Winter 2026", detail1: "", detail2: "", detail3: "", detail4: "", detail5: "", active: true, visible: true, from_date: "2026-08-01", to_date: "2027-01-31", lang1: null, lang2: null, lang3: null, lang4: null, lang5: null, web_visible: true },
];

const brandList: [string, string, string][] = [
  ["101", "Barbour", ""],
  ["102", "Lacoste", ""],
  ["103", "Levi Strauss & Co.", "Levi's"],
  ["104", "Stetson", ""],
  ["105", "Gardeur", ""],
  ["106", "Fynch Hatton", ""],
  ["201", "Hugo Boss", "Boss"],
  ["202", "Maerz", ""],
  ["203", "PME Legend", ""],
  ["204", "Save the Duck", ""],
  ["205", "Scotch & Soda", ""],
  ["206", "Camel Active", ""],
  ["207", "State of Art", ""],
];
const brands = brandList.map(([key, name, alias]) => ({
  key, name, alias, category1: "0100", category2: "0200", category3: "0300", category4: "0400", category5: "0500",
  supplier: "", address: "", postal_code: "", city: "", country_iso: "", telephone: "", telephone_2: "", fax: "", email: "", website: "", vat: "", miscellaneous: "",
  markup: 2.5, size_table_id: "10", commercial_discount: 0, on_customer_card: true, customer_card_percentage: 0, article_discount_allowed: true,
  active: true, stockbase: false, webshop_visible: true,
}));

const cat = (key: string, de: string, fr: string, en: string) => ({
  key, group_id: key.slice(0, 2), description: de, alias: de, lang1: de, lang2: fr, lang3: en, lang4: "", lang5: "", active: true,
});
const categories = [
  cat("0100", "Keine", "Aucune", "None"), cat("0101", "Herren", "Homme", "Men"), cat("0102", "Damen", "Femme", "Women"),
  cat("0200", "Keine", "Aucune", "None"), cat("0201", "Jacken", "Vestes", "Jackets"), cat("0202", "Mäntel", "Manteaux", "Coats"),
  cat("0203", "Anzüge & Sakkos", "Costumes & blazers", "Suits & blazers"), cat("0204", "Hemden", "Chemises", "Shirts"),
  cat("0205", "Polos & T-Shirts", "Polos & T-shirts", "Polos & T-shirts"), cat("0206", "Strick", "Mailles", "Knitwear"),
  cat("0207", "Hosen", "Pantalons", "Trousers"), cat("0208", "Jeans", "Jeans", "Jeans"), cat("0209", "Kleider", "Robes", "Dresses"),
  cat("0210", "Wäsche", "Sous-vêtements", "Underwear"), cat("0211", "Blusen & Shirts", "Blouses & tops", "Blouses & tops"),
  cat("0221", "Hüte", "Chapeaux", "Hats"), cat("0222", "Mützen & Kappen", "Bonnets & casquettes", "Beanies & caps"),
  cat("0223", "Gürtel", "Ceintures", "Belts"), cat("0224", "Taschen & Lederwaren", "Sacs & maroquinerie", "Bags & leather goods"),
  cat("0225", "Schals", "Écharpes", "Scarves"),
];

const col = (id: string, description: string, hex: string, de: string, fr: string, en: string) => ({
  id, description, colorlong: parseInt(hex.slice(5, 7) + hex.slice(3, 5) + hex.slice(1, 3), 16), colorhex: hex, active: true,
  lang1: de, lang2: fr, lang3: en, lang4: "", lang5: "",
});
const colors = [
  col("0001", "SCHWARZ", "#000000", "Schwarz", "Noir", "Black"),
  col("0020", "GRAU", "#808080", "Grau", "Gris", "Grey"),
  col("0100", "WEISS", "#ffffff", "Weiß", "Blanc", "White"),
  col("0200", "BEIGE", "#d8c8a8", "Beige", "Beige", "Beige"),
  col("0300", "BRAUN", "#7a5230", "Braun", "Marron", "Brown"),
  col("0400", "ROT", "#c00000", "Rot", "Rouge", "Red"),
  col("0410", "BORDEAUX", "#6d1a2a", "Bordeaux", "Bordeaux", "Burgundy"),
  col("0500", "ROSA", "#e8b4b8", "Rosa", "Rose", "Pink"),
  col("0600", "GRÜN", "#4b5d3a", "Grün", "Vert", "Green"),
  col("0700", "BLAU", "#3a5a8c", "Blau", "Bleu", "Blue"),
  col("0710", "MARINE", "#1c2a44", "Marine", "Marine", "Navy"),
  col("1000", "Multi color", "#000000", "Mehrfarbig", "Multicolore", "Multicolour"),
];

const file_presets = [
  { id: "01", description: "Hauptfoto" },
  { id: "02", description: "Zusatzfoto" },
  { id: "03", description: "Stimmung" },
];
const text_presets = [
  { id: "S1", description: "Composition dutch" }, { id: "S2", description: "Composition french" }, { id: "S3", description: "Composition english" },
  { id: "SA", description: "SEO dutch" }, { id: "SB", description: "SEO french" }, { id: "SC", description: "SEO english" },
  { id: "S5", description: "Wash Instructions" }, { id: "S6", description: "Bleach Instructions" }, { id: "S7", description: "Dry Instructions" },
  { id: "S8", description: "Iron Instructions" }, { id: "S9", description: "DryClean Instructions" },
  { id: "SJ", description: "Long Description dutch" }, { id: "SK", description: "Long Description french" }, { id: "SL", description: "Long Description english" },
  { id: "SM", description: "Short Description dutch" }, { id: "SN", description: "Short Description french" }, { id: "SO", description: "Short Description english" },
  // ANNAHME für die Demo: kundeneigene Presets für Deutsch (OP-04.7)
  { id: "D1", description: "Lange Beschreibung deutsch" }, { id: "D2", description: "Kurze Beschreibung deutsch" }, { id: "D3", description: "Zusammensetzung deutsch" },
];

const w = (id: number, kind: string, sort: number, nl: string, fr: string, en: string, img: string) => ({
  id, kind, sort, title_nl: nl, title_fr: fr, title_en: en, description_nl: "", description_fr: "", description_en: "", image_name: img,
  active: true, user_create: "1001", user_modify: "1001", created_at: "2020-12-11 12:53:43", updated_at: "2020-12-11 12:53:43",
});
const wash_instructions = [
  w(1, "56001", 0, "Niet wassen", "Ne pas laver", "Do not wash", "donotwash.png"),
  w(2, "56001", 1, "Wassen op 30 °C", "Laver à 30 °C", "Wash at 30 °C", "wash30.png"),
  w(3, "56001", 2, "Wassen op 40 °C", "Laver à 40 °C", "Wash at 40 °C", "wash40.png"),
  w(4, "56001", 3, "Handwas", "Lavage à la main", "Hand wash", "handwash.png"),
  w(5, "56001", 4, "Fijne was op 30 °C", "Lavage délicat à 30 °C", "Delicate wash at 30 °C", "wash30gentle.png"),
  w(14, "56001", 5, "Met koud water afsponsen", "Nettoyer à l'éponge à l'eau froide", "Sponge clean with cold water", "sponge.png"),
  w(6, "56002", 0, "Niet bleken", "Ne pas blanchir", "Do not bleach", "donotbleach.png"),
  w(7, "56003", 0, "Niet in de droogtrommel", "Ne pas sécher en tambour", "Do not tumble dry", "donottumbledry.png"),
  w(8, "56003", 1, "Liggend drogen", "Séchage à plat", "Dry flat", "dryflat.png"),
  w(9, "56004", 0, "Strijken op lage temperatuur", "Repasser à basse température", "Iron at low temperature", "ironlow.png"),
  w(10, "56004", 1, "Strijken op middelhoge temperatuur", "Repasser à température moyenne", "Iron at medium temperature", "ironmedium.png"),
  w(11, "56004", 2, "Niet strijken", "Ne pas repasser", "Do not iron", "donotiron.png"),
  w(12, "56005", 0, "Professionele droogreiniging", "Nettoyage à sec professionnel", "Professional dry cleaning", "dryclean.png"),
  w(13, "56005", 1, "Niet chemisch reinigen", "Ne pas nettoyer à sec", "Do not dry clean", "donotdryclean.png"),
];

// ── Hilfen ─────────────────────────────────────────────────────────────────
function ean13(base12: string): string {
  const digits = base12.split("").map(Number);
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0);
  return base12 + String((10 - (sum % 10)) % 10);
}

function stockFor(profile: Profile): number {
  const r = rnd();
  switch (profile) {
    case "viel":
      return r < 0.08 ? 1 : 2 + Math.floor(rnd() * 6);
    case "gemischt":
      return r < 0.25 ? 0 : r < 0.5 ? 1 : 2 + Math.floor(rnd() * 4);
    case "knapp":
      return r < 0.5 ? 0 : r < 0.85 ? 1 : 2;
    case "leer":
      return 0;
  }
}

function sizeAxes(a: ArticleSpec): { xs: string[]; ys: string[] } {
  if (Array.isArray(a.sizes[0])) {
    const [xs, ys] = a.sizes as [string[], string[]];
    return { xs, ys };
  }
  return { xs: a.sizes as string[], ys: [""] };
}

function textBlock(a: ArticleSpec) {
  const texts: { type: string; variant: number; sort: number; text: string }[] = [];
  if (a.texts.de) {
    texts.push({ type: "D1", variant: 0, sort: 1, text: a.texts.de.lang });
    texts.push({ type: "D2", variant: 0, sort: 1, text: a.texts.de.kurz });
    texts.push({ type: "D3", variant: 0, sort: 1, text: a.texts.de.material });
  }
  if (a.texts.fr) {
    texts.push({ type: "SK", variant: 0, sort: 1, text: a.texts.fr.lang });
    texts.push({ type: "SN", variant: 0, sort: 1, text: a.texts.fr.kurz });
    texts.push({ type: "S2", variant: 0, sort: 1, text: a.texts.fr.material });
  }
  return texts;
}

// ── Produkte ───────────────────────────────────────────────────────────────
type Rec = Record<string, unknown> & { key: number };
const products: Rec[] = [];
const priceHistory: Record<string, { von: number; bis: number; netto_price: number }[]> = {};
let sortIndex = 0;

function buildArticle(a: ArticleSpec, opts: { online: number }): Rec[] {
  const out: Rec[] = [];
  const table = sizetables.find((t) => t.key === a.table)!;
  const { xs, ys } = sizeAxes(a);
  for (const v of a.variants) {
    sortIndex += 10;
    const uid8 = `${a.id}${pad2(v.v)}`;
    const firstDelivery = addDays(GENERATED_ON, -(v.geliefertVorTagen ?? 30));
    const lastDelivery = addDays(firstDelivery, Math.min(v.geliefertVorTagen ?? 30, Math.floor(rnd() * 20)));
    const netto = v.rabatt ? Math.round(a.price * (1 - v.rabatt / 100) * 100) / 100 : a.price;
    const saleStartDaysAgo = v.rabatt ? (a.id === 410103 ? 12 : a.id === 430104 ? 5 : a.id === 420106 ? 50 : 12) : 0;
    const files = demoFotos.has(a.id)
      ? [
          { type: "01", variant: v.v, sort: 1, file: `demo-${a.id}-1.webp` },
          // Detail: Preset 03 (Zusatzbild, füllt den Rahmen), siehe src/config/softtouch.ts
          { type: "03", variant: v.v, sort: 2, file: `demo-${a.id}-2.webp` },
        ]
      : [
          { type: "01", variant: v.v, sort: 1, file: `demo-${a.silhouette}-1.svg` },
          { type: "02", variant: v.v, sort: 2, file: `demo-${a.silhouette}-2.svg` },
          ...(a.detailFoto ? [{ type: "03", variant: v.v, sort: 3, file: `demo-detail.svg` }] : []),
        ];
    const related = (a.related ?? []).map((id) => ({ related: `${id}01` }));
    for (const house of a.houses) {
      const store = STORE[house];
      for (const [xi, xLabel] of xs.entries()) {
        for (const [yi, yLabel] of ys.entries()) {
          const label = yLabel ? `${xLabel}/${yLabel}` : xLabel;
          if (v.nurGroessen && !v.nurGroessen.includes(label)) continue;
          const xPos = table.sizeX.find((s) => s.txt === xLabel)!.pos;
          const yPos = yLabel ? table.sizeY.find((s) => s.txt === yLabel)!.pos : 1;
          const explicit = v.bestand?.[house]?.[label];
          let stock = explicit ?? stockFor(v.profil ?? "gemischt");
          // Für Artikel in beiden Häusern: einige Größen nur in einem Haus
          if (explicit === undefined && a.houses.length > 1 && house === "lanners" && rnd() < 0.35) stock = 0;
          const key = Number(`${uid8}${pad2(xPos)}${pad2(yPos)}${store}`);
          const backorder = v.nachlieferungTage ? 2 + Math.floor(rnd() * 3) : 0;
          const reserved = rnd() < 0.15 ? 1 : 0;
          out.push({
            key,
            id: a.id,
            edi: ean13(`20${String(a.id).slice(1)}${pad2(v.v)}${pad2(xPos)}${yPos}`.slice(0, 12).padEnd(12, "0")),
            variant: v.v,
            store,
            season: a.season,
            brand: a.brand,
            detail1: a.ref,
            detail2: a.name,
            detail3: "",
            detail4: "",
            detail5: "DEMO",
            description: a.desc,
            description2: "",
            description3: "",
            description4: "",
            description5: "",
            color: v.color,
            colorbrand: v.colorbrand,
            sizetable: a.table,
            sizeX: pad2(xPos),
            sizeY: pad2(yPos),
            sizeXdescription: xLabel,
            sizeYdescription: yLabel,
            stock,
            backorder,
            order: stock + backorder + reserved,
            delivery: stock + reserved,
            price: a.price,
            salesprice: 0,
            salesdiscount: v.rabatt ?? 0,
            salesstart: v.rabatt ? addDays(GENERATED_ON, -saleStartDaysAgo) : null,
            salesend: v.rabatt ? addDays(GENERATED_ON, 40) : null,
            discount_date: GENERATED_ON,
            discount_percentage: v.rabatt ?? 0,
            discount_value: Math.round((a.price - netto) * 100) / 100,
            article_discount_allowed: true,
            article_customer_discount_allowed: true,
            netto_price: netto,
            vat: 17,
            category1: a.cat1,
            category2: a.cat2,
            category3: "",
            category4: "",
            category5: "",
            category6: "",
            category7: "",
            online: opts.online,
            status: "A",
            timestamp: `${addDays(GENERATED_ON, -1 - Math.floor(rnd() * 10))} ${pad2(8 + Math.floor(rnd() * 10))}:${pad2(Math.floor(rnd() * 60))}:${pad2(Math.floor(rnd() * 60))}`,
            texts: textBlock(a),
            files,
            related,
            wash_instructions: a.wash,
            // display=full
            order_number: "",
            reorder: 0,
            sold: Math.floor(rnd() * 12),
            full_stock: stock + reserved,
            return: 0,
            transfer: 0,
            customer_order_quantity: 0,
            wholesale_price: Math.round((a.price / 2.4) * 100) / 100,
            online2: 0,
            online3: 0,
            online4: 0,
            online5: 0,
            first_delivery: firstDelivery,
            last_delivery: lastDelivery,
            expected_delivery: v.nachlieferungTage ? addDays(GENERATED_ON, v.nachlieferungTage) : null,
            in_the_picture: v.neu === true,
            online_sort: sortIndex,
          });
          if (v.rabatt) {
            const segs: { von: number; bis: number; netto_price: number }[] = [];
            const start = saleStartDaysAgo;
            if (a.id === 410103) {
              // Aktion vor 38 bis 36 Tagen mit −10 %: liegt im 30-Tage-Fenster vor der Preissenkung
              segs.push({ von: 45, bis: 39, netto_price: a.price });
              segs.push({ von: 38, bis: 36, netto_price: Math.round(a.price * 0.9 * 100) / 100 });
              segs.push({ von: 35, bis: start + 1, netto_price: a.price });
            } else if (start < 45) {
              segs.push({ von: 45, bis: start + 1, netto_price: a.price });
            }
            segs.push({ von: Math.min(start, 45), bis: 0, netto_price: netto });
            priceHistory[String(key)] = segs;
          }
        }
      }
    }
  }
  return out;
}

for (const a of articles) products.push(...buildArticle(a, { online: 1 }));
products.sort((x, y) => x.key - y.key);

// ── Offline-Historie: Artikel, die online waren und es nicht mehr sind ──────
const offlineSpecs: (ArticleSpec & { offlineVorTagen: number })[] = [
  {
    id: 410901, brand: "101", season: "W25", cat1: "0101", cat2: "0201", ref: "MWX0018", name: "Bedale Wax Jacket", desc: "Bedale", table: "10",
    sizes: ["M", "L", "XL"], price: 379.95, wash: [14, 6, 7, 11, 13], houses: ["jager"], offlineVorTagen: 5,
    variants: [{ v: 1, colorbrand: "SG51 - Sage", color: "0600", geliefertVorTagen: 200, bestand: { jager: { M: 0, L: 0, XL: 0 } } }],
    texts: {
      de: { lang: "Kurze, gewachste Reitjacke mit Cordkragen.", kurz: "Kurze Wachsjacke", material: "100 % Baumwolle, gewachst." },
      fr: { lang: "Veste d'équitation courte en coton ciré, col en velours.", kurz: "Veste cirée courte", material: "100 % coton ciré." },
    },
    silhouette: "jacke",
  },
  {
    id: 420901, brand: "201", season: "W25", cat1: "0101", cat2: "0203", ref: "50479000", name: "Sakko Hutson", desc: "Sakko Hutson", table: "11",
    sizes: ["48", "50", "52"], price: 399.0, wash: [1, 6, 7, 10, 12], houses: ["lanners"], offlineVorTagen: 40,
    variants: [{ v: 1, colorbrand: "001 - Schwarz", color: "0001", geliefertVorTagen: 260, bestand: { lanners: { "48": 0, "50": 0, "52": 0 } } }],
    texts: { de: { lang: "Sakko aus Schurwolle.", kurz: "Sakko", material: "100 % Schurwolle." } },
    silhouette: "sakko",
  },
];
const offline = offlineSpecs.map((s) => ({ offlineVorTagen: s.offlineVorTagen, products: buildArticle(s, { online: 0 }) }));

// ── Schreiben ──────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const write = (name: string, data: unknown) => writeFileSync(join(OUT, name), JSON.stringify(data, null, 1) + "\n");
write("stores.json", stores);
write("seasons.json", seasons);
write("brands.json", brands);
write("categories.json", categories);
write("colors.json", colors);
write("sizetables.json", sizetables);
write("file_presets.json", file_presets);
write("text_presets.json", text_presets);
write("wash_instructions.json", wash_instructions);
write("products.json", products);
write("offline-history.json", offline);
write("price-history.json", priceHistory);
write("meta.json", {
  generatedOn: GENERATED_ON,
  seed: SEED,
  hinweis: "DEMO-DATEN. Erzeugt mit scripts/build-fixtures.ts aus scripts/fixtures/spec.ts. Nie in eine Produktivumgebung.",
  articles: articles.length,
  uid8: new Set(products.map((p) => String(p.key).slice(0, 8))).size,
  records: products.length,
});

const uid8s = new Set(products.map((p) => String(p.key).slice(0, 8)));
const stockStates = { null: 0, eins: 0, viel: 0 };
for (const p of products) {
  const s = p.stock as number;
  if (s === 0) stockStates.null++;
  else if (s === 1) stockStates.eins++;
  else stockStates.viel++;
}
console.log(`Fixtures: ${articles.length} Artikel, ${uid8s.size} Produktseiten (uid8), ${products.length} Schlüssel. Bestand:`, stockStates);
