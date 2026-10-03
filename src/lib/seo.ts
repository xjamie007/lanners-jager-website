/**
 * Strukturierte Daten (Briefing G3) und Title-Regeln (G2).
 * Alle Angaben entsprechen dem sichtbaren Inhalt. NAP überall gleich.
 */
import hours from "../content/oeffnungszeiten.json" with { type: "json" };
import { openingHoursSpecification, todayInLux, type HouseHours } from "../../supabase/functions/_shared/hours.ts";
import { isPublicGtin13 } from "../../supabase/functions/_shared/text.ts";
import { houses, angabeWert, type House } from "../config/houses.ts";
import { SITE_URL, features } from "../config/site.ts";
import { t, type Lang } from "../i18n/index.ts";
import { pathFor, staticRef } from "../i18n/routes.ts";
import { absolute } from "./page.ts";
import type { Article } from "./catalog/types.ts";

export const storeId = (id: string) => `${SITE_URL}/#${id}`;

export function storeJsonLd(h: House): Record<string, unknown> {
  const legalName = typeof h.legal.firma === "string" ? h.legal.firma : undefined; // nur bestätigt
  const vat = angabeWert(h.legal.mwst);
  const node: Record<string, unknown> = {
    "@type": "ClothingStore",
    "@id": storeId(h.id),
    name: h.name,
    url: absolute(pathFor({ kind: "haus", id: h.id }, "lb")),
    telephone: h.phone,
    email: h.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: h.streetAddress,
      postalCode: h.postalCode,
      addressLocality: h.locality,
      addressCountry: h.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: h.geo.lat, longitude: h.geo.lng },
    priceRange: "€€€",
    sameAs: [h.facebook],
    openingHoursSpecification: openingHoursSpecification((hours as unknown as Record<string, HouseHours>)[h.id], todayInLux()),
  };
  if (legalName) node.legalName = legalName;
  // Jager: im Briefing belegt (Letzshop), vor Livegang in VIES prüfen (OP-01.7). Lanners: erst nach Bestätigung.
  if (h.id === "jager" && vat) node.vatID = vat;
  if (h.seit) node.foundingDate = String(h.seit);
  return node;
}

export function websiteJsonLd(lang: Lang): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: t(lang, "site.name"),
    url: absolute(pathFor(staticRef("home"), lang)),
    inLanguage: lang,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: absolute(pathFor(staticRef("suche"), lang)) + "?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: SITE_URL + it.href })),
  };
}

export function faqJsonLd(items: { q: string; a: string }[]): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
}

export function productJsonLd(a: Article, lang: Lang, url: string, imageUrls: string[]): Record<string, unknown> {
  const bySize = new Map<string, Article["cells"]>();
  for (const c of a.cells) (bySize.get(c.size.label) ?? bySize.set(c.size.label, []).get(c.size.label)!).push(c);
  const variants = [...bySize.entries()].map(([label, cells]) => {
    const sku = cells[0].key14.slice(0, 12);
    const edi = a.edi[cells[0].key14];
    const v: Record<string, unknown> = {
      "@type": "Product",
      sku,
      name: `${a.brand.name} ${a.name} ${a.colorName} ${label}`,
      size: label,
      color: a.colorName,
      image: imageUrls,
      offers: cells.map((c) => {
        const offer: Record<string, unknown> = {
          "@type": "Offer",
          price: (c.nettoCents / 100).toFixed(2),
          priceCurrency: "EUR",
          availability: c.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          availableAtOrFrom: { "@id": storeId(c.house) },
          availableDeliveryMethod: ["https://schema.org/OnSitePickup", ...(features.payShip ? ["https://schema.org/ParcelService"] : [])],
          url,
        };
        if (c.nettoCents < c.priceCents) {
          offer.priceSpecification = {
            "@type": "UnitPriceSpecification",
            priceType: "https://schema.org/StrikethroughPrice",
            price: (c.priceCents / 100).toFixed(2),
            priceCurrency: "EUR",
          };
        }
        return offer;
      }),
    };
    if (isPublicGtin13(edi)) v.gtin13 = edi;
    return v;
  });
  return {
    "@type": "ProductGroup",
    "@id": url + "#produkt",
    name: `${a.brand.name} ${a.name}`,
    url,
    productGroupID: a.uid8,
    variesBy: "https://schema.org/size",
    brand: { "@type": "Brand", name: a.brand.name },
    color: a.colorName,
    image: imageUrls,
    inLanguage: lang,
    hasVariant: variants,
  };
}

export function graph(nodes: Record<string, unknown>[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}

export function baseGraph(lang: Lang): Record<string, unknown>[] {
  return [websiteJsonLd(lang), ...houses.map(storeJsonLd)];
}

/**
 * Produkt-Title (G2): "{Marke} {Name} {Farbe} | Lanners & Jager". Länger als 60 Zeichen:
 * zuerst fällt "| Lanners & Jager" weg, dann wird der Name gekürzt.
 */
export function productTitle(a: Article, lang: Lang): string {
  const suffix = t(lang, "seo.suffix");
  const base = t(lang, "seo.produktTitle", { marke: a.brand.name, name: a.name, farbe: a.colorName });
  if ((base + suffix).length <= 60) return base + suffix;
  if (base.length <= 60) return base;
  const rest = 60 - (a.brand.name.length + a.colorName.length + 2);
  const name = a.name.length > rest ? a.name.slice(0, Math.max(10, rest - 1)).replace(/\s+\S*$/, "") + "…" : a.name;
  return t(lang, "seo.produktTitle", { marke: a.brand.name, name, farbe: a.colorName }).slice(0, 60);
}
