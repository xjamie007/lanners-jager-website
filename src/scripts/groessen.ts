/**
 * Island der Größenleiste (C5), ohne Framework. Aufgaben:
 *  1. Live-Bestand von der Edge Function `stock` holen und geänderte Zellen in
 *     300 ms überblenden; fällt die Function aus, bleibt der Build-Stand stehen.
 *  2. Reihenfolge nach gewähltem Haus: dessen Reihe zuerst, die andere zugeklappt.
 *  3. Zusammenfassung in Klartext, Tasche und Reservierung.
 * Halte-Mengen laufender Zahlungen zieht die Function bereits ab (D10.6).
 */
import { config, tr, trp, house, tagText, luxTag, uhrzeit } from "./config.ts";
import { hinzufuegen, lesen } from "./tasche.ts";
import { miniTascheZeigen } from "./mini-tasche.ts";

interface Cell {
  key: string;
  haus: "lanners" | "jager";
  groesse: string;
  stock: number;
}
interface ArtikelData {
  uid8: string;
  marke: string;
  name: string;
  farbe: string;
  preis: number;
  alt?: number;
  bild: string;
  fit: string;
  url: string;
  asOf: string;
  cells: Cell[];
  houses: ("lanners" | "jager")[];
}

const form = document.querySelector<HTMLFormElement>("[data-groessenleiste]");
const dataEl = document.getElementById("lj-artikel");
if (form && dataEl) init(form, JSON.parse(dataEl.textContent!) as ArtikelData);

function standText(iso: string): string {
  const d = new Date(iso);
  if (luxTag(d) === luxTag(new Date())) return tr("groesse.standHeute", { zeit: uhrzeit(d) });
  return tr("groesse.standTag", { datum: tagText(luxTag(d), false), zeit: uhrzeit(d) });
}

function init(form: HTMLFormElement, data: ArtikelData) {
  const cfg = config();
  const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stock = new Map(data.cells.map((c) => [c.key, c.stock]));
  const summary = form.querySelector<HTMLElement>("[data-gl-zusammenfassung]")!;
  const status = form.querySelector<HTMLElement>("[data-gl-status]")!;
  const fehler = form.querySelector<HTMLElement>("[data-gl-fehler]")!;
  const standEl = form.querySelector<HTMLElement>("[data-gl-stand]")!;
  const nirgends = form.querySelector<HTMLElement>("[data-gl-nirgends]")!;
  const buttons = form.querySelector<HTMLElement>("[data-gl-buttons]");
  const vorraetigEl = document.querySelector<HTMLElement>("[data-gl-vorraetig]");
  const modus = form.dataset.modus as "1d" | "2d" | "tu";
  const inputs = () => [...form.querySelectorAll<HTMLInputElement>('input[name="variante"]')].filter((i) => i.value);
  const blocks = [...form.querySelectorAll<HTMLElement>("[data-gl-block]")];
  const container = form.querySelector<HTMLElement>("[data-gl-haeuser]")!;

  standEl.textContent = standText(data.asOf);

  const zustandText = (n: number) => (n <= 0 ? tr("groesse.nicht") : n === 1 ? tr("groesse.letztes") : trp("groesse.da", n));
  const zustandKey = (n: number) => (n <= 0 ? "nicht" : n === 1 ? "letztes" : "da");

  function selected(): HTMLInputElement | null {
    return inputs().find((i) => i.checked) ?? null;
  }

  function zusammenfassung() {
    const sel = selected();
    if (!sel) {
      summary.textContent = "";
      return;
    }
    const h = house(sel.dataset.haus!);
    const n = stock.get(sel.value) ?? 0;
    summary.textContent =
      modus === "tu" ? trp("groesse.zusammenfassungTu", n, { haus: h.short, nr: h.nr }) : trp("groesse.zusammenfassung", n, { g: sel.dataset.groesse!, haus: h.short, nr: h.nr });
  }

  // ── Reihenfolge und Zuklappen nach gewähltem Haus ────────────────────────
  function ordnen(gewaehlt: string) {
    if (modus === "2d") {
      const wahl = form.querySelector<HTMLElement>("[data-gl-matrixwahl]");
      const ziel = data.houses.includes(gewaehlt as "lanners") ? gewaehlt : (blocks[0]?.dataset.glBlock ?? "");
      if (wahl) {
        const r = wahl.querySelector<HTMLInputElement>(`input[value="${ziel}"]`);
        if (r) r.checked = true;
      }
      matrixZeigen(ziel);
      return;
    }
    if (blocks.length < 2) return;
    const zuerst = data.houses.includes(gewaehlt as "lanners") ? gewaehlt : null;
    for (const b of blocks) {
      const h = b.dataset.glBlock!;
      const fs = b.querySelector<HTMLFieldSetElement>("fieldset")!;
      const btn = b.querySelector<HTMLButtonElement>("[data-gl-auchbei]")!;
      if (!zuerst || h === zuerst) {
        fs.hidden = false;
        btn.hidden = true;
        b.style.order = h === zuerst ? "-1" : "0";
      } else {
        // Die andere Reihe ist zu einer Zeile zugeklappt, außer dort ist etwas gewählt
        const sel = selected();
        const offen = sel?.dataset.haus === h;
        fs.hidden = !offen;
        btn.hidden = offen;
        btn.setAttribute("aria-expanded", String(offen));
        b.style.order = "1";
      }
    }
    container.style.display = "flex";
  }
  for (const b of blocks) {
    const btn = b.querySelector<HTMLButtonElement>("[data-gl-auchbei]");
    btn?.addEventListener("click", () => {
      const fs = b.querySelector<HTMLFieldSetElement>("fieldset")!;
      fs.hidden = false;
      btn.hidden = true;
      btn.setAttribute("aria-expanded", "true");
      fs.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
    });
  }
  function matrixZeigen(h: string) {
    for (const b of blocks) {
      const fs = b.querySelector<HTMLFieldSetElement>("fieldset")!;
      fs.hidden = b.dataset.glBlock !== h;
    }
  }
  const aktuellesHaus = () => document.documentElement.dataset.haus ?? "beide";
  ordnen(aktuellesHaus());
  window.addEventListener("lj:haus", (e) => ordnen((e as CustomEvent<{ haus: string }>).detail.haus));

  // ── Auswahl ───────────────────────────────────────────────────────────────
  form.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "matrix-haus") {
      matrixZeigen(t.value);
      return;
    }
    if (t.name === "variante") {
      fehler.hidden = true;
      status.textContent = "";
      zusammenfassung();
    }
  });

  // ── Tasche und Reservierung ───────────────────────────────────────────────
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const aktion = ((e as SubmitEvent).submitter as HTMLElement | null)?.dataset.glAktion;
    const sel = selected();
    if (!sel) {
      fehler.hidden = false;
      const erstes = [...form.querySelectorAll<HTMLInputElement>('input[name="variante"]:not(:disabled)')].find((i) => !i.closest("fieldset")?.hidden);
      erstes?.focus();
      return;
    }
    const snap = {
      uid8: data.uid8,
      marke: data.marke,
      name: data.name,
      farbe: data.farbe,
      groesse: sel.dataset.groesse!,
      haus: sel.dataset.haus as "lanners" | "jager",
      preis: data.preis,
      alt: data.alt,
      bild: data.bild,
      fit: data.fit,
      url: data.url,
      bestand: stock.get(sel.value) ?? 0,
    };
    if (aktion === "reservieren") {
      try {
        sessionStorage.setItem("lj-direkt", JSON.stringify({ key: sel.value, menge: 1, snap }));
      } catch {
        /* ohne sessionStorage: Reservierung über die Tasche */
      }
      location.href = `${cfg.routes.reservieren}?v=${encodeURIComponent(sel.value)}`;
      return;
    }
    const max = Math.min(cfg.maxMenge, stock.get(sel.value) ?? 0);
    const vorher = lesen().find((p) => p.key === sel.value)?.menge ?? 0;
    if (vorher >= max) {
      status.textContent = tr("groesse.maxBestand");
      return;
    }
    hinzufuegen(sel.value, snap, max);
    status.innerHTML = "";
    const text = document.createTextNode(tr("tasche.status") + " ");
    const a = document.createElement("a");
    a.href = cfg.routes.tasche;
    a.textContent = tr("tasche.zur");
    status.append(text, a);
    // Panel mit Artikel und Zwischensumme; die Statuszeile bleibt für Screenreader und als Rückfall
    miniTascheZeigen(snap, (e as SubmitEvent).submitter as HTMLElement | null);
  });

  // ── Live-Bestand ─────────────────────────────────────────────────────────
  function anwenden(neu: Map<string, number>) {
    let geaendert = false;
    for (const input of inputs()) {
      const alt = stock.get(input.value) ?? 0;
      const n = neu.get(input.value) ?? 0;
      if (alt === n) continue;
      geaendert = true;
      stock.set(input.value, n);
      input.dataset.stock = String(n);
      input.disabled = n <= 0;
      if (n <= 0 && input.checked) input.checked = false;
      const h = house(input.dataset.haus!);
      if (modus === "tu") {
        const label = input.closest<HTMLElement>(".gl-tu")!;
        label.dataset.zustand = zustandKey(n);
        label.querySelector("[data-gl-name]")!.textContent = n > 0 ? trp("groesse.tu", n, { haus: h.short }) : tr("groesse.tuNicht", { haus: h.short });
      } else {
        const label = form.querySelector<HTMLElement>(`label[for="${CSS.escape(input.id)}"]`)!;
        if (!reduziert) {
          label.setAttribute("data-aktualisiert", "");
          setTimeout(() => label.removeAttribute("data-aktualisiert"), 320);
        }
        label.dataset.zustand = zustandKey(n);
        const g = label.querySelector<HTMLElement>(".gl-groesse");
        if (g && modus === "2d") g.textContent = n === 1 ? "1" : "";
        label.querySelector("[data-gl-name]")!.textContent = tr("groesse.zelle", { groesse: input.dataset.groesse!, haus: h.short, zustand: zustandText(n) });
      }
    }
    // "Auch bei …"-Zeilen und Gesamtzustand
    for (const b of blocks) {
      const h = house(b.dataset.glBlock!);
      const btn = b.querySelector<HTMLButtonElement>("[data-gl-auchbei]");
      const da = inputs()
        .filter((i) => i.dataset.haus === h.id && (stock.get(i.value) ?? 0) > 0)
        .map((i) => i.dataset.groesse!);
      if (btn) btn.textContent = da.length ? tr("groesse.auchBei", { haus: h.short, groessen: da.join(", ") }) : tr("groesse.auchBeiNicht", { haus: h.short });
    }
    const gesamt = [...stock.values()].reduce((s, n) => s + n, 0);
    nirgends.hidden = gesamt > 0;
    if (buttons) buttons.hidden = gesamt === 0;
    if (vorraetigEl) {
      const haeuser = (["lanners", "jager"] as const).filter((h) => inputs().some((i) => i.dataset.haus === h && (stock.get(i.value) ?? 0) > 0));
      vorraetigEl.textContent = haeuser.length
        ? tr("produkt.vorraetigBei", { liste: haeuser.map((h) => `${house(h).short}, ${tr("haus.adresse", { nr: house(h).nr })}`).join(tr("seo.und")) })
        : tr("produkt.vorraetigNirgends");
    }
    zusammenfassung();
    return geaendert;
  }

  async function live() {
    if (!cfg.functionsUrl) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(`${cfg.functionsUrl}/stock?uid8=${data.uid8}`, { signal: ctrl.signal, headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { asOf: string; skus: { key14: string; available: number }[] };
      if (!body || !Array.isArray(body.skus)) throw new Error("Antwort ungültig");
      const neu = new Map(body.skus.map((s) => [s.key14, Math.max(0, Number(s.available) || 0)]));
      const geaendert = anwenden(neu);
      standEl.textContent = standText(body.asOf);
      if (geaendert) {
        status.textContent = tr("groesse.aktualisiert");
      }
    } catch {
      standEl.textContent = tr("groesse.liveAus", { stand: standText(data.asOf) });
    } finally {
      clearTimeout(timer);
    }
  }
  void live();
}
