/**
 * Taschen-Seite (D5). Rendert aus dem localStorage, prüft den Live-Bestand,
 * begrenzt Mengen, meldet Preisänderungen und bietet die aktiven Wege an.
 */
import { config, tr, trp, price, house, escapeHtml } from "./config.ts";
import { lesen, setzen, entfernen, schreiben, type TaschePos } from "./tasche.ts";
import { liveBestand, type LiveSku } from "./bestand.ts";

const app = document.querySelector<HTMLElement>("[data-tasche-app]");
const ansage = document.querySelector<HTMLElement>("[data-tasche-ansage]");
const cfg = config();
// Mülleimer-Symbol aus Icon.astro (Vorlage in Bag.astro), damit es nur eine Quelle gibt
const muellIcon = document.querySelector<HTMLTemplateElement>("[data-icon-muell]")?.innerHTML ?? "";
const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;
let live: Map<string, LiveSku> | null = null;
const meldungen = new Map<string, string>();

function wegLesen(): string {
  try {
    const w = sessionStorage.getItem("lj-weg");
    if (w && cfg.modes.includes(w as "reserve")) return w;
  } catch {
    /* egal */
  }
  return cfg.modes[0] ?? "reserve";
}
function wegSchreiben(w: string) {
  try {
    sessionStorage.setItem("lj-weg", w);
  } catch {
    /* egal */
  }
}

function verfuegbar(p: TaschePos): number | null {
  if (!live) return null;
  return live.get(p.key)?.available ?? 0;
}

function render(fokusNach?: string) {
  if (!app) return;
  const items = lesen();
  if (items.length === 0) {
    const tpl = document.querySelector<HTMLTemplateElement>("[data-tasche-leer]")!;
    app.replaceChildren(tpl.content.cloneNode(true));
    return;
  }
  const haeuser = (["lanners", "jager"] as const).filter((h) => items.some((p) => p.snap.haus === h));
  const weg = wegLesen();
  const max = cfg.maxMenge;

  const gruppe = (h: "lanners" | "jager") => {
    const hs = house(h);
    const pos = items.filter((p) => p.snap.haus === h);
    const summe = pos.reduce((s, p) => s + p.snap.preis * p.menge, 0);
    return `<section class="tasche-haus" aria-labelledby="th-${h}">
      <h2 class="t-h3" id="th-${h}">${escapeHtml(tr("tasche.ausHaus", { haus: hs.short, nr: hs.nr }))}</h2>
      <ul class="pos-liste">${pos
        .map((p) => {
          const v = verfuegbar(p);
          const nichtDa = v !== null && v <= 0;
          // Live-Bestand, sonst der Stand beim Hinzufügen; ohne beides nur die Höchstmenge
          const bekannt = v ?? p.snap.bestand ?? null;
          const obergrenze = Math.max(1, Math.min(max, bekannt === null ? max : bekannt || p.menge));
          const opts = Array.from({ length: Math.max(obergrenze, p.menge) }, (_, i) => i + 1)
            .map((n) => `<option value="${n}"${n === p.menge ? " selected" : ""}>${n}</option>`)
            .join("");
          // Knapp: Der Bestand, nicht die Höchstmenge, begrenzt die Auswahl
          const knapp = !nichtDa && bekannt !== null && bekannt > 0 && bekannt < max;
          const meldung = meldungen.get(p.key);
          return `<li class="pos" data-key="${p.key}"${nichtDa ? " data-nicht-da" : ""}>
            <a class="pos-bild" href="${escapeHtml(p.snap.url)}" tabindex="-1" aria-hidden="true"><img src="${escapeHtml(p.snap.bild)}" alt="" width="96" height="128" loading="lazy"></a>
            <div class="pos-info">
              <span class="t-marke">${escapeHtml(p.snap.marke)}</span>
              <a href="${escapeHtml(p.snap.url)}">${escapeHtml(p.snap.name)}</a>
              <span class="t-klein">${escapeHtml(tr("tasche.farbe", { f: p.snap.farbe }))}, ${escapeHtml(tr("tasche.groesse", { g: p.snap.groesse }))}</span>
              <span class="t-preis">${p.snap.alt ? `<del class="nebentext"><span class="sr-only">${escapeHtml(tr("karte.statt") || "")} </span>${price(p.snap.alt)}</del> ` : ""}${price(p.snap.preis)}</span>
              ${knapp ? `<p class="pos-knapp" id="knapp-${p.key}">${escapeHtml(trp("tasche.knapp", bekannt!))}</p>` : ""}
              ${meldung ? `<p class="pos-meldung" role="status">${escapeHtml(meldung)}</p>` : ""}
              <div class="pos-aktionen">
                <label class="pos-menge"><span>${escapeHtml(tr("tasche.menge"))}</span>
                  <select class="feld" data-menge="${p.key}" aria-label="${escapeHtml(tr("tasche.mengeVon", { name: p.snap.name }))}"${knapp ? ` aria-describedby="knapp-${p.key}"` : ""}${nichtDa ? " disabled" : ""}>${opts}</select>
                </label>
                <button type="button" class="pos-muell" data-entfernen="${p.key}" title="${escapeHtml(tr("tasche.entfernen"))}" aria-label="${escapeHtml(tr("tasche.entfernenSr", { name: p.snap.name }))}">${muellIcon}</button>
              </div>
            </div>
          </li>`;
        })
        .join("")}</ul>
      <p class="tasche-summe"><span>${escapeHtml(tr("tasche.zwischensumme"))}</span><span class="t-preis">${price(summe)}</span></p>
    </section>`;
  };

  const optionen = cfg.modes
    .map((m) => {
      const label = m === "reserve" ? "tasche.wegReserve" : m === "collect" ? "tasche.wegCollect" : "tasche.wegShip";
      const text = m === "reserve" ? "tasche.wegReserveText" : m === "collect" ? "tasche.wegCollectText" : "tasche.wegShipText";
      return `<label class="weg-option"><input type="radio" name="weg" value="${m}"${m === weg ? " checked" : ""}><span><strong>${escapeHtml(tr(label))}</strong><span class="t-klein">${escapeHtml(tr(text))}</span></span></label>`;
    })
    .join("");

  const kaufbar = (h: string) => items.filter((p) => p.snap.haus === h && !(verfuegbar(p) !== null && verfuegbar(p)! <= 0));
  const aktionen =
    weg === "reserve"
      ? `<a class="btn btn-primaer btn-voll" href="${cfg.routes.reservieren}">${escapeHtml(tr("tasche.weiterReservieren"))}</a>`
      : haeuser
          .map((h, i) => {
            const pos = kaufbar(h);
            if (pos.length === 0) return "";
            const n = pos.reduce((s, p) => s + p.menge, 0);
            const summe = pos.reduce((s, p) => s + p.snap.preis * p.menge, 0);
            return `<a class="btn ${i === 0 ? "btn-primaer" : "btn-sekundaer"} btn-voll" href="${cfg.routes.kasse}?haus=${h}&amp;modus=${weg}">${escapeHtml(
              trp("tasche.bezahlenBei", n, { haus: house(h).short, summe: price(summe) }),
            )}</a>`;
          })
          .join("");

  app.innerHTML = `<div class="tasche-raster">
    <div>${haeuser.map(gruppe).join("")}</div>
    <div>
      <fieldset class="weg-wahl"><legend>${escapeHtml(tr("tasche.wie"))}</legend>${optionen}
        ${weg !== "reserve" && haeuser.length > 1 ? `<p class="zwei-haeuser">${escapeHtml(tr("tasche.zweiHaeuser"))}</p>` : ""}
        <div class="weg-aktionen">${aktionen}</div>
      </fieldset>
      <div class="tasche-vertrauen" data-vertrauen-ziel></div>
    </div>
  </div>`;
  // Vertrauensleiste (Vertrauen.astro) kommt fertig gerendert aus einer Vorlage
  const vertrauen = document.querySelector<HTMLTemplateElement>("[data-tasche-vertrauen]");
  app.querySelector("[data-vertrauen-ziel]")?.replaceChildren(vertrauen ? vertrauen.content.cloneNode(true) : "");
  if (fokusNach) document.getElementById(fokusNach)?.focus();
}

app?.addEventListener("change", (e) => {
  const t = e.target as HTMLInputElement | HTMLSelectElement;
  if (t.name === "weg") {
    wegSchreiben(t.value);
    render();
    app.querySelector<HTMLInputElement>(`input[name="weg"][value="${t.value}"]`)?.focus();
  }
  if (t.matches("[data-menge]")) {
    setzen((t as HTMLSelectElement).dataset.menge!, Number(t.value));
    const key = (t as HTMLSelectElement).dataset.menge!;
    render();
    app.querySelector<HTMLSelectElement>(`[data-menge="${key}"]`)?.focus();
  }
});
app?.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>("[data-entfernen]");
  if (!btn || btn.disabled) return;
  const key = btn.dataset.entfernen!;
  const name = lesen().find((p) => p.key === key)?.snap.name ?? "";
  const fertig = () => {
    entfernen([key]);
    if (ansage) ansage.textContent = tr("tasche.entfernt", { name });
    render();
    // Fokus auf die nächste Position oder die Überschrift
    const next = app.querySelector<HTMLElement>("[data-entfernen]") ?? document.querySelector<HTMLElement>("h1");
    if (next) {
      if (next.tagName === "H1") next.setAttribute("tabindex", "-1");
      next.focus();
    }
  };
  const pos = btn.closest<HTMLElement>(".pos");
  if (reduziert || !pos) return fertig();
  // Position gleitet aus und klappt zu (CSS in Bag.astro), danach neu zeichnen
  btn.disabled = true;
  pos.style.height = `${pos.offsetHeight}px`;
  void pos.offsetHeight;
  pos.setAttribute("data-weg", "");
  window.setTimeout(fertig, 300);
});

async function pruefen() {
  const items = lesen();
  render();
  if (items.length === 0) return;
  live = await liveBestand(items.map((p) => p.key.slice(0, 8)));
  if (!live) return render();
  let geaendert = false;
  for (const p of items) {
    const sku = live.get(p.key);
    const n = sku?.available ?? 0;
    if (n <= 0) {
      const anders = [...live.entries()].find(([k, s]) => k.slice(0, 12) === p.key.slice(0, 12) && k !== p.key && s.available > 0);
      meldungen.set(
        p.key,
        anders
          ? trp("tasche.nichtMehrDaAlt", anders[1].available, { g: p.snap.groesse, haus: house(p.snap.haus).short, anders: house(anders[1].house).short })
          : tr("tasche.nichtMehrDa", { g: p.snap.groesse, haus: house(p.snap.haus).short }),
      );
    } else if (p.menge > n) {
      p.menge = n;
      geaendert = true;
      meldungen.set(p.key, tr("tasche.angepasst", { name: p.snap.name }));
    }
    if (sku?.nettoPrice !== undefined && sku.nettoPrice !== p.snap.preis) {
      p.snap.preis = sku.nettoPrice;
      geaendert = true;
      meldungen.set(p.key, tr("tasche.preisNeu", { preis: price(sku.nettoPrice) }));
    }
  }
  if (geaendert) schreiben(items);
  render();
}
void pruefen();
