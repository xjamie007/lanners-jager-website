/** Katalog: Omnibus-Preis, Filterlogik, Description-Längen, Formularprüfungen */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lowestBeforeReduction } from "../../src/lib/catalog/assemble.ts";
import { preisStufe, groessenVergleich } from "../../src/lib/filter-shared.ts";
import { descriptionLaenge } from "../../src/lib/listmeta.ts";
import { normalizePostcode, isEmail, isPhone } from "../../supabase/functions/_shared/contract.ts";
import { addDays } from "../../supabase/functions/_shared/hours.ts";

test("Omnibus: niedrigster Preis der 30 Tage vor der Preissenkung", () => {
  const heute = "2026-10-02";
  const h: { date: string; netto_price: number }[] = [];
  // 60 Tage zurück: 100 €, vor 40 Tagen kurz 90 €, seit 10 Tagen reduziert auf 70 €
  for (let i = 60; i >= 0; i--) {
    const d = addDays(heute, -i);
    h.push({ date: d, netto_price: i <= 10 ? 70 : i >= 38 && i <= 40 ? 90 : 100 });
  }
  assert.equal(lowestBeforeReduction(h, 100, heute), 90);
  // ohne Verlauf: regulärer Preis
  assert.equal(lowestBeforeReduction([], 100, heute), 100);
  // die eigene Reduktion zählt nicht als Vergleichspreis
  const nur = h.map((x) => ({ ...x, netto_price: x.netto_price === 90 ? 100 : x.netto_price }));
  assert.equal(lowestBeforeReduction(nur, 100, heute), 100);
});

test("Preisstufen des Filters", () => {
  assert.equal(preisStufe(4999), "0-5000");
  assert.equal(preisStufe(5000), "5000-10000");
  assert.equal(preisStufe(39999), "20000-40000");
  assert.equal(preisStufe(40000), "40000-");
});

test("Größen sortieren: Buchstaben, Zahlen, Rest", () => {
  assert.deepEqual(["XL", "S", "TU", "M", "2XL", "XS", "L", "3XL"].sort(groessenVergleich), ["XS", "S", "M", "L", "XL", "2XL", "3XL", "TU"]);
  assert.deepEqual(["52", "48", "50", "46"].sort(groessenVergleich), ["46", "48", "50", "52"]);
  assert.deepEqual(["L", "50", "M"].sort(groessenVergleich), ["M", "L", "50"]);
});

test("Description auf 150 bis 160 Zeichen", () => {
  const kurz = "x".repeat(140) + ".";
  assert.equal(descriptionLaenge(kurz, [" Zu lang für den Rest hier drin.", " Kurz."]).length, 147);
  assert.equal(descriptionLaenge("y".repeat(145), [" Online reservieren."]).length, 145); // passt nicht, bleibt
  assert.equal(descriptionLaenge("z".repeat(140), [" Online."]).length, 148);
  const lang = "Satz eins ist hier. " + "a".repeat(90) + ". Und noch ein Satz, der das Ganze über die Grenze schiebt, ganz sicher.";
  const r = descriptionLaenge(lang, []);
  assert.ok(r.length <= 160 && r.endsWith("."), r);
});

test("Postleitzahl, E-Mail, Telefon", () => {
  assert.equal(normalizePostcode("l 9050", "LU"), "L-9050");
  assert.equal(normalizePostcode("9050", "LU"), "L-9050");
  assert.equal(normalizePostcode("905", "LU"), null);
  assert.equal(isEmail("kunde@demo.invalid"), true);
  assert.equal(isEmail("kunde@demo"), false);
  assert.equal(isPhone("621 123 456"), true);
  assert.equal(isPhone("+352 81 22 80"), true);
  assert.equal(isPhone("12"), false);
});
