/** Seitenkonfiguration für die Islands (aus #lj-config, vom Build geschrieben) */
export interface LjConfig {
  lang: "lb" | "de" | "fr" | "en";
  base: string;
  functionsUrl: string;
  demo: boolean;
  features: { demo: boolean; reserve: boolean; payCollect: boolean; payShip: boolean; hoflieferant: boolean };
  buyEnabled: boolean;
  modes: ("reserve" | "collect" | "ship")[];
  routes: Record<string, string>;
  houses: { id: "lanners" | "jager"; name: string; short: string; nr: string; phone: string; phoneDisplay: string; color: string }[];
  maxMenge: number;
  /** Öffnungszeiten der nächsten Tage je Haus: Datum → Zeiträume */
  zeiten: Record<"lanners" | "jager", Record<string, [string, string][]>>;
  t: Record<string, string>;
}

let cached: LjConfig | null = null;
export function config(): LjConfig {
  if (!cached) cached = JSON.parse(document.getElementById("lj-config")!.textContent!) as LjConfig;
  return cached;
}

export function tr(key: string, vars?: Record<string, string | number>): string {
  const c = config();
  let s = c.t[key];
  if (s === undefined) {
    // fehlt der Präfix in strings der Seite? (nur in der Entwicklung sichtbar)
    if (import.meta.env.DEV) console.warn(`Text fehlt im Browser: ${key}`);
    return key;
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined ? m : String(vars[k])));
  return s;
}

/** Plural über _one/_other */
export function trp(key: string, n: number, vars?: Record<string, string | number>): string {
  const lang = config().lang;
  const cat = new Intl.PluralRules(lang === "lb" ? "de" : lang).select(n);
  const k = config().t[`${key}_${cat}`] !== undefined ? `${key}_${cat}` : `${key}_other`;
  return tr(k, { n, ...vars });
}

const LOCALE = { lb: "de-LU", de: "de-LU", fr: "fr-LU", en: "en-IE" } as const;
export function price(cents: number): string {
  return new Intl.NumberFormat(LOCALE[config().lang], { style: "currency", currency: "EUR" }).format(cents / 100);
}

const TZ = "Europe/Luxembourg";
const WOCHENTAG = ["so", "mo", "di", "mi", "do", "fr", "sa"] as const;
const lux = (d: Date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { j: p.year, m: p.month, t: Number(p.day), zeit: `${p.hour}:${p.minute}`, wt: p.weekday.slice(0, 2).toLowerCase() };
};
const WT_EN: Record<string, (typeof WOCHENTAG)[number]> = { mo: "mo", tu: "di", we: "mi", th: "do", fr: "fr", sa: "sa", su: "so" };

/**
 * Kalendertag (YYYY-MM-DD) als Text, z. B. "Samschdeg, 3. Oktober".
 * Lëtzebuergesch: die meisten Browser haben keine lb-Daten (Chromium fällt still
 * auf Deutsch zurück), deshalb Tages- und Monatsnamen aus der Übersetzung.
 */
export function tagText(iso: string, mitWochentag = true): string {
  const lang = config().lang;
  const d = new Date(iso + "T12:00:00Z");
  if (lang === "lb") {
    const datum = `${d.getUTCDate()}. ${tr(`zeiten.monate.${iso.slice(5, 7)}`)}`;
    return mitWochentag ? `${tr(`zeiten.tage.${WOCHENTAG[d.getUTCDay()]}`)}, ${datum}` : datum;
  }
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TZ, weekday: mitWochentag ? "long" : undefined, day: "numeric", month: "long" }).format(d);
}

/** Zeitpunkt als "3. Oktober, 14:20" (Luxemburger Zeit) */
export function zeitpunktText(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const p = lux(d);
  return `${tagText(`${p.j}-${p.m}-${String(p.t).padStart(2, "0")}`, false)}, ${p.zeit}`;
}

/** Uhrzeit in Luxemburg, "14:20" */
export function uhrzeit(d: Date): string {
  return lux(d).zeit;
}

/** Kalendertag in Luxemburg als YYYY-MM-DD */
export function luxTag(d: Date): string {
  const p = lux(d);
  return `${p.j}-${p.m}-${String(p.t).padStart(2, "0")}`;
}

/** Kürzel des Wochentags in Luxemburg: "mo" … "so" */
export function luxWochentag(d: Date): (typeof WOCHENTAG)[number] {
  return WT_EN[lux(d).wt];
}

export function house(id: string) {
  return config().houses.find((h) => h.id === id)!;
}

export function telefone(): string {
  const l = house("lanners");
  const j = house("jager");
  return tr("site.telefone", { lanners: l.phoneDisplay, jager: j.phoneDisplay });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
