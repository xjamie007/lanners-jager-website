/** Sprachen und Routen (C2, D1): Pfade je Sprache eindeutig, Datumsnamen lb */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pathFor, alternatesFor, STATIC_ROUTES_LIST } from "./routes-hilfe.ts";
import { formatDay, formatPrice } from "../../supabase/functions/_shared/format.ts";

test("jede statische Seite hat in jeder Sprache einen eigenen Pfad", () => {
  for (const lang of ["lb", "de", "fr", "en"] as const) {
    const pfade = STATIC_ROUTES_LIST.map((route) => pathFor({ kind: "static", route }, lang));
    assert.equal(new Set(pfade).size, pfade.length, `doppelte Pfade in ${lang}`);
    for (const p of pfade) assert.match(p, new RegExp(`^/${lang}/([a-z0-9-]+/)*$`));
  }
});

test("hreflang-Alternativen zeigen auf dieselbe Seite", () => {
  const alt = alternatesFor({ kind: "produkt", slug: { lb: "a", de: "a", fr: "a", en: "a" } as never, uid8: "41010301" }, 1);
  for (const l of ["lb", "de", "fr", "en"] as const) assert.ok(alt[l].includes("41010301"), alt[l]);
});

test("Datumsnamen: lb aus der Übersetzung, nicht aus Intl", () => {
  assert.equal(formatDay("2026-10-03", "lb"), "Samschdeg, 3. Oktober");
  assert.equal(formatDay("2026-03-03", "lb", false), "3. Mäerz");
  assert.equal(formatDay("2026-10-03", "de"), "Samstag, 3. Oktober");
  assert.match(formatDay("2026-10-03", "fr"), /^samedi 3 octobre$/);
});

test("Preise je Sprache", () => {
  assert.equal(formatPrice(18995, "de").replace(/\s/g, " "), "189,95 €");
  assert.equal(formatPrice(18995, "en"), "€189.95");
});
