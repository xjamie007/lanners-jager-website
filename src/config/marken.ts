/**
 * Markenlogos für das Markenband und die Markenseite. Dateien liegen in
 * public/marken/, Schlüssel ist der Slug des Markennamens (ohne "Hugo").
 * Die Logos sind Warenzeichen der Marken; die Häuser führen diese Marken.
 * Die Freigabe zur Nutzung ist noch offen (OP-10). Fehlt ein Logo, zeigt
 * das Band den Namen als Schriftzug.
 *
 * `einfarbig`: Logo darf auf eine Farbe gesetzt werden (weiß auf Verlauf,
 * dunkel auf hell). Bei mehrfarbigen Logos mit Flächen bleibt es farbig auf
 * einem hellen Schild.
 */
export interface MarkenLogo {
  datei: string;
  /** Seitenverhältnis Breite / Höhe, für width/height im Markup */
  verhaeltnis: number;
  einfarbig: boolean;
  /** optische Größe im Band (1 = normale Höhe) */
  skala?: number;
}

// Quellen: Websites der Marken bzw. Wikimedia Commons (Lacoste, Levi's), Stand Oktober 2026
export const markenLogos: Record<string, MarkenLogo> = {
  barbour: { datei: "marken/barbour.svg", verhaeltnis: 4.938, einfarbig: true, skala: 0.8 },
  boss: { datei: "marken/boss.svg", verhaeltnis: 3.55, einfarbig: true, skala: 0.8 },
  "camel-active": { datei: "marken/camel-active.svg", verhaeltnis: 2.208, einfarbig: true, skala: 1.15 },
  "fynch-hatton": { datei: "marken/fynch-hatton.png", verhaeltnis: 4.196, einfarbig: true, skala: 0.9 },
  gardeur: { datei: "marken/gardeur.svg", verhaeltnis: 3.42, einfarbig: true, skala: 0.9 },
  lacoste: { datei: "marken/lacoste.svg", verhaeltnis: 5.642, einfarbig: true, skala: 0.75 },
  levis: { datei: "marken/levis.svg", verhaeltnis: 2.408, einfarbig: false, skala: 1 },
  maerz: { datei: "marken/maerz.svg", verhaeltnis: 3.208, einfarbig: true, skala: 1 },
  "pme-legend": { datei: "marken/pme-legend.svg", verhaeltnis: 2.239, einfarbig: true, skala: 1.2 },
  "save-the-duck": { datei: "marken/save-the-duck.svg", verhaeltnis: 1, einfarbig: false, skala: 1.4 },
  "scotch-soda": { datei: "marken/scotch-soda.svg", verhaeltnis: 11.176, einfarbig: true, skala: 0.5 },
  "state-of-art": { datei: "marken/state-of-art.svg", verhaeltnis: 10.167, einfarbig: true, skala: 0.52 },
  stetson: { datei: "marken/stetson.svg", verhaeltnis: 5.682, einfarbig: true, skala: 0.75 },
};
