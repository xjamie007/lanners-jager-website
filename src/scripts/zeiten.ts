/**
 * "heute" in den Öffnungszeiten (Zeitzone Luxemburg), im Browser gesetzt, damit
 * eine zwischengespeicherte Seite nicht den falschen Tag markiert. Fett und mit
 * dem Wort "heute", nicht nur farbig. Feiertag oder Ausnahme heute ersetzt die Zeit.
 */
import { luxTag, luxWochentag } from "./config.ts";

export function heuteMarkieren(root: ParentNode = document) {
  const now = new Date();
  const heute = luxWochentag(now);
  const datum = luxTag(now);
  for (const block of root.querySelectorAll<HTMLElement>("[data-zeiten]")) {
    if (block.hasAttribute("data-heute-gesetzt")) continue;
    block.setAttribute("data-heute-gesetzt", "");
    const row = block.querySelector<HTMLElement>(`tr[data-wochentag="${heute}"]`);
    if (!row) continue;
    row.setAttribute("data-heute", "");
    row.querySelector<HTMLElement>(".heute-wort")?.removeAttribute("hidden");
    const sonder = block.dataset.sonder ? (JSON.parse(block.dataset.sonder) as Record<string, string>) : {};
    if (sonder[datum]) {
      const td = row.querySelector("td");
      if (td) td.textContent = sonder[datum];
    }
  }
}
