/**
 * Kasse (F2) je Haus. Positionen aus der Tasche, Abholdatum oder Lieferadresse,
 * Rechnungsadresse optional. Die angezeigten Summen sind eine Vorschau; der
 * Server rechnet aus netto_price neu und meldet Preisänderungen (?fehler=preis).
 * Die Kontaktdaten bleiben für die Zahlung beim zweiten Haus ausgefüllt.
 */
import { config, tr, price, house, escapeHtml, tagText } from "./config.ts";
import { heuteMarkieren } from "./zeiten.ts";
import { lesen, type TaschePos } from "./tasche.ts";
import { initFormular, entwurfLaden, entwurfSpeichern } from "./formular.ts";
import { pickupWindow, isValidPickup, todayInLux, type HouseHours } from "../../supabase/functions/_shared/hours.ts";
import { normalizePostcode } from "../../supabase/functions/_shared/contract.ts";

interface KasseConfig {
  maxTage: number;
  hours: Record<"lanners" | "jager", HouseHours>;
  firmen: Record<string, string>;
  versand: { code: string; kostenCent: number; lieferzeitTage: number; demoWert: boolean }[];
}

const cfg = config();
const kc = JSON.parse(document.getElementById("lj-kasse")!.textContent!) as KasseConfig;
const form = document.querySelector<HTMLFormElement>('[data-formular="kasse"]');
const leer = document.querySelector<HTMLElement>("[data-kasse-leer]");
const params = new URLSearchParams(location.search);
const haus = params.get("haus") === "jager" ? "jager" : params.get("haus") === "lanners" ? "lanners" : null;
const modus = params.get("modus") === "ship" ? "ship" : params.get("modus") === "collect" ? "collect" : null;
const heute = todayInLux();
const KONTAKT = "lj-kontakt";


function start() {
  if (!form || !leer) return;
  const erlaubt = modus && cfg.modes.includes(modus) && haus;
  const items: TaschePos[] = erlaubt ? lesen().filter((p) => p.snap.haus === haus) : [];
  if (!erlaubt || items.length === 0) {
    leer.hidden = false;
    return;
  }
  form.hidden = false;
  const h = house(haus!);
  form.querySelector<HTMLInputElement>("[data-kasse-haus]")!.value = haus!;
  form.querySelector<HTMLInputElement>("[data-kasse-modus]")!.value = modus!;
  // Firmenname, unbestätigt mit sichtbarer Markierung (offener Punkt)
  const firma = () => {
    const teile: (string | Node)[] = [kc.firmen[haus!]];
    const offen = document.querySelector<HTMLTemplateElement>(`template[data-firma-offen="${haus}"]`);
    if (offen) teile.push(" ", offen.content.cloneNode(true));
    return teile;
  };
  const bei = form.querySelector<HTMLElement>("[data-kasse-bei]")!;
  const [beiVor, beiNach = ""] = tr("kasse.bei").split("{firma}");
  bei.replaceChildren(beiVor, ...firma(), `${beiNach}, ${tr("kasse.fuer", { haus: h.short, nr: h.nr })}`);

  // Rechtlicher Satz mit Links und Firma
  const recht = form.querySelector<HTMLElement>("[data-kasse-recht]")!;
  const links = document.querySelector<HTMLTemplateElement>("template[data-links]")!.content;
  const vorlage = recht.dataset.vorlage!;
  recht.textContent = "";
  for (const teil of vorlage.split(/(\{agb\}|\{widerruf\}|\{datenschutz\}|\{firma\})/)) {
    const m = /^\{(\w+)\}$/.exec(teil);
    if (!m) recht.append(document.createTextNode(teil));
    else if (m[1] === "firma") recht.append(...firma());
    else recht.append(links.querySelector(`[data-l="${m[1]}"]`)!.cloneNode(true));
  }

  // Abholung oder Lieferung
  const abholung = form.querySelector<HTMLElement>("[data-nur-abholung]")!;
  const lieferung = form.querySelector<HTMLElement>("[data-nur-versand]")!;
  abholung.hidden = modus !== "collect";
  lieferung.hidden = modus !== "ship";
  if (modus === "collect") {
    const win = pickupWindow(kc.hours[haus!], heute, kc.maxTage);
    const input = form.querySelector<HTMLInputElement>("#k-abholung")!;
    input.min = win.min;
    input.max = win.max;
    input.value = win.min;
    const hint = document.getElementById("k-abholung-hinweis")!;
    hint.textContent = tagText(win.min);
    input.addEventListener("change", () => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(input.value)) hint.textContent = tagText(input.value);
    });
    form.querySelector<HTMLElement>("[data-kasse-abholtext]")!.textContent = tr("kasse.abholungText", { haus: h.short, nr: h.nr });
    const tpl = document.querySelector<HTMLTemplateElement>(`template[data-kasse-zeiten="${haus}"]`);
    const ziel = form.querySelector<HTMLElement>("[data-kasse-zeiten-ziel]")!;
    if (tpl) {
      ziel.append(tpl.content.cloneNode(true));
      heuteMarkieren(ziel);
    }
  }
  const gleich = form.querySelector<HTMLInputElement>("[data-rechnung-gleich]")!;
  const rechnung = form.querySelector<HTMLElement>("[data-rechnung]")!;
  const rechnungZeigen = () => (rechnung.hidden = gleich.checked);
  gleich.addEventListener("change", rechnungZeigen);

  // Zusammenfassung (Vorschau)
  const summe = items.reduce((s, p) => s + p.snap.preis * p.menge, 0);
  const land = () => form.querySelector<HTMLSelectElement>('[name="land"]')?.value ?? "LU";
  const versandKosten = () => (modus === "ship" ? (kc.versand.find((l) => l.code === land())?.kostenCent ?? 0) : 0);
  const zusammenfassung = () => {
    const box = form.querySelector<HTMLElement>("[data-kasse-summe]")!;
    const vk = versandKosten();
    const demo = modus === "ship" && kc.versand.find((l) => l.code === land())?.demoWert;
    box.innerHTML = `<ul class="summe-pos">${items
      .map(
        (p) => `<li><span><span class="t-marke">${escapeHtml(p.snap.marke)}</span> ${escapeHtml(p.snap.name)}<br><span class="t-klein">${escapeHtml(
          tr("tasche.farbe", { f: p.snap.farbe }),
        )}, ${escapeHtml(tr("tasche.groesse", { g: p.snap.groesse }))}, ${p.menge} ×</span></span><span class="t-preis">${price(p.snap.preis * p.menge)}</span></li>`,
      )
      .join("")}</ul>
      <dl class="summe-zeilen">
        <div><dt>${escapeHtml(tr("kasse.zwischensumme"))}</dt><dd>${price(summe)}</dd></div>
        ${modus === "ship" ? `<div><dt>${escapeHtml(tr("kasse.versand"))}${demo ? ` (${escapeHtml(tr("demo.wert"))})` : ""}</dt><dd>${price(vk)}</dd></div>` : ""}
        <div class="summe-gesamt"><dt>${escapeHtml(tr("kasse.gesamt"))}</dt><dd>${price(summe + vk)}</dd></div>
      </dl>`;
    form.querySelector<HTMLInputElement>("[data-erwartet]")!.value = String(summe + vk);
  };
  zusammenfassung();
  form.querySelector('[name="land"]')?.addEventListener("change", zusammenfassung);

  // Danach das andere Haus?
  const anderes = lesen().some((p) => p.snap.haus !== haus);
  if (anderes) {
    const el = form.querySelector<HTMLElement>("[data-kasse-danach]")!;
    el.textContent = tr("kasse.danach", { haus: house(haus === "lanners" ? "jager" : "lanners").short });
    el.hidden = false;
  }

  // Zahlungsarten aus der Methods-API des Anbieters (nicht fest eingebaut, D10.6)
  if (cfg.functionsUrl) {
    fetch(`${cfg.functionsUrl}/checkout?methods=1&haus=${haus}&lang=${cfg.lang}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { methods?: { description: string }[] } | null) => {
        if (!d?.methods?.length) return;
        const el = form.querySelector<HTMLElement>("[data-kasse-zahlarten]")!;
        el.textContent = tr("kasse.zahlarten", { liste: d.methods.map((m) => m.description).join(", ") });
        el.hidden = false;
      })
      .catch(() => undefined);
  }

  // Kontaktdaten der ersten Zahlung übernehmen
  entwurfLaden(form, KONTAKT);
  rechnungZeigen();

  initFormular(form, {
    entwurf: "lj-entwurf-kasse",
    regeln: {
      abholung: (el) => {
        const win = pickupWindow(kc.hours[haus!], heute, kc.maxTage);
        return isValidPickup(kc.hours[haus!], el.value, heute, kc.maxTage) ? null : tr("form.fehlerDatum", { datum: tagText(win.min) });
      },
      plz: (el) => (normalizePostcode(el.value, land()) ? null : tr("kasse.fehlerPlz")),
      r_plz: (el) => (normalizePostcode(el.value, land()) ? null : tr("kasse.fehlerRPlz")),
    },
    vorSenden: (f) => {
      f.querySelector<HTMLInputElement>("[data-positionen]")!.value = JSON.stringify(items.map((p) => ({ key: p.key, menge: p.menge, preis: p.snap.preis })));
      // Nur die Kontaktdaten für die zweite Zahlung behalten (dieser Browser, diese Sitzung)
      const kontakt = document.createElement("form");
      for (const n of ["vorname", "name", "email", "telefon"]) {
        const src = f.querySelector<HTMLInputElement>(`[name="${n}"]`);
        if (src) {
          const i = document.createElement("input");
          i.name = n;
          i.value = src.value;
          kontakt.append(i);
        }
      }
      entwurfSpeichern(kontakt, KONTAKT);
      return true;
    },
  });
}

start();
