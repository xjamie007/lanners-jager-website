/**
 * Mini-Tasche (MiniTasche.astro): zeigt nach "In die Tasche" den gelegten Artikel,
 * Anzahl und Zwischensumme der ganzen Tasche. Schließen über "Weiter einkaufen",
 * das X, Escape oder einen Klick neben das Panel.
 */
import { config, tr, trp, price, house, escapeHtml } from "./config.ts";
import { lesen, anzahl, type TascheSnap } from "./tasche.ts";

const dialog = document.querySelector<HTMLDialogElement>("[data-mini-tasche]");
// Safari fokussiert Buttons beim Klick nicht; deshalb merken wir uns selbst, wohin der Fokus zurück soll
let zurueck: HTMLElement | null = null;

if (dialog) {
  dialog.addEventListener("close", () => {
    zurueck?.focus();
    zurueck = null;
  });
  dialog.addEventListener("click", (e) => {
    // Ein Klick auf den abgedunkelten Hintergrund kommt beim Dialog selbst an, aber außerhalb seiner Fläche
    const r = dialog.getBoundingClientRect();
    const daneben = e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
    if (daneben || (e.target as Element).closest("[data-mt-zu]")) dialog.close();
  });
}

/** Panel öffnen; false, wenn es auf der Seite fehlt (dann bleibt die Statuszeile) */
export function miniTascheZeigen(snap: TascheSnap, ausloeser: HTMLElement | null = null): boolean {
  if (!dialog || typeof dialog.showModal !== "function") return false;
  zurueck = ausloeser;
  const h = house(snap.haus);
  // wie im Warenkorb: Hinweis, wenn der Bestand und nicht die Höchstmenge begrenzt
  const knapp = snap.bestand !== undefined && snap.bestand > 0 && snap.bestand < config().maxMenge;
  const artikel = dialog.querySelector<HTMLElement>("[data-mt-artikel]")!;
  artikel.innerHTML = `<span class="mt-bild" data-fit="${escapeHtml(snap.fit ?? "contain")}"><img src="${escapeHtml(snap.bild)}" alt="" width="96" height="128"></span>
    <span class="mt-info">
      <span class="t-marke">${escapeHtml(snap.marke)}</span>
      <span class="mt-name">${escapeHtml(snap.name)}</span>
      <span class="t-klein">${escapeHtml(tr("tasche.farbe", { f: snap.farbe }))}, ${escapeHtml(tr("tasche.groesse", { g: snap.groesse }))}</span>
      <span class="mt-haus">${escapeHtml(tr("tasche.bei", { haus: h.short, nr: h.nr }))}</span>
      <span class="t-preis mt-preis">${snap.alt ? `<del class="nebentext">${price(snap.alt)}</del> ` : ""}${price(snap.preis)}</span>
      ${knapp ? `<span class="mt-knapp">${escapeHtml(trp("tasche.knapp", snap.bestand!))}</span>` : ""}
    </span>`;
  const items = lesen();
  dialog.querySelector<HTMLElement>("[data-mt-anzahl]")!.textContent = trp("tasche.miniAnzahl", anzahl(items));
  dialog.querySelector<HTMLElement>("[data-mt-summe]")!.textContent = price(items.reduce((s, p) => s + p.snap.preis * p.menge, 0));
  if (!dialog.open) dialog.showModal();
  return true;
}
