/**
 * Feste Seiten in vier Sprachen (Briefing D1). Reine Daten: wird auch von den
 * Edge Functions benutzt (Weiterleitungen, Links in Mails), siehe sync-shared.
 * LB-Slugs sind Entwürfe und werden mit den LB-Texten geprüft.
 */
type Lang = "lb" | "de" | "fr" | "en";

export const STATIC_ROUTES = {
  home: { lb: "", de: "", fr: "", en: "" },
  sortiment: { lb: "sortiment", de: "sortiment", fr: "collection", en: "shop" },
  neu: { lb: "nei-erakomm", de: "neu-eingetroffen", fr: "nouveautes", en: "new-in" },
  sale: { lb: "sale", de: "sale", fr: "soldes", en: "sale" },
  marken: { lb: "marken", de: "marken", fr: "marques", en: "brands" },
  haeuser: { lb: "haiser", de: "haeuser", fr: "maisons", en: "stores" },
  geschichte: { lb: "geschicht", de: "geschichte", fr: "histoire", en: "our-story" },
  howto: { lb: "wei-et-geet", de: "so-funktionierts", fr: "comment-ca-marche", en: "how-it-works" },
  tasche: { lb: "akafskuerf", de: "warenkorb", fr: "panier", en: "basket" },
  reservieren: { lb: "reserveieren", de: "reservieren", fr: "reserver", en: "reserve" },
  reservierenDanke: { lb: "reserveieren/merci", de: "reservieren/danke", fr: "reserver/merci", en: "reserve/thank-you" },
  kasse: { lb: "keess", de: "kasse", fr: "commande", en: "checkout" },
  kasseDanke: { lb: "keess/merci", de: "kasse/danke", fr: "commande/merci", en: "checkout/thank-you" },
  kasseDemo: { lb: "keess/demo-bezuelen", de: "kasse/demo-zahlung", fr: "commande/paiement-demo", en: "checkout/demo-payment" },
  gutscheine: { lb: "kaddosbonen", de: "gutscheine", fr: "cheques-cadeaux", en: "gift-vouchers" },
  kontakt: { lb: "kontakt", de: "kontakt", fr: "contact", en: "contact" },
  kontaktDanke: { lb: "kontakt/merci", de: "kontakt/danke", fr: "contact/merci", en: "contact/thank-you" },
  suche: { lb: "sichen", de: "suche", fr: "recherche", en: "search" },
  impressum: { lb: "impressum", de: "impressum", fr: "mentions-legales", en: "legal-notice" },
  datenschutz: { lb: "dateschutz", de: "datenschutz", fr: "protection-des-donnees", en: "privacy" },
  agb: { lb: "agb", de: "agb", fr: "cgv", en: "terms" },
  widerruf: { lb: "widderruff", de: "widerruf", fr: "retractation", en: "withdrawal" },
  versand: { lb: "versand-bezuelen", de: "versand-zahlung", fr: "livraison-paiement", en: "shipping-payment" },
  demopost: { lb: "demo/post", de: "demo/post", fr: "demo/courrier", en: "demo/mail" },
} as const satisfies Record<string, Record<Lang, string>>;
