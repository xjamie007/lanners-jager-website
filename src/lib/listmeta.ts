/**
 * Titel, Überschrift und Brotkrumen der Listenseiten, je Sprache.
 */
import warengruppen from "../content/warengruppen.json" with { type: "json" };
import { t, localized, type Lang } from "../i18n/index.ts";
import { getHouse } from "../config/houses.ts";
import { link } from "./page.ts";
import type { ListDef } from "./lists.ts";
import type { Catalog } from "./catalog/types.ts";

type Leaf = string | { text: string };
const abt = warengruppen.abteilungen as unknown as Record<string, { name: Record<string, Leaf>; fuer: Record<string, Leaf> }>;
export const gruppeName = (id: string, lang: Lang) => localized(warengruppen.warengruppen.find((g) => g.id === id)!.name as never, lang);
export const abteilungName = (id: "damen" | "herren", lang: Lang) => localized(abt[id].name as never, lang);

/** "bei Lanners und Jager in der Grand-Rue von Ettelbruck" oder "bei Lanners, Grand-Rue 18 in Ettelbruck" */
function ortText(houses: string[], lang: Lang): string {
  if (houses.length > 1) return t(lang, "seo.ortBeide");
  const h = getHouse(houses[0]);
  return t(lang, "seo.ortEins", { haus: h.short, nr: h.nr });
}

/**
 * Description auf 150 bis 160 Zeichen bringen (G2): zu kurze mit sachlichen
 * Zusätzen ergänzen (der erste, der passt), zu lange am Satzende kürzen.
 */
export function descriptionLaenge(desc: string, zusaetze: string[]): string {
  let d = desc.trim();
  if (d.length > 160) {
    const satz = d.slice(0, 161).lastIndexOf(". ");
    d = satz >= 100 ? d.slice(0, satz + 1) : d.slice(0, 159).replace(/\s+\S*$/, "") + "…";
  }
  for (const z of zusaetze) {
    if (d.length >= 150) break;
    if ((d + z).length <= 160) d += z;
  }
  return d;
}
const listenZusaetze = (lang: Lang) => [t(lang, "seo.zusatzLive"), t(lang, "seo.zusatzReservieren")];

export function listMeta(list: ListDef, lang: Lang, cat: Catalog, page: number) {
  const home = { name: t(lang, "nav.start"), href: link(lang, "home") };
  const articles = list.uids.map((u) => cat.byUid8.get(u)!);
  const houses = [...new Set(articles.flatMap((a) => a.houses))].sort();
  let h1 = "";
  let title = "";
  let desc = "";
  let intro: string | null = null;
  const crumbs = [home];
  switch (list.kind) {
    case "sortiment":
      h1 = t(lang, "liste.sortimentH1");
      title = t(lang, "seo.sortiment.title");
      desc = t(lang, "seo.sortiment.desc");
      break;
    case "neu":
      h1 = t(lang, "liste.neuH1");
      title = t(lang, "seo.neu.title");
      desc = t(lang, "seo.neu.desc");
      break;
    case "sale":
      h1 = t(lang, "liste.saleH1");
      title = t(lang, "seo.sale.title");
      desc = t(lang, "seo.sale.desc");
      break;
    case "abteilung":
      h1 = abteilungName(list.abteilung!, lang);
      title = t(lang, `seo.${list.abteilung}.title`);
      desc = t(lang, `seo.${list.abteilung}.desc`);
      break;
    case "accessoires":
      h1 = t(lang, "nav.accessoires");
      title = t(lang, "seo.accessoires.title");
      desc = t(lang, "seo.accessoires.desc");
      break;
    case "gruppe": {
      const name = gruppeName(list.gruppe!, lang);
      h1 = name;
      if (list.abteilung) {
        crumbs.push({ name: abteilungName(list.abteilung, lang), href: link(lang, { kind: "abteilung", id: list.abteilung }) });
        const fuer = localized(abt[list.abteilung].fuer as never, lang);
        title = t(lang, "seo.warengruppeTitle", { warengruppe: name, fuer });
        desc = t(lang, "seo.warengruppeDesc", { warengruppe: name, fuer, ort: ortText(houses, lang) });
      } else {
        crumbs.push({ name: t(lang, "nav.accessoires"), href: link(lang, { kind: "accessoires" }) });
        title = t(lang, "seo.accGruppeTitle", { warengruppe: name });
        desc = t(lang, "seo.accGruppeDesc", { warengruppe: name, ort: ortText(houses, lang) });
      }
      if (title.length > 60) title = title.replace(t(lang, "seo.suffix"), "");
      break;
    }
    case "marke": {
      const b = cat.brands.find((x) => x.slug === list.marke)!;
      crumbs.push({ name: t(lang, "nav.marken"), href: link(lang, "marken") });
      h1 = t(lang, "marken.h1Marke", { marke: b.name });
      title = t(lang, "seo.markeTitle", { marke: b.name });
      if (title.length > 60) title = title.replace(t(lang, "seo.suffix"), "");
      if (b.houses.length > 1) intro = t(lang, "marken.vorlageBeide", { marke: b.name });
      else {
        const h = getHouse(b.houses[0]);
        intro = t(lang, "marken.vorlageEins", { marke: b.name, haus: h.short, nr: h.nr });
      }
      desc = descriptionLaenge(intro, [t(lang, "seo.markeDescZusatz"), ...listenZusaetze(lang)]);
      break;
    }
  }
  crumbs.push({ name: h1, href: link(lang, list.ref) });
  if (list.kind !== "marke") desc = descriptionLaenge(desc, listenZusaetze(lang));
  if (page > 1) {
    // "Herren (Seite 2) | Lanners & Jager", wenn der lange Title mit Seitenzahl zu lang wird
    const seite = t(lang, "seo.seite", { n: page });
    title = (title + seite).length <= 60 ? title + seite : `${h1}${seite}${t(lang, "seo.suffix")}`;
  }
  return { h1, title, desc, intro, crumbs, houses };
}
