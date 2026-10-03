/**
 * Preise und Daten je Sprache (Briefing C2).
 * Preise: Intl.NumberFormat, EUR; lb und de → de-LU, fr → fr-LU, en → en-IE.
 * Datum und Uhrzeit: Zeitzone Europe/Luxembourg.
 * Beträge werden intern als ganze Cent geführt.
 */

import { t, type Lang } from "./i18n.ts";
export type { Lang };

export const NUMBER_LOCALE: Record<Lang, string> = { lb: "de-LU", de: "de-LU", fr: "fr-LU", en: "en-IE" };
export const TZ = "Europe/Luxembourg";

const priceFmt = new Map<Lang, Intl.NumberFormat>();

export function toCents(eur: number | string): number {
  return Math.round(Number(eur) * 100);
}

/** 9500 → "95,00 €" (de-LU) / "€95.00" (en-IE) */
export function formatPrice(cents: number, lang: Lang): string {
  let f = priceFmt.get(lang);
  if (!f) {
    f = new Intl.NumberFormat(NUMBER_LOCALE[lang], { style: "currency", currency: "EUR" });
    priceFmt.set(lang, f);
  }
  return f.format(cents / 100);
}

/** "−30 %" mit echtem Minuszeichen (U+2212) und geschütztem Leerzeichen */
export function formatDiscount(percent: number, lang: Lang): string {
  const p = Math.round(percent);
  return lang === "en" ? `−${p}%` : `−${p} %`;
}

const DATE_LOCALE: Record<Exclude<Lang, "lb">, string> = { de: "de-LU", fr: "fr-LU", en: "en-IE" };
const WOCHENTAG = ["so", "mo", "di", "mi", "do", "fr", "sa"] as const;

const dateCache = new Map<string, Intl.DateTimeFormat>();
function fmt(lang: Exclude<Lang, "lb">, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = lang + JSON.stringify(opts);
  let f = dateCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(DATE_LOCALE[lang], { timeZone: TZ, ...opts });
    dateCache.set(key, f);
  }
  return f;
}

/** Datum und Uhrzeit in Luxemburg als Teile */
function luxParts(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/**
 * Lëtzebuergesch: Namen aus der Übersetzung statt aus Intl. Nicht jede Laufzeit
 * hat lb-Daten (Chromium fällt still auf Deutsch zurück); so ist es überall gleich
 * und die Namen gehen mit durch die lb-native-Prüfung.
 */
function lbDay(date: string, withWeekday: boolean, withYear: boolean): string {
  const d = new Date(date + "T12:00:00Z");
  let s = `${d.getUTCDate()}. ${t("lb", `zeiten.monate.${date.slice(5, 7)}`)}`;
  if (withYear) s += ` ${date.slice(0, 4)}`;
  return withWeekday ? `${t("lb", `zeiten.tage.${WOCHENTAG[d.getUTCDay()]}`)}, ${s}` : s;
}

/** ISO-Datum (YYYY-MM-DD) als Kalendertag, z. B. "Dienstag, 6. Oktober" */
export function formatDay(date: string, lang: Lang, withWeekday = true): string {
  if (lang === "lb") return lbDay(date, withWeekday, false);
  const d = new Date(date + "T12:00:00Z");
  return fmt(lang, { weekday: withWeekday ? "long" : undefined, day: "numeric", month: "long" }).format(d);
}

/** "12. Oktober 2026" */
export function formatDateLong(date: string, lang: Lang): string {
  if (lang === "lb") return lbDay(date, false, true);
  const d = new Date(date + "T12:00:00Z");
  return fmt(lang, { day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** Uhrzeit eines Zeitpunkts in Luxemburg: "14:20" (alle Sprachen 24 Stunden) */
export function formatTime(iso: string | Date): string {
  return luxParts(typeof iso === "string" ? new Date(iso) : iso).time;
}

/** Datum + Uhrzeit eines Zeitpunkts: "1. Oktober, 04:30" */
export function formatDateTime(iso: string | Date, lang: Lang): string {
  const p = luxParts(typeof iso === "string" ? new Date(iso) : iso);
  return `${formatDay(p.date, lang, false)}, ${p.time}`;
}

/** "08:30" bleibt "08:30"; EN zeigt ebenfalls 24 Stunden (Luxemburg) */
export function formatClock(hhmm: string): string {
  return hhmm;
}
