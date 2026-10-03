/**
 * Zuordnungen zwischen SoftTouch (FasMan) und dem Shop.
 *
 * Alles hier ist UNBESTÄTIGT (OP-04) und mit Standardwerten für die Demo belegt.
 * Sobald SoftTouch die Testumgebung liefert, werden die Werte hier angepasst.
 * Reine Daten: wird auch von den Edge Functions benutzt (scripts/sync-shared.ts).
 *
 * Quelle der Feldnamen: docs/softtouch-api/softtouch-api-full.md
 * (Postman-Collection "SoftTouch API docs", abgerufen 2026-10-01).
 */

export type Lang = "lb" | "de" | "fr" | "en";
export type TextKind = "kurz" | "lang" | "material" | "seo" | "pflege";
export type PhotoRole = "main" | "extra";
export type PhotoFit = "contain" | "cover";

export const softtouch = {
  /** Basis der REST-API, Version wird je Aufruf angehängt: {apiBase}/{1|2}/accounts/{accountId}/ */
  apiBase: "https://api.softtouch.eu",

  /**
   * Online-Kanal dieses Shops (`online`, `online2` … `online5`). 1 ist der Web-Shop.
   * OP-04.4. Überschreibbar mit der Umgebungsvariable ST_ONLINE_CHANNEL.
   */
  onlineChannel: 1,

  /**
   * Kategoriegruppen: Für die meisten Kunden ist Gruppe 01 das Geschlecht und
   * Gruppe 02 die Warengruppe (Doku, Products > General information). OP-04.8.
   * Die Abbildung der Codes auf Abteilung/Warengruppe/Slug steht in
   * src/content/warengruppen.json.
   */
  categoryGroups: { abteilung: 1, warengruppe: 2 },

  /** Feld mit dem Anzeigenamen; Doku: Referenz meist in detail1, Name in detail2. */
  displayNameField: "detail2",
  displayNameFallback: "detail1",
  articleNumberField: "detail1",

  /** Demo-Artikel tragen in detail5 "DEMO" (Briefing D10.8). Der Build bricht ab, wenn so ein Artikel ohne PUBLIC_DEMO=true auftaucht. */
  demoMarker: { field: "detail5", value: "DEMO" },

  /**
   * Datei-Presets (`files[].type`): welches Preset ist Hauptfoto, welches Zusatzfoto,
   * und ob es ein Freisteller (contain) oder ein Modell-/Stimmungsfoto (cover) ist.
   * OP-04.6. Standard ist contain.
   */
  filePresets: {
    "01": { role: "main", fit: "contain" },
    "02": { role: "extra", fit: "contain" },
    "03": { role: "extra", fit: "cover" },
  } as Record<string, { role: PhotoRole; fit: PhotoFit }>,
  defaultPhotoFit: "contain" as PhotoFit,

  /**
   * Text-Presets (`texts[].type`). WICHTIG (Befund aus der Doku): Die festen
   * SoftTouch-Presets sind NIEDERLÄNDISCH, FRANZÖSISCH und ENGLISCH:
   *   S1–S3 Zusammensetzung nl/fr/en, SJ–SL lange Beschreibung nl/fr/en,
   *   SM–SO kurze Beschreibung nl/fr/en, SA–SC SEO nl/fr/en, S5–S9 Pflegehinweise.
   * Deutsch gibt es dort nicht. Deutsche Texte brauchen kundeneigene Presets.
   * D1–D3 sind eine ANNAHME für die Demo (OP-04.7).
   */
  textPresets: {
    S1: { lang: "nl", kind: "material" },
    S2: { lang: "fr", kind: "material" },
    S3: { lang: "en", kind: "material" },
    SJ: { lang: "nl", kind: "lang" },
    SK: { lang: "fr", kind: "lang" },
    SL: { lang: "en", kind: "lang" },
    SM: { lang: "nl", kind: "kurz" },
    SN: { lang: "fr", kind: "kurz" },
    SO: { lang: "en", kind: "kurz" },
    SA: { lang: "nl", kind: "seo" },
    SB: { lang: "fr", kind: "seo" },
    SC: { lang: "en", kind: "seo" },
    D1: { lang: "de", kind: "lang" },
    D2: { lang: "de", kind: "kurz" },
    D3: { lang: "de", kind: "material" },
  } as Record<string, { lang: Lang | "nl"; kind: TextKind }>,

  /**
   * Sprachfolge für Produkttexte (Briefing D10.3). Fehlt ein Text in der
   * Seitensprache, kommt der nächste aus dieser Liste. Nie maschinell übersetzt.
   */
  textFallback: {
    lb: ["lb", "de", "fr", "en"],
    de: ["de", "fr", "en"],
    fr: ["fr", "de", "en"],
    en: ["en", "fr", "de"],
  } as Record<Lang, (Lang | "nl")[]>,

  /** Pflegesymbole (V2 Wash_instructions) haben Titel nur in nl/fr/en. */
  washTitleLangs: ["nl", "fr", "en"] as const,

  /** Name der Umgebungsvariable mit der Basis-URL des Foto-Servers der Häuser (OP-04.5). */
  photoBaseUrlEnv: "ST_PHOTO_BASE_URL",

  /** Seitengröße der Listenaufrufe (Doku: max. 500) */
  pageSize: 500,
  /** Eskalationsprobe vor dem Delta-Abgleich: take=1&skip=10000 */
  escalationSkip: 10000,
  /** Zeitfenster des Delta-Abgleichs (läuft alle 10 Minuten) */
  deltaWindowMinutes: 15,
  /** Zeitlimit je Aufruf */
  requestTimeoutMs: 15000,
  /** Live-Bestand wird so lange zwischengespeichert (stock_cache) */
  stockCacheSeconds: 60,

  /**
   * Bei online bezahlten Bestellungen schicken wir den bezahlten Stückpreis als
   * `net_price` mit, damit die Reservierung zum Zahlbetrag passt. Die Doku verlangt
   * dazu eine passende `discount_type_id` (Discount types). Unbekannt: OP-04.10.
   */
  webPriceDiscountTypeId: null as number | null,
} as const;
