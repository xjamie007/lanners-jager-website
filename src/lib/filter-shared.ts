/**
 * Filterlogik ohne Abhängigkeiten, gemeinsam für den Build (src/lib/filterindex.ts)
 * und den Browser (src/scripts/filter.ts).
 */

/** Preisstufen in Cent: bis 50 €, 50 bis 100 €, 100 bis 200 €, 200 bis 400 €, über 400 € */
export const PREIS_GRENZEN = [5000, 10000, 20000, 40000];

/** Stufe eines Preises als Id, z. B. "5000-10000" oder "40000-" */
export function preisStufe(cents: number): string {
  let unten = 0;
  for (const g of PREIS_GRENZEN) {
    if (cents < g) return `${unten}-${g}`;
    unten = g;
  }
  return `${unten}-`;
}

// Größen ordnen: Buchstaben (XXS bis 6XL), dann Zahlen, dann der Rest (TU)
const RANG: Record<string, number> = { XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, "2XL": 6, XXXL: 7, "3XL": 7, "4XL": 8, "5XL": 9, "6XL": 10 };
function schluessel(label: string): [number, number] {
  const u = label.toUpperCase().trim();
  if (u in RANG) return [0, RANG[u]];
  const n = parseFloat(u.replace(",", "."));
  if (!Number.isNaN(n)) return [1, n];
  return [2, 0];
}
export function groessenVergleich(a: string, b: string): number {
  const [ta, na] = schluessel(a);
  const [tb, nb] = schluessel(b);
  return ta - tb || na - nb || a.localeCompare(b, "de", { numeric: true });
}
