/**
 * Öffnungszeiten-Logik (Briefing D9). Reine Funktionen; die Daten kommen aus
 * src/content/oeffnungszeiten.json und werden übergeben.
 *
 * Alle Daten sind ISO-Kalenderdaten (YYYY-MM-DD) in Europe/Luxembourg.
 * Datumsrechnung läuft auf UTC-Mittag, damit Sommer-/Winterzeit nichts verschiebt.
 */

export type Weekday = "mo" | "di" | "mi" | "do" | "fr" | "sa" | "so";
export const WEEKDAYS: Weekday[] = ["mo", "di", "mi", "do", "fr", "sa", "so"];
export type Range = [string, string];

export interface Ausnahme {
  datum: string;
  /** null/fehlend zusammen mit bis = geschlossen */
  von?: string | null;
  bis?: string | null;
  geschlossen?: boolean;
  text?: Record<string, string | { text: string; review?: string }>;
}

export interface HouseHours {
  regulaer: Record<Weekday, Range[]>;
  feiertage: { tage: { datum: string; feiertag: string; geschlossen: boolean }[] };
  ausnahmen: Ausnahme[];
}

export const TZ = "Europe/Luxembourg";

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Heutiges Datum in Luxemburg */
export function todayInLux(now: Date = new Date()): string {
  return dateFmt.format(now);
}

/** Minuten seit Mitternacht in Luxemburg */
export function minutesInLux(now: Date = new Date()): number {
  const [h, m] = timeFmt.format(now).split(":").map(Number);
  return h * 60 + m;
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): Weekday {
  const js = new Date(date + "T12:00:00Z").getUTCDay(); // 0 = Sonntag
  return WEEKDAYS[(js + 6) % 7];
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export interface DayHours {
  ranges: Range[];
  grund: "regulaer" | "feiertag" | "ausnahme";
  feiertag?: string;
  ausnahme?: Ausnahme;
}

/** Öffnungszeiten an einem Datum: Ausnahme vor Feiertag vor regulär */
export function hoursOn(h: HouseHours, date: string): DayHours {
  const ex = h.ausnahmen.find((a) => a.datum === date);
  if (ex) {
    const closed = ex.geschlossen || !ex.von || !ex.bis;
    return { ranges: closed ? [] : [[ex.von!, ex.bis!]], grund: "ausnahme", ausnahme: ex };
  }
  const hol = h.feiertage.tage.find((f) => f.datum === date);
  if (hol && hol.geschlossen) return { ranges: [], grund: "feiertag", feiertag: hol.feiertag };
  return { ranges: h.regulaer[weekdayOf(date)] ?? [], grund: "regulaer", feiertag: hol?.feiertag };
}

export function isOpenDay(h: HouseHours, date: string): boolean {
  return hoursOn(h, date).ranges.length > 0;
}

/** Ist das Haus gerade offen? */
export function isOpenNow(h: HouseHours, now: Date = new Date()): boolean {
  const day = hoursOn(h, todayInLux(now));
  const m = minutesInLux(now);
  return day.ranges.some(([a, b]) => m >= toMin(a) && m < toMin(b));
}

/**
 * Nächster Öffnungstag NACH dem Datum (das Haus braucht Zeit zum Zurücklegen).
 * Sucht höchstens 60 Tage.
 */
export function nextOpeningDay(h: HouseHours, from: string): string {
  let d = from;
  for (let i = 0; i < 60; i++) {
    d = addDays(d, 1);
    if (isOpenDay(h, d)) return d;
  }
  throw new Error("Kein Öffnungstag in den nächsten 60 Tagen");
}

/**
 * Letzter Tag der Haltedauer: der n-te Öffnungstag, wobei der Abholtag selbst
 * der erste ist. Abholung Di, 3 Tage → Di, Mi, Do → "bis Do".
 */
export function holdUntil(h: HouseHours, pickup: string, days: number): string {
  let count = isOpenDay(h, pickup) ? 1 : 0;
  let d = pickup;
  for (let i = 0; count < days && i < 90; i++) {
    d = addDays(d, 1);
    if (isOpenDay(h, d)) count++;
  }
  return d;
}

/** Erlaubtes Abholfenster für F1/F2: min = nächster Öffnungstag, max = min + n Tage */
export function pickupWindow(h: HouseHours, today: string, maxDays: number): { min: string; max: string } {
  const min = nextOpeningDay(h, today);
  return { min, max: addDays(min, maxDays) };
}

export function isValidPickup(h: HouseHours, date: string, today: string, maxDays: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const { min, max } = pickupWindow(h, today, maxDays);
  return date >= min && date <= max && isOpenDay(h, date);
}

/** Regelmäßige Zeiten zu Gruppen gleicher Tage zusammenfassen (Tabelle, JSON-LD) */
export function groupWeek(h: HouseHours): { days: Weekday[]; ranges: Range[] }[] {
  const groups: { days: Weekday[]; ranges: Range[] }[] = [];
  for (const wd of WEEKDAYS) {
    const ranges = h.regulaer[wd] ?? [];
    const last = groups[groups.length - 1];
    if (last && JSON.stringify(last.ranges) === JSON.stringify(ranges)) last.days.push(wd);
    else groups.push({ days: [wd], ranges });
  }
  return groups;
}

const SCHEMA_DAY: Record<Weekday, string> = {
  mo: "https://schema.org/Monday", di: "https://schema.org/Tuesday", mi: "https://schema.org/Wednesday",
  do: "https://schema.org/Thursday", fr: "https://schema.org/Friday", sa: "https://schema.org/Saturday", so: "https://schema.org/Sunday",
};

/**
 * schema.org openingHoursSpecification inkl. Feiertage und Ausnahmen der nächsten
 * 90 Tage (die Seite wird täglich neu gebaut; spart Bytes auf jeder Seite)
 */
export function openingHoursSpecification(h: HouseHours, today: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const g of groupWeek(h)) {
    for (const [opens, closes] of g.ranges) {
      out.push({ "@type": "OpeningHoursSpecification", dayOfWeek: g.days.map((d) => SCHEMA_DAY[d]), opens, closes });
    }
  }
  const until = addDays(today, 90);
  const special = new Map<string, Range[]>();
  for (const f of h.feiertage.tage) if (f.geschlossen && f.datum >= today && f.datum <= until) special.set(f.datum, []);
  for (const a of h.ausnahmen) if (a.datum >= today && a.datum <= until) special.set(a.datum, hoursOn(h, a.datum).ranges);
  for (const [date, ranges] of [...special.entries()].sort()) {
    if (ranges.length === 0) {
      out.push({ "@type": "OpeningHoursSpecification", validFrom: date, validThrough: date, opens: "00:00", closes: "00:00" });
    } else {
      for (const [opens, closes] of ranges) out.push({ "@type": "OpeningHoursSpecification", validFrom: date, validThrough: date, opens, closes });
    }
  }
  return out;
}
