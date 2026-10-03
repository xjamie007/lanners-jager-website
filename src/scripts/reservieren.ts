/**
 * Reservierungsformular (F1). Positionen aus der Tasche oder direkt von der
 * Produktseite (?v=<Schlüssel>), je Haus ein Abholdatum: frühestens der nächste
 * Öffnungstag (D9), spätestens 14 Tage danach, vorbelegt mit dem frühesten.
 */
import { config, tr, trp, price, house, escapeHtml, tagText } from "./config.ts";
import { heuteMarkieren } from "./zeiten.ts";
import { lesen, type TaschePos } from "./tasche.ts";
import { initFormular } from "./formular.ts";
import { liveBestand } from "./bestand.ts";
import { pickupWindow, isValidPickup, todayInLux, type HouseHours } from "../../supabase/functions/_shared/hours.ts";

interface ResConfig {
  maxTage: number;
  haltedauer: number;
  hours: Record<"lanners" | "jager", HouseHours>;
  namen: Record<string, string>;
}

const form = document.querySelector<HTMLFormElement>('[data-formular="reservieren"]');
const leer = document.querySelector<HTMLElement>("[data-res-leer]");
const rc = JSON.parse(document.getElementById("lj-res")!.textContent!) as ResConfig;
const cfg = config();
const heute = todayInLux();

function positionen(): TaschePos[] {
  const v = new URLSearchParams(location.search).get("v");
  if (v && /^\d{14}$/.test(v)) {
    const imBeutel = lesen().find((p) => p.key === v);
    if (imBeutel) return [{ ...imBeutel, menge: 1 }];
    try {
      const d = JSON.parse(sessionStorage.getItem("lj-direkt") ?? "null") as TaschePos | null;
      if (d && d.key === v) return [{ ...d, menge: 1 }];
    } catch {
      /* egal */
    }
    return [];
  }
  return lesen();
}


function render(items: TaschePos[], meldungen: Map<string, string>) {
  const box = form!.querySelector<HTMLElement>("[data-res-haeuser]")!;
  const haeuser = (["lanners", "jager"] as const).filter((h) => items.some((p) => p.snap.haus === h));
  box.innerHTML = haeuser
    .map((h) => {
      const hs = house(h);
      const win = pickupWindow(rc.hours[h], heute, rc.maxTage);
      const pos = items.filter((p) => p.snap.haus === h);
      return `<section class="res-haus" data-res-haus="${h}" aria-labelledby="rh-${h}">
        <h3 class="t-hausname" id="rh-${h}">${escapeHtml(hs.short)}</h3>
        <p class="t-klein" style="margin:-8px 0 12px">${escapeHtml(tr("haus.adresse", { nr: hs.nr }))}</p>
        <ul class="res-pos">${pos
          .map(
            (p) => `<li data-key="${p.key}"><img src="${escapeHtml(p.snap.bild)}" alt="" width="60" height="80"><span>
              <span class="t-marke">${escapeHtml(p.snap.marke)}</span><br>${escapeHtml(p.snap.name)}<br>
              <span class="t-klein">${escapeHtml(tr("tasche.farbe", { f: p.snap.farbe }))}, ${escapeHtml(tr("tasche.groesse", { g: p.snap.groesse }))}, ${escapeHtml(tr("tasche.menge"))} ${p.menge}, ${price(p.snap.preis)}</span>
              ${meldungen.get(p.key) ? `<br><span class="pos-meldung" role="status">${escapeHtml(meldungen.get(p.key)!)}</span>` : ""}
            </span></li>`,
          )
          .join("")}</ul>
        <div class="feld-gruppe res-datum" data-feld="abholung_${h}">
          <label class="feld-label" for="r-abholung-${h}">${escapeHtml(tr("form.abholungBei", { haus: hs.short }))}</label>
          <input class="feld" type="date" id="r-abholung-${h}" name="abholung_${h}" required min="${win.min}" max="${win.max}" value="${win.min}" aria-describedby="r-abholung-${h}-fehler r-abholung-${h}-hinweis" data-haus="${h}">
          <span class="feld-hinweis" id="r-abholung-${h}-hinweis">${escapeHtml(tagText(win.min))}</span>
          <p class="feld-fehler" id="r-abholung-${h}-fehler" hidden></p>
        </div>
        <details class="res-zeiten"><summary>${escapeHtml(tr("reservieren.zeitenVon", { haus: hs.short }))}</summary><div data-zeiten-ziel="${h}"></div></details>
      </section>`;
    })
    .join("");
  for (const h of haeuser) {
    const tpl = document.querySelector<HTMLTemplateElement>(`template[data-res-zeiten="${h}"]`);
    const ziel = box.querySelector(`[data-zeiten-ziel="${h}"]`);
    if (tpl && ziel) {
      ziel.append(tpl.content.cloneNode(true));
      heuteMarkieren(ziel);
    }
  }
  // Hinweis unter dem Datum: Wochentag des gewählten Tages
  for (const input of box.querySelectorAll<HTMLInputElement>('input[type="date"]')) {
    input.addEventListener("change", () => {
      const hint = document.getElementById(`${input.id}-hinweis`);
      if (hint && /^\d{4}-\d{2}-\d{2}$/.test(input.value)) hint.textContent = tagText(input.value);
    });
  }
  // Einwilligung nennt das Haus bzw. die Häuser
  const namen = haeuser.map((h) => rc.namen[h]);
  const ziel = form!.querySelector<HTMLElement>("[data-einwilligung-haeuser]");
  if (ziel) ziel.textContent = namen.length > 1 ? namen.join(cfg.lang === "fr" ? " et " : cfg.lang === "en" ? " and " : cfg.lang === "lb" ? " a " : " und ") : namen[0];
}

async function start() {
  if (!form || !leer) return;
  const items = positionen();
  if (items.length === 0) {
    leer.hidden = false;
    return;
  }
  form.hidden = false;
  const meldungen = new Map<string, string>();
  const params = new URLSearchParams(location.search);
  if (params.get("fehler") === "bestand") {
    // Der Server hat gemeldet, dass Größen inzwischen weg sind: je Position eine Meldung
    const live = await liveBestand(items.map((p) => p.key.slice(0, 8)));
    for (const p of items) {
      const n = live?.get(p.key)?.available ?? null;
      if (n !== null && n < p.menge) {
        const anders = live ? [...live.entries()].find(([k, s]) => k.slice(0, 12) === p.key.slice(0, 12) && k !== p.key && s.available > 0) : undefined;
        meldungen.set(
          p.key,
          anders
            ? trp("tasche.nichtMehrDaAlt", anders[1].available, { g: p.snap.groesse, haus: house(p.snap.haus).short, anders: house(anders[1].house).short })
            : tr("tasche.nichtMehrDa", { g: p.snap.groesse, haus: house(p.snap.haus).short }),
        );
      }
    }
  }
  render(items, meldungen);

  initFormular(form, {
    entwurf: "lj-entwurf-reservieren",
    regeln: {
      abholung_lanners: (el) => datumRegel(el as HTMLInputElement, "lanners"),
      abholung_jager: (el) => datumRegel(el as HTMLInputElement, "jager"),
    },
    vorSenden: (f) => {
      const feld = f.querySelector<HTMLInputElement>("[data-positionen]")!;
      feld.value = JSON.stringify(items.map((p) => ({ key: p.key, menge: p.menge, preis: p.snap.preis })));
      return true;
    },
  });
}

function datumRegel(el: HTMLInputElement, h: "lanners" | "jager"): string | null {
  const win = pickupWindow(rc.hours[h], heute, rc.maxTage);
  if (!el.value || !isValidPickup(rc.hours[h], el.value, heute, rc.maxTage)) return tr("form.fehlerDatum", { datum: tagText(win.min) });
  return null;
}

void start();
