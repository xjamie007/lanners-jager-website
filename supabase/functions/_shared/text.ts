/**
 * Kleine Texthelfer, geteilt von Edge Functions (Deno) und Build (Node/Vite).
 */

const TRANSLIT: Record<string, string> = {
  ä: "ae", ö: "oe", ü: "ue", ß: "ss", Ä: "ae", Ö: "oe", Ü: "ue",
  é: "e", è: "e", ê: "e", ë: "e", à: "a", â: "a", á: "a", ç: "c", î: "i", ï: "i", í: "i",
  ô: "o", ó: "o", ò: "o", û: "u", ù: "u", ú: "u", ÿ: "y", œ: "oe", æ: "ae", ñ: "n", å: "a", ø: "o",
};

/** URL-Slug: Kleinbuchstaben, Umlaute ausgeschrieben, Rest zu Bindestrichen. */
export function slugify(input: string, maxLength = 70): string {
  const s = input
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length <= maxLength) return s;
  return s.slice(0, maxLength).replace(/-[^-]*$/, "") || s.slice(0, maxLength);
}

/**
 * Farbname aus `colorbrand`. SoftTouch liefert "Lieferantencode - Name",
 * zum Beispiel "R001 - red" oder "166 - Marine". Ohne Code bleibt der Text.
 */
export function colorNameFromBrand(colorbrand: string): string {
  const m = /^\s*[^\s]+\s+-\s+(.+)$/.exec(colorbrand ?? "");
  return (m ? m[1] : colorbrand ?? "").trim();
}

/** "SCHWARZ" → "Schwarz" (Farbgruppen kommen aus FasMan oft in Versalien) */
export function titleCase(s: string): string {
  if (!s) return s;
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase());
}

/** Gültige EAN-13 mit Prüfziffer, und kein Nummernkreis für den internen Gebrauch (02x, 04x, 2xx). */
export function isPublicGtin13(edi: string | null | undefined): boolean {
  if (!edi || !/^\d{13}$/.test(edi)) return false;
  if (/^(02|04|2)/.test(edi)) return false;
  const digits = edi.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Platzhalter {name} ersetzen. Fehlende Werte bleiben sichtbar stehen. */
export function fill(template: string, vars: Record<string, string | number | undefined | null>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = vars[k];
    return v === undefined || v === null ? m : String(v);
  });
}

/** Doppelpunkt nach einer Bezeichnung; Französisch mit geschütztem Leerzeichen davor ("Total : 12 €") */
export function doppelpunkt(lang: string): string {
  return lang === "fr" ? " : " : ": ";
}
