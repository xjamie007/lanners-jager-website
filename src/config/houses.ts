/**
 * Stammdaten der zwei Häuser (Briefing B1).
 *
 * Reine Daten ohne Zugriff auf Umgebungsvariablen: Diese Datei wird von der
 * Astro-Seite UND (über scripts/sync-shared.ts kopiert) von den Supabase Edge
 * Functions benutzt. Umgebungsvariablen werden nur über ihre NAMEN genannt.
 *
 * Werte mit `offen` sind nicht bestätigt oder fehlen. Sie werden auf der Seite
 * sichtbar als Platzhalter gezeigt und stehen in OFFENE-PUNKTE.md (über `op`).
 */

export type HouseId = "lanners" | "jager";
export type HouseColor = "marine" | "tusche";
export type Abteilung = "damen" | "herren";

/** Ein Wert, der fehlt oder noch bestätigt werden muss. */
export interface OffenerWert {
  /** bekannter, aber unbestätigter Wert; fehlt bei `offen: "fehlt"` */
  wert?: string;
  offen: "fehlt" | "unbestaetigt";
  /** Verweis auf OFFENE-PUNKTE.md, z. B. "OP-01.2" */
  op: string;
}

export type Angabe = string | OffenerWert;

export interface House {
  id: HouseId;
  /** Name im Alltag, wie im Logo */
  name: string;
  /** Kurzname für Schalter, Größenleiste, Buttons */
  short: string;
  /** Hausnummer in der Grand-Rue */
  nr: string;
  streetAddress: string;
  postalCode: string;
  locality: string;
  country: "LU";
  /** E.164 mit Leerzeichen, wie im Briefing (NAP) */
  phone: string;
  /** Anzeige wie auf Google/Facebook */
  phoneDisplay: string;
  email: string;
  facebook: string;
  geo: { lat: number; lng: number };
  color: HouseColor;
  abteilungen: Abteilung[];
  flaecheM2?: number;
  seit?: number;
  /** Marken laut Briefing (Anzeige auf Hausseite, solange SoftTouch nichts liefert) */
  marken: string[];
  legal: {
    firma: Angabe;
    rechtsform: Angabe;
    vertreten: Angabe;
    rcs: Angabe;
    mwst: Angabe;
    gewerbe: Angabe;
    gruendung: Angabe;
  };
  softtouch: {
    /** Name der Umgebungsvariable mit der Konto-ID */
    account: string;
    /** Name der Umgebungsvariable mit dem Bearer-Token */
    token: string;
    /** Name der Umgebungsvariable mit den Filial-IDs (kommagetrennt) */
    stores: string;
    /** Filial-IDs der Demo-Fixtures. Die echten fehlen (OP-04.3). */
    demoStoreIds: string[];
  };
  /** Name der Umgebungsvariable mit dem Schlüssel des Zahlungsanbieters */
  payment: string;
  /** Name der Umgebungsvariable mit der Empfängeradresse für Mails an das Haus */
  mailTo: string;
}

export const houses: House[] = [
  {
    id: "lanners",
    name: "Confection Lanners",
    short: "Lanners",
    nr: "18",
    streetAddress: "18, Grand-Rue",
    postalCode: "L-9050",
    locality: "Ettelbruck",
    country: "LU",
    phone: "+352 81 22 80",
    phoneDisplay: "81 22 80",
    email: "confection-lanners@pt.lu",
    facebook: "https://www.facebook.com/ConfectionLanners/",
    geo: { lat: 49.8460422, lng: 6.0986022 },
    color: "marine",
    abteilungen: ["damen", "herren"],
    flaecheM2: 520,
    marken: ["Hugo Boss", "State of Art", "Maerz", "PME Legend", "Save the Duck", "Scotch & Soda", "Camel Active"],
    legal: {
      firma: { wert: "Confection Lanners SA", offen: "unbestaetigt", op: "OP-01.1" },
      rechtsform: { wert: "SA", offen: "unbestaetigt", op: "OP-01.1" },
      vertreten: { offen: "fehlt", op: "OP-01.4" },
      rcs: { offen: "fehlt", op: "OP-01.2" },
      mwst: { offen: "fehlt", op: "OP-01.3" },
      gewerbe: { offen: "fehlt", op: "OP-01.5" },
      gruendung: { offen: "fehlt", op: "OP-01.6" },
    },
    softtouch: {
      account: "ST_ACCOUNT_LANNERS",
      token: "ST_TOKEN_LANNERS",
      stores: "ST_STORES_LANNERS",
      demoStoreIds: ["01"],
    },
    payment: "PAY_KEY_LANNERS",
    mailTo: "MAIL_TO_LANNERS",
  },
  {
    id: "jager",
    name: "Jager-Oberlinkels",
    short: "Jager",
    nr: "32",
    streetAddress: "32, Grand-Rue",
    postalCode: "L-9050",
    locality: "Ettelbruck",
    country: "LU",
    phone: "+352 81 22 79",
    phoneDisplay: "81 22 79",
    email: "jagerm@pt.lu",
    facebook: "https://www.facebook.com/JagerOberlinkels/",
    geo: { lat: 49.8463761, lng: 6.0988157 },
    color: "tusche",
    abteilungen: ["herren"],
    seit: 1891,
    marken: ["Lacoste", "Levi's", "Barbour", "Stetson", "Gardeur", "Fynch Hatton"],
    legal: {
      firma: "Jager Sàrl",
      rechtsform: "Sàrl",
      vertreten: "Marc Jager",
      rcs: { wert: "B200967", offen: "unbestaetigt", op: "OP-01.7" },
      mwst: { wert: "LU28026605", offen: "unbestaetigt", op: "OP-01.7" },
      gewerbe: { wert: "10063104 / 0", offen: "unbestaetigt", op: "OP-01.8" },
      gruendung: "1891",
    },
    softtouch: {
      account: "ST_ACCOUNT_JAGER",
      token: "ST_TOKEN_JAGER",
      stores: "ST_STORES_JAGER",
      demoStoreIds: ["02"],
    },
    payment: "PAY_KEY_JAGER",
    mailTo: "MAIL_TO_JAGER",
  },
];

export const houseIds: HouseId[] = houses.map((h) => h.id);

export function getHouse(id: string): House {
  const h = houses.find((x) => x.id === id);
  if (!h) throw new Error(`Unbekanntes Haus: ${id}`);
  return h;
}

export function isHouseId(v: unknown): v is HouseId {
  return v === "lanners" || v === "jager";
}

/** "Jager, Grand-Rue 32" */
export function houseLine(h: House): string {
  return `${h.short}, Grand-Rue ${h.nr}`;
}

export function telHref(h: House): string {
  return "tel:" + h.phone.replace(/\s+/g, "");
}

export function angabeWert(a: Angabe): string | undefined {
  return typeof a === "string" ? a : a.wert;
}
