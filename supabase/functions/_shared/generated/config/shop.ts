// GENERIERT aus src/config/shop.ts durch scripts/sync-shared.ts. Nicht hier bearbeiten.
/**
 * Regeln für Reservieren, Abholen und Kaufen.
 * Reine Daten, wird auch von den Edge Functions benutzt (scripts/sync-shared.ts).
 * Alles mit `op` ist unbestätigt und steht in OFFENE-PUNKTE.md.
 */

export const shop = {
  reservierung: {
    /** Haltedauer in Öffnungstagen des Hauses, ab dem gewählten Abholdatum. Vorschlag aus dem Briefing. */
    haltedauerTage: 3,
    haltedauerOp: "OP-05.1",
    /** Abholdatum: frühestens der nächste Öffnungstag, spätestens so viele Tage danach. */
    abholungMaxTage: 14,
    /** Abholung im anderen Haus? Unbekannt, deshalb nicht angeboten. */
    andersHausAbholung: false,
    andersHausOp: "OP-05.2",
    /** Höchstmenge je Position, unabhängig vom Bestand */
    maxMengeJePosition: 5,
  },
  kauf: {
    /** Halte-Mengen während einer Zahlung (Tabelle holds) */
    holdMinuten: 20,
    /** Online bezahlt: Abholung ab dem nächsten Öffnungstag (unbestätigt) */
    abholungOp: "OP-06.6",
    /** Die Website schließt den Verkauf in FasMan nicht ab (kein `process`). */
    processAufrufen: false,
    processOp: "OP-06.7",
  },
  gutscheine: {
    /** Gutscheine werden online nicht eingelöst (D10.6). Vorbereitet: SoftTouch-Cheques. */
    onlineEinloesen: false,
    letzshopUrl: "https://letzshop.lu/de/vendors/jager-oberlinkels",
    letzshopUrlOp: "OP-07.2",
    abBetragCent: 2000,
  },
  outbox: {
    /** Wiederholung fehlgeschlagener SoftTouch-Aufrufe und Mails */
    intervallMinuten: 5,
    maxStunden: 24,
    warnungNachVersuchen: 3,
  },
  aufbewahrung: {
    /** Vorschlag D10.9, unbestätigt (OP-06.8) */
    reservierungTageNachAbholung: 30,
    bestellungTageNachAbschluss: 90,
    anfragenMonate: 12,
    op: "OP-06.8",
  },
  rateLimit: {
    stockProMinute: 30,
    formulareProStunde: 20,
  },
} as const;
