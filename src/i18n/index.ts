/**
 * Übersetzungen: ein JSON je Sprache (lb, de, fr, en). Luxemburgische Einträge
 * sind Objekte { text, review: "lb-native" } (Briefing A), alle anderen Strings.
 * Fehlende Schlüssel brechen den Build ab (scripts/check-i18n.ts prüft vorher).
 */
import lb from "./lb.json" with { type: "json" };
import de from "./de.json" with { type: "json" };
import fr from "./fr.json" with { type: "json" };
import en from "./en.json" with { type: "json" };
import { fill } from "../../supabase/functions/_shared/text.ts";

export const LANGS = ["lb", "de", "fr", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "lb";

/** Name der Sprache in ihr selbst, für den Sprachumschalter (mit lang-Attribut) */
export const LANG_NAMES: Record<Lang, string> = {
  lb: "Lëtzebuergesch",
  de: "Deutsch",
  fr: "Français",
  en: "English",
};

type Leaf = string | { text: string; review?: string };
type Tree = { [k: string]: Leaf | Tree };

/** Blatt = String oder genau { text, review? }. Namensräume dürfen selbst einen Schlüssel "text" haben. */
export function isLeaf(v: unknown): v is Leaf {
  if (typeof v === "string") return true;
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.text === "string" && Object.keys(o).every((k) => k === "text" || k === "review");
}

export function flatten(tree: Tree, prefix = ""): Map<string, { text: string; review?: string }> {
  const out = new Map<string, { text: string; review?: string }>();
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix + k;
    if (isLeaf(v)) out.set(key, typeof v === "string" ? { text: v } : { text: v.text, review: v.review });
    else for (const [kk, vv] of flatten(v as Tree, key + ".")) out.set(kk, vv);
  }
  return out;
}

export const dictionaries: Record<Lang, Map<string, { text: string; review?: string }>> = {
  lb: flatten(lb as unknown as Tree),
  de: flatten(de as unknown as Tree),
  fr: flatten(fr as unknown as Tree),
  en: flatten(en as unknown as Tree),
};

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

export type Vars = Record<string, string | number | undefined | null>;

/** Übersetzung holen; fehlt der Schlüssel, bricht der Build mit Pfad ab. */
export function t(lang: Lang, key: string, vars?: Vars): string {
  const e = dictionaries[lang].get(key);
  if (!e) throw new Error(`Übersetzung fehlt: ${lang}:${key}`);
  return vars ? fill(e.text, vars) : e.text;
}

export function has(lang: Lang, key: string): boolean {
  return dictionaries[lang].has(key);
}

const pluralRules = new Map<Lang, Intl.PluralRules>();
/** Plural: sucht key_one / key_other (Intl.PluralRules der Sprache) */
export function tp(lang: Lang, key: string, n: number, vars?: Vars): string {
  let pr = pluralRules.get(lang);
  if (!pr) {
    pr = new Intl.PluralRules(lang === "lb" ? "de" : lang);
    pluralRules.set(lang, pr);
  }
  const cat = pr.select(n);
  const k = has(lang, `${key}_${cat}`) ? `${key}_${cat}` : `${key}_other`;
  return t(lang, k, { n, ...vars });
}

/** Alle Texte einer Sprache unter einem Präfix (für Client-Islands) */
export function pick(lang: Lang, prefixes: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of dictionaries[lang]) if (prefixes.some((p) => k.startsWith(p))) out[k] = v.text;
  return out;
}

/** Text aus einer Datenquelle mit { lb: {text, review}, de: "…" } (warengruppen.json, Feiertage) */
export function localized(v: Record<string, Leaf> | undefined, lang: Lang): string {
  if (!v) return "";
  const x = v[lang] ?? v.de;
  return typeof x === "string" ? x : x?.text ?? "";
}

/** Locale für Intl (Zahlen, Preise) */
export const NUMBER_LOCALE: Record<Lang, string> = { lb: "de-LU", de: "de-LU", fr: "fr-LU", en: "en-IE" };
