/**
 * Versand: Länder, Kosten und Lieferzeit (Briefing D10.6.5).
 * UNBESTÄTIGT (OP-06.2). In der Demo nur Luxemburg zu 0,00 €, beschriftet als Demo-Wert.
 * Reine Daten, wird auch von der Edge Function `checkout` benutzt: Die Versandkosten
 * werden serverseitig aus dieser Datei berechnet, nie aus dem Browser übernommen.
 * Ländernamen stehen in den Übersetzungsdateien unter `land.<CODE>`.
 */

export interface VersandLand {
  /** ISO 3166-1 alpha-2 */
  code: string;
  kostenCent: number;
  /** Lieferzeit in Werktagen, für den Satz auf der Produktseite */
  lieferzeitTage: number;
  /** Demo-Wert: wird auf der Seite als solcher beschriftet */
  demoWert: boolean;
}

export const versand = {
  op: "OP-06.2",
  versanddienstOp: "OP-06.3",
  laender: [{ code: "LU", kostenCent: 0, lieferzeitTage: 3, demoWert: true }] as VersandLand[],
} as const;

export function versandLand(code: string): VersandLand | undefined {
  return versand.laender.find((l) => l.code === code);
}
