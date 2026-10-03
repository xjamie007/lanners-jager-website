/**
 * Google Maps je Haus. Links ("Route planen", "In Google Maps öffnen") öffnen
 * Google erst beim Klick; die eingebettete Karte lädt erst nach "Karte laden"
 * (2-Klick-Lösung, GoogleKarte.astro), damit die Seite ohne Einwilligungs-Banner
 * auskommt. Ohne API-Schlüssel: Suche nach Name und Adresse, die Google dem
 * Profil des Hauses zuordnet (Profile übernehmen: OP-12).
 */
import type { House } from "../config/houses.ts";
import type { Lang } from "../i18n/index.ts";

/** "Confection Lanners, 18 Grand-Rue, 9050 Ettelbruck, Luxembourg" */
function ziel(h: House): string {
  return `${h.name}, ${h.streetAddress.replace(",", "")}, ${h.postalCode.replace(/^L-/, "")} ${h.locality}, Luxembourg`;
}

/** Ort in Google Maps (Profil mit Fotos und Bewertungen), auf dem Handy in der App */
export function mapsOrt(h: House): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ziel(h))}`;
}

/** Route von hier zum Haus; auf dem Handy öffnet sich die Navigation */
export function mapsRoute(h: House): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ziel(h))}`;
}

// Google Maps kennt kein Lëtzebuergesch als Oberfläche
const HL: Record<Lang, string> = { lb: "de", de: "de", fr: "fr", en: "en" };

/** Adresse der eingebetteten Karte (erst nach Klick gesetzt) */
export function mapsEinbettung(h: House, lang: Lang): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(ziel(h))}&hl=${HL[lang]}&z=17&output=embed`;
}
