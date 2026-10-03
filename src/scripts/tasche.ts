/**
 * Tasche im Browser (D5): localStorage "lj-tasche", in try/catch.
 * Technisch notwendig für die gewünschte Funktion, deshalb kein Banner.
 * Jede Position: 14-stelliger Schlüssel, Menge und ein Schnappschuss für die
 * Anzeige. Preise rechnet der Server immer neu (checkout), nie aus dem Browser.
 */
export interface TascheSnap {
  uid8: string;
  marke: string;
  name: string;
  farbe: string;
  groesse: string;
  haus: "lanners" | "jager";
  preis: number;
  alt?: number;
  bild: string;
  fit?: string;
  url: string;
  /**
   * Bestand dieser Größe im Haus beim Hinzufügen (Größenleiste: live oder Build-Stand).
   * Grenze und Hinweis im Warenkorb, solange der Live-Bestand nicht erreichbar ist.
   * Fehlt bei älteren Einträgen; dann gilt nur die Höchstmenge.
   */
  bestand?: number;
}
export interface TaschePos {
  key: string;
  menge: number;
  snap: TascheSnap;
}

const KEY = "lj-tasche";

export function lesen(): TaschePos[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!data || data.v !== 1 || !Array.isArray(data.items)) return [];
    return (data.items as TaschePos[]).filter((p) => /^\d{14}$/.test(p.key) && p.menge > 0 && p.snap);
  } catch {
    return [];
  }
}

export function schreiben(items: TaschePos[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, items }));
    window.dispatchEvent(new CustomEvent("lj:tasche"));
    return true;
  } catch {
    return false;
  }
}

export function hinzufuegen(key: string, snap: TascheSnap, max: number): TaschePos[] {
  const items = lesen();
  const pos = items.find((p) => p.key === key);
  if (pos) {
    pos.menge = Math.min(max, pos.menge + 1);
    // der neuere Bestand gilt
    if (snap.bestand !== undefined) pos.snap.bestand = snap.bestand;
  } else items.push({ key, menge: 1, snap });
  schreiben(items);
  return items;
}

export function setzen(key: string, menge: number): TaschePos[] {
  const items = lesen()
    .map((p) => (p.key === key ? { ...p, menge } : p))
    .filter((p) => p.menge > 0);
  schreiben(items);
  return items;
}

export function entfernen(keys: string[]): TaschePos[] {
  const items = lesen().filter((p) => !keys.includes(p.key));
  schreiben(items);
  return items;
}

export function anzahl(items = lesen()): number {
  return items.reduce((n, p) => n + p.menge, 0);
}
