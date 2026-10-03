/**
 * Live-Öffnungsstatus (Infoleiste, Hausseiten, Startseite): "Geöffnet bis 18:00",
 * "Mittagspause, wieder ab 13:30", "Geschlossen, öffnet morgen um 08:30".
 * Rechnet in Luxemburger Zeit mit den Zeiten der nächsten Tage aus #lj-config.
 * Ist die Seite älter als diese Tage, bleibt der statische Text stehen.
 */
import { config, tr, luxTag, uhrzeit } from "./config.ts";

type Haus = "lanners" | "jager";
export type Zustand = "offen" | "pause" | "zu";

const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const WT = ["so", "mo", "di", "mi", "do", "fr", "sa"] as const;

function plusTage(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function status(haus: Haus, now = new Date()): { zustand: Zustand; text: string } | null {
  const tage = config().zeiten?.[haus];
  if (!tage) return null;
  const heute = luxTag(now);
  const ranges = tage[heute];
  if (!ranges) return null;
  const m = toMin(uhrzeit(now));
  const jetzt = ranges.find(([a, b]) => m >= toMin(a) && m < toMin(b));
  if (jetzt) return { zustand: "offen", text: tr("status.offenBis", { zeit: jetzt[1] }) };
  const spaeter = ranges.find(([a]) => toMin(a) > m);
  if (spaeter) {
    const pause = ranges.some(([, b]) => toMin(b) <= m);
    return { zustand: pause ? "pause" : "zu", text: tr(pause ? "status.pause" : "status.oeffnetHeute", { zeit: spaeter[0] }) };
  }
  for (let i = 1; i < 8; i++) {
    const d = plusTage(heute, i);
    const r = tage[d];
    if (!r) return null;
    if (r.length === 0) continue;
    if (i === 1) return { zustand: "zu", text: tr("status.oeffnetMorgen", { zeit: r[0][0] }) };
    const wt = WT[new Date(d + "T12:00:00Z").getUTCDay()];
    return { zustand: "zu", text: tr("status.oeffnetTag", { tag: tr(`zeiten.tage.${wt}`), zeit: r[0][0] }) };
  }
  return null;
}

export function statusAnzeigen(root: ParentNode = document) {
  for (const haus of ["lanners", "jager"] as const) {
    const s = status(haus);
    if (!s) continue;
    for (const el of root.querySelectorAll<HTMLElement>(`[data-offen-status="${haus}"]`)) {
      el.textContent = s.text;
      el.closest<HTMLElement>("[data-offen-box]")?.removeAttribute("hidden");
    }
    for (const el of root.querySelectorAll<HTMLElement>(`[data-offen-punkt="${haus}"]`)) el.dataset.zustand = s.zustand === "offen" ? "offen" : "zu";
  }
}
