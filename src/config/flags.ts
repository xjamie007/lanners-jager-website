/**
 * Feature-Flags (Briefing D10.1). Dieselben Variablennamen gelten für den
 * Astro-Build (import.meta.env) und die Edge Functions (Deno.env), damit beide
 * immer dieselben Wege kennen. Reine Funktion, wird geteilt (sync-shared).
 */

export interface Features {
  /** Demo-Leiste, noindex, Demo-Postausgang, Demo-Artikel erlaubt */
  demo: boolean;
  /** Reservieren, im Laden anprobieren und bezahlen */
  reserve: boolean;
  /** Online bezahlen und im Haus abholen */
  payCollect: boolean;
  /** Online bezahlen und liefern lassen */
  payShip: boolean;
  /** Satz "Hoflieferant" auf der Hausseite Lanners (Freigabe fehlt, OP-09) */
  hoflieferant: boolean;
}

export type EnvGetter = (name: string) => string | undefined;

export function parseFeatures(get: EnvGetter): Features {
  return {
    demo: get("PUBLIC_DEMO") === "true",
    reserve: get("PUBLIC_FEATURE_RESERVE") !== "false",
    payCollect: get("PUBLIC_FEATURE_PAY_COLLECT") === "true",
    payShip: get("PUBLIC_FEATURE_PAY_SHIP") === "true",
    hoflieferant: get("PUBLIC_FEATURE_HOFLIEFERANT") === "true",
  };
}

/** Ist irgendein Kauf-Weg aktiv? Dann gibt es Tasche-Kauf, AGB, Widerruf, Versand & Zahlung. */
export function canBuy(f: Features): boolean {
  return f.payCollect || f.payShip;
}

export type Mode = "reserve" | "collect" | "ship";

export function activeModes(f: Features): Mode[] {
  const m: Mode[] = [];
  if (f.reserve) m.push("reserve");
  if (f.payCollect) m.push("collect");
  if (f.payShip) m.push("ship");
  return m;
}
