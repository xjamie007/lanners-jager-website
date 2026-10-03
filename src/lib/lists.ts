/**
 * Listenseiten (D3): Sortiment, Neu, Sale, Abteilung, Hüte & Accessoires,
 * Warengruppe, Marke. Statisch zu 48 Artikeln je Seite (/seite/2/).
 */
import warengruppen from "../content/warengruppen.json" with { type: "json" };
import type { PageRef } from "../i18n/routes.ts";
import { sortRecommended } from "./catalog/assemble.ts";
import type { Article, Catalog } from "./catalog/types.ts";

export const PAGE_SIZE = 48;

export interface ListDef {
  id: string;
  kind: "sortiment" | "neu" | "sale" | "abteilung" | "accessoires" | "gruppe" | "marke";
  ref: PageRef;
  uids: string[];
  abteilung?: "damen" | "herren";
  gruppe?: string;
  marke?: string;
  /** Untergruppen für die Navigation der Liste */
  untergruppen?: { gruppe: string; ref: PageRef; count: number }[];
}

export function pageCount(l: ListDef): number {
  return Math.max(1, Math.ceil(l.uids.length / PAGE_SIZE));
}

const isSale = (a: Article) => a.nettoCents < a.priceCents;

export function listDefinitions(cat: Catalog): ListDef[] {
  const online = sortRecommended(cat.online);
  const ids = (list: Article[]) => list.map((a) => a.uid8);
  const lists: ListDef[] = [
    { id: "sortiment", kind: "sortiment", ref: { kind: "static", route: "sortiment" }, uids: ids(online) },
    { id: "neu", kind: "neu", ref: { kind: "static", route: "neu" }, uids: ids(online.filter((a) => a.inThePicture)) },
    { id: "sale", kind: "sale", ref: { kind: "static", route: "sale" }, uids: ids(online.filter(isSale)) },
  ];

  for (const abt of ["damen", "herren"] as const) {
    const inAbt = online.filter((a) => a.abteilung === abt);
    const gruppen = warengruppen.warengruppen.filter((g) => !g.accessoire && inAbt.some((a) => a.gruppe === g.id));
    lists.push({
      id: `abt:${abt}`,
      kind: "abteilung",
      abteilung: abt,
      ref: { kind: "abteilung", id: abt },
      uids: ids(inAbt),
      untergruppen: gruppen.map((g) => ({
        gruppe: g.id,
        ref: { kind: "warengruppe", abteilung: abt, gruppe: g.id },
        count: inAbt.filter((a) => a.gruppe === g.id).length,
      })),
    });
    for (const g of gruppen) {
      lists.push({
        id: `grp:${abt}:${g.id}`,
        kind: "gruppe",
        abteilung: abt,
        gruppe: g.id,
        ref: { kind: "warengruppe", abteilung: abt, gruppe: g.id },
        uids: ids(inAbt.filter((a) => a.gruppe === g.id)),
      });
    }
  }

  const acc = online.filter((a) => a.accessoire);
  const accGruppen = warengruppen.warengruppen.filter((g) => g.accessoire && acc.some((a) => a.gruppe === g.id));
  lists.push({
    id: "acc",
    kind: "accessoires",
    ref: { kind: "accessoires" },
    uids: ids(acc),
    untergruppen: accGruppen.map((g) => ({
      gruppe: g.id,
      ref: { kind: "warengruppe", abteilung: "accessoires", gruppe: g.id },
      count: acc.filter((a) => a.gruppe === g.id).length,
    })),
  });
  for (const g of accGruppen) {
    lists.push({
      id: `acc:${g.id}`,
      kind: "gruppe",
      gruppe: g.id,
      ref: { kind: "warengruppe", abteilung: "accessoires", gruppe: g.id },
      uids: ids(acc.filter((a) => a.gruppe === g.id)),
    });
  }

  for (const b of cat.brands) {
    lists.push({ id: `marke:${b.slug}`, kind: "marke", marke: b.slug, ref: { kind: "marke", slug: b.slug }, uids: ids(online.filter((a) => a.brand.slug === b.slug)) });
  }
  return lists;
}
