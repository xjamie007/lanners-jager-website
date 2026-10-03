/**
 * 2-Klick-Karte (GoogleKarte.astro): Erst der Klick auf "Karte laden" setzt das
 * iframe von Google Maps. Vorher verbindet sich der Browser nicht mit Google.
 * Die Wahl gilt nur für diesen Seitenaufruf (nichts wird gespeichert).
 */
document.addEventListener("click", (e) => {
  const knopf = (e.target as Element).closest<HTMLButtonElement>("[data-gkarte-laden]");
  const flaeche = knopf?.closest("[data-gkarte]")?.querySelector<HTMLElement>("[data-gkarte-flaeche]");
  if (!knopf || !flaeche || !knopf.dataset.src) return;
  const frame = document.createElement("iframe");
  frame.className = "gkarte-frame";
  frame.src = knopf.dataset.src;
  frame.title = knopf.dataset.titel ?? "";
  frame.referrerPolicy = "no-referrer-when-downgrade";
  frame.allowFullscreen = true;
  flaeche.setAttribute("data-geladen", "");
  flaeche.replaceChildren(frame);
  // Der Knopf ist weg: Fokus auf die Karte, damit die Tastatur nicht am Seitenanfang landet
  frame.focus();
});
