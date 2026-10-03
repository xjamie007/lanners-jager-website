/** Übersetzungen für Mails und Meldungen der Functions (aus src/i18n, generiert). */
import lb from "./generated/i18n/lb.json" with { type: "json" };
import de from "./generated/i18n/de.json" with { type: "json" };
import fr from "./generated/i18n/fr.json" with { type: "json" };
import en from "./generated/i18n/en.json" with { type: "json" };
import { fill } from "./text.ts";

export type Lang = "lb" | "de" | "fr" | "en";
type Leaf = string | { text: string; review?: string };
type Tree = { [k: string]: Leaf | Tree };

function isLeaf(v: unknown): v is Leaf {
  if (typeof v === "string") return true;
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.text === "string" && Object.keys(o).every((k) => k === "text" || k === "review");
}

function flatten(tree: Tree, prefix = "", out = new Map<string, string>()): Map<string, string> {
  for (const [k, v] of Object.entries(tree)) {
    if (isLeaf(v)) out.set(prefix + k, typeof v === "string" ? v : v.text);
    else flatten(v as Tree, prefix + k + ".", out);
  }
  return out;
}

const dicts: Record<Lang, Map<string, string>> = {
  lb: flatten(lb as unknown as Tree),
  de: flatten(de as unknown as Tree),
  fr: flatten(fr as unknown as Tree),
  en: flatten(en as unknown as Tree),
};

export const isLang = (v: unknown): v is Lang => v === "lb" || v === "de" || v === "fr" || v === "en";

export function t(lang: Lang, key: string, vars?: Record<string, string | number | null | undefined>): string {
  const s = dicts[lang].get(key) ?? dicts.de.get(key);
  if (s === undefined) throw new Error(`Übersetzung fehlt: ${lang}:${key}`);
  return vars ? fill(s, vars) : s;
}

export function tp(lang: Lang, key: string, n: number, vars?: Record<string, string | number | null | undefined>): string {
  const cat = new Intl.PluralRules(lang === "lb" ? "de" : lang).select(n);
  const k = dicts[lang].has(`${key}_${cat}`) ? `${key}_${cat}` : `${key}_other`;
  return t(lang, k, { n, ...vars });
}
