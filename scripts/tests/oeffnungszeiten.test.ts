/** Öffnungszeiten (D9): Abholfenster, Haltedauer, Feiertage, Zeitzone Luxemburg */
import { test } from "node:test";
import assert from "node:assert/strict";
import hours from "../../src/content/oeffnungszeiten.json" with { type: "json" };
import { todayInLux, nextOpeningDay, holdUntil, pickupWindow, isValidPickup, hoursOn, weekdayOf, type HouseHours } from "../../supabase/functions/_shared/hours.ts";

const lanners = hours.lanners as unknown as HouseHours;
const jager = hours.jager as unknown as HouseHours;
const testHaus: HouseHours = {
  regulaer: { mo: [], di: [["09:00", "18:00"]], mi: [["09:00", "18:00"]], do: [["09:00", "18:00"]], fr: [["09:00", "18:00"]], sa: [["09:00", "17:00"]], so: [] },
  feiertage: { tage: [{ datum: "2026-12-25", feiertag: "weihnachten", geschlossen: true }] },
  ausnahmen: [{ datum: "2026-12-24", von: "09:00", bis: "14:00" }, { datum: "2026-12-29", geschlossen: true }],
};

test("heute in Luxemburg, auch über Mitternacht und Zeitumstellung", () => {
  assert.equal(todayInLux(new Date("2026-10-01T22:30:00Z")), "2026-10-02"); // Sommerzeit, UTC+2
  assert.equal(todayInLux(new Date("2026-12-31T23:30:00Z")), "2027-01-01"); // Winterzeit, UTC+1
  assert.equal(todayInLux(new Date("2026-12-31T22:30:00Z")), "2026-12-31");
});

test("Wochentage", () => {
  assert.equal(weekdayOf("2026-10-03"), "sa");
  assert.equal(weekdayOf("2026-10-04"), "so");
});

test("Abholung frühestens am nächsten Öffnungstag", () => {
  // Freitag → Samstag (Lanners hat samstags offen)
  assert.equal(nextOpeningDay(lanners, "2026-10-02"), "2026-10-03");
  // Samstag → Montag (Sonntag zu); Montag hat Lanners nachmittags offen
  assert.equal(nextOpeningDay(lanners, "2026-10-03"), "2026-10-05");
  // Montag geschlossen im Testhaus → Dienstag
  assert.equal(nextOpeningDay(testHaus, "2026-10-03"), "2026-10-06");
});

test("Haltedauer zählt Öffnungstage, der Abholtag ist der erste", () => {
  assert.equal(holdUntil(lanners, "2026-10-03", 3), "2026-10-06"); // Sa, Mo, Di
  assert.equal(holdUntil(testHaus, "2026-10-06", 3), "2026-10-08"); // Di, Mi, Do
});

test("Feiertage und Ausnahmen gehen vor", () => {
  assert.equal(hoursOn(testHaus, "2026-12-25").grund, "feiertag");
  assert.deepEqual(hoursOn(testHaus, "2026-12-24").ranges, [["09:00", "14:00"]]);
  assert.deepEqual(hoursOn(testHaus, "2026-12-29").ranges, []);
  // 24.12. kurz offen → 26.12. (Sa) → 28.12. ist Montag (zu) → 30.12.
  assert.equal(nextOpeningDay(testHaus, "2026-12-24"), "2026-12-26");
  assert.equal(nextOpeningDay(testHaus, "2026-12-26"), "2026-12-30");
  // Echte Daten: Weihnachten bei beiden Häusern geschlossen (unbestätigt, OP-03.3)
  assert.equal(hoursOn(jager, "2026-12-25").ranges.length, 0);
});

test("Abholdatum im Formular wird geprüft", () => {
  const w = pickupWindow(lanners, "2026-10-02", 14);
  assert.deepEqual(w, { min: "2026-10-03", max: "2026-10-17" });
  assert.equal(isValidPickup(lanners, "2026-10-03", "2026-10-02", 14), true);
  assert.equal(isValidPickup(lanners, "2026-10-02", "2026-10-02", 14), false); // heute zu früh
  assert.equal(isValidPickup(lanners, "2026-10-04", "2026-10-02", 14), false); // Sonntag
  assert.equal(isValidPickup(lanners, "2026-10-19", "2026-10-02", 14), false); // zu spät
  assert.equal(isValidPickup(lanners, "3.10.2026", "2026-10-02", 14), false);
});
