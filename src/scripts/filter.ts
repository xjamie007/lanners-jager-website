/**
 * Filter-Island der Listenseiten (D3).
 *
 * Ohne Filter bleibt die statische Seite, wie sie ist. Beim ersten Bedarf (Filter,
 * Sortierung, Haus, "Weitere Artikel laden" oder Parameter in der URL) lädt sie
 * die Artikeldaten der Sprache (/{lang}/filter/artikel.json) und die Reihenfolge
 * der Liste (/filter/{liste}.json), filtert im Browser und schreibt den Zustand in
 * die URL. Vorhandene Karten werden wiederverwendet (keine flackernden Bilder).
 * Seiten mit Filterparametern bekommen noindex, follow; der Canonical bleibt.
 */
import { config, tr, trp, price, escapeHtml as esc } from "./config.ts";
import { preisStufe } from "../lib/filter-shared.ts";
import type { ArtikelIndex, IndexArtikel, IndexFoto } from "../lib/filterindex.ts";

const PAGE = 48;
const SIZES = "(min-width: 1200px) 25vw, (min-width: 768px) 33vw, 50vw";
const HAEUSER = ["lanners", "jager"] as const;
type Haus = "beide" | (typeof HAEUSER)[number];
type Sort = "" | "neu" | "preis-auf" | "preis-ab";
const SORTS: Sort[] = ["", "neu", "preis-auf", "preis-ab"];
const LISTEN = ["marke", "groesse", "farbe", "preis"] as const;
type ListenFeld = (typeof LISTEN)[number];

interface Zustand {
  marke: string[];
  groesse: string[];
  farbe: string[];
  preis: string[];
  sale: boolean;
  sort: Sort;
}

interface Daten {
  index: Map<string, IndexArtikel>;
  uids: string[];
  marken: Record<string, string>;
}

const listeEl = document.querySelector<HTMLElement>("[data-liste]");
const filterEl = document.querySelector<HTMLElement>("[data-filter]");
if (listeEl && filterEl) init(listeEl, filterEl);

function init(root: HTMLElement, box: HTMLElement) {
  const cfg = config();
  const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mq = matchMedia("(min-width: 1024px)");
  const raster = root.querySelector<HTMLUListElement>("[data-raster]")!;
  const anzahl = root.querySelector<HTMLElement>("[data-anzahl]")!;
  const leer = root.querySelector<HTMLElement>("[data-leer]")!;
  const mehrBox = root.querySelector<HTMLElement>("[data-mehr-box]")!;
  const mehr = root.querySelector<HTMLButtonElement>("[data-mehr]")!;
  const seitenNav = root.querySelector<HTMLElement>("[data-seitennav]");
  const status = root.querySelector<HTMLElement>("[data-filter-status]")!;
  const form = box.querySelector<HTMLFormElement>("[data-filter-form]")!;
  const dialog = box.querySelector<HTMLDialogElement>("[data-filter-dialog]")!;
  const inline = box.querySelector<HTMLElement>("[data-filter-inline]")!;
  const oeffnen = box.querySelector<HTMLButtonElement>("[data-filter-oeffnen]")!;
  const zeigen = box.querySelector<HTMLButtonElement>("[data-filter-zeigen]")!;
  const sortSel = box.querySelector<HTMLSelectElement>("[data-filter-sort]")!;
  const fehlerText = box.querySelector<HTMLElement>("[data-filter-fehler]")!;
  const resetButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-filter-reset]")];
  const robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  const robotsStart = robotsMeta?.content ?? "";
  const gesamt = Number(root.dataset.gesamt ?? 0);
  const listeDatei = box.dataset.listeDatei!;

  let seite = Number(root.dataset.seite ?? 1);
  let daten: Daten | null = null;
  let ladeVersuch: Promise<Daten> | null = null;
  /** wie viele Treffer sichtbar sind */
  let limit = PAGE;
  /** die statische Seitennavigation passt nicht mehr, sobald die URL auf Seite 1 zeigt */
  let navVeraltet = false;

  const haus = (): Haus => {
    const h = document.documentElement.dataset.haus;
    return h === "lanners" || h === "jager" ? h : "beide";
  };
  const hatFilter = (s: Zustand) => LISTEN.some((k) => s[k].length > 0) || s.sale;
  const aktiv = () => hatFilter(z) || z.sort !== "" || haus() !== "beide";

  // ── Laden ──────────────────────────────────────────────────────────────
  function laden(): Promise<Daten> {
    if (daten) return Promise.resolve(daten);
    if (!ladeVersuch) {
      ladeVersuch = (async () => {
        const [a, l] = await Promise.all([fetch(`${cfg.base}${cfg.lang}/filter/artikel.json`), fetch(`${cfg.base}filter/${listeDatei}.json`)]);
        if (!a.ok || !l.ok) throw new Error(`Filterdaten: ${a.status}/${l.status}`);
        const artikel = (await a.json()) as ArtikelIndex;
        const liste = (await l.json()) as { uids: string[] };
        const index = new Map(artikel.a.map((x) => [x.u, x]));
        daten = { index, uids: liste.uids.filter((u) => index.has(u)), marken: artikel.marken };
        fehlerText.hidden = true;
        return daten;
      })();
      ladeVersuch.catch(() => {
        ladeVersuch = null;
        fehlerText.hidden = false;
      });
    }
    return ladeVersuch;
  }

  // ── Zustand ↔ URL und Formular ───────────────────────────────────────────
  function erlaubt(name: string): Set<string> {
    return new Set([...form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)].map((i) => i.value));
  }
  function ausUrl(): Zustand {
    const q = new URLSearchParams(location.search);
    const werte = (name: ListenFeld) => {
      const ok = erlaubt(name);
      return [...new Set(q.getAll(name))].filter((v) => ok.has(v));
    };
    const sort = q.get("sortierung") as Sort | null;
    return {
      marke: werte("marke"),
      groesse: werte("groesse"),
      farbe: werte("farbe"),
      preis: werte("preis"),
      sale: q.get("sale") === "1" && erlaubt("sale").size > 0,
      sort: sort && SORTS.includes(sort) ? sort : "",
    };
  }
  function ausFormular(): Zustand {
    const fd = new FormData(form);
    const werte = (name: ListenFeld) => fd.getAll(name).map(String);
    return { marke: werte("marke"), groesse: werte("groesse"), farbe: werte("farbe"), preis: werte("preis"), sale: fd.get("sale") === "1", sort: (sortSel.value as Sort) || "" };
  }
  function inFormular(s: Zustand) {
    for (const input of form.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) {
      input.checked = input.name === "sale" ? s.sale : s[input.name as ListenFeld].includes(input.value);
    }
    sortSel.value = s.sort;
    // im Dialog sind Felder mit Auswahl gleich offen
    if (!mq.matches) for (const d of form.querySelectorAll<HTMLDetailsElement>("[data-filter-feld]")) d.open = !!d.querySelector("input:checked");
  }
  // Safari wirft nach 100 replaceState-Aufrufen in 30 s einen Fehler; deshalb nur
  // schreiben, wenn sich die URL wirklich ändert, und nie den Filter daran scheitern lassen
  let letzteUrl = location.href;
  function inUrl() {
    const u = new URL(location.href);
    for (const k of [...LISTEN, "sale", "sortierung", "haus"]) u.searchParams.delete(k);
    for (const k of LISTEN) for (const v of z[k]) u.searchParams.append(k, v);
    if (z.sale) u.searchParams.set("sale", "1");
    if (z.sort) u.searchParams.set("sortierung", z.sort);
    if (haus() !== "beide") u.searchParams.set("haus", haus());
    // gefiltert gibt es keine Seiten: zurück auf die erste Seite der Liste
    if (aktiv() && seite > 1) {
      u.pathname = root.dataset.basis!;
      seite = 1;
      navVeraltet = true;
    }
    const neu = u.toString();
    if (neu !== letzteUrl) {
      try {
        history.replaceState(history.state, "", neu);
        letzteUrl = neu;
      } catch {
        /* Verlauf gedrosselt: Ansicht und Formular stimmen trotzdem */
      }
    }
    if (robotsMeta && !cfg.demo) robotsMeta.content = u.search ? "noindex, follow" : robotsStart;
  }

  // ── Zähler und Zurücksetzen ─────────────────────────────────────────────
  function zaehler() {
    let n = 0;
    for (const d of form.querySelectorAll<HTMLDetailsElement>("[data-filter-feld]")) {
      const k = d.querySelectorAll("input:checked").length;
      n += k;
      d.querySelector<HTMLElement>("[data-feld-zahl]")!.textContent = k ? ` (${k})` : "";
    }
    if (form.querySelector<HTMLInputElement>('input[name="sale"]')?.checked) n++;
    oeffnen.querySelector<HTMLElement>("[data-filter-zahl]")!.textContent = n ? ` (${n})` : "";
    const zuruecksetzbar = n > 0 || haus() !== "beide";
    for (const b of resetButtons) if (b.closest("[data-filter-form]")) b.hidden = !zuruecksetzbar;
  }

  // ── Ergebnis ───────────────────────────────────────────────────────────
  function passt(a: IndexArtikel, h: Haus): boolean {
    if (h !== "beide" && !a.h.includes(h)) return false;
    if (z.marke.length && !z.marke.includes(a.m)) return false;
    if (z.farbe.length && !(a.f && z.farbe.includes(a.f))) return false;
    if (z.preis.length && !z.preis.includes(preisStufe(a.q))) return false;
    if (z.sale && !(a.q < a.p)) return false;
    if (z.groesse.length) {
      const hs = h === "beide" ? HAEUSER : [h];
      if (!hs.some((x) => (a.g[x] ?? []).some((g) => z.groesse.includes(g)))) return false;
    }
    return true;
  }
  function ergebnis(d: Daten): IndexArtikel[] {
    const h = haus();
    const r = d.uids.map((u) => d.index.get(u)!).filter((a) => passt(a, h));
    // sort ist stabil: bei Gleichstand bleibt die empfohlene Reihenfolge
    if (z.sort === "neu") r.sort((a, b) => b.neu.localeCompare(a.neu));
    else if (z.sort === "preis-auf") r.sort((a, b) => a.q - b.q);
    else if (z.sort === "preis-ab") r.sort((a, b) => b.q - a.q);
    return r;
  }

  // ── Karten (dasselbe Markup wie ProductCard.astro) ───────────────────────
  function fotoHtml(f: IndexFoto, klasse: string, demoLabel: boolean, vt: boolean): string {
    const img = `<img src="${esc(f.s)}"${f.ss ? ` srcset="${esc(f.ss)}" sizes="${SIZES}"` : ""} width="${f.w}" height="${f.h}" alt="" loading="lazy" decoding="async">`;
    const inhalt = f.avif && f.webp ? `<picture><source type="image/avif" srcset="${esc(f.avif)}" sizes="${SIZES}"><source type="image/webp" srcset="${esc(f.webp)}" sizes="${SIZES}">${img}</picture>` : img;
    const label = f.demo && demoLabel ? `<span class="demo-foto" aria-hidden="true">${esc(tr("demo.foto"))}</span>` : "";
    const demo = f.demo && f.ss ? " ist-demo" : "";
    return `<span class="produktbild ${f.fit === "cover" ? "fit-cover" : "fit-contain"}${demo}${klasse ? " " + klasse : ""}"${vt ? " data-vt-foto" : ""}>${inhalt}${label}</span>`;
  }
  function preisHtml(a: IndexArtikel): string {
    const ab = a.x !== undefined && a.x > a.q;
    const netto = ab ? tr("produkt.ab", { preis: price(a.q) }) : price(a.q);
    if (a.q < a.p) {
      const pct = a.d || Math.round((1 - a.q / a.p) * 100);
      const rabatt = cfg.lang === "en" ? `−${pct}%` : `−${pct} %`;
      return `<del class="preis-alt"><span class="sr-only">${esc(tr("karte.statt"))} </span>${esc(price(a.p))}</del><ins class="preis-neu t-preis"><span class="sr-only">${esc(tr("karte.jetzt"))} </span>${esc(netto)}</ins><span class="preis-rabatt">${rabatt}</span>`;
    }
    return `<span class="t-preis">${esc(netto)}</span>`;
  }
  function karte(a: IndexArtikel, d: Daten): HTMLLIElement {
    const verf = HAEUSER.filter((h) => (a.g[h]?.length ?? 0) > 0);
    const verfText = verf.length === 2 ? tr("karte.beide") : verf.length === 1 ? tr("karte.nurBei", { haus: tr(`haus.${verf[0]}`) }) : tr("karte.nicht");
    const [f1, f2] = a.b;
    const li = document.createElement("li");
    li.dataset.haeuser = a.h.join(" ");
    li.innerHTML = `<article class="karte" data-karte data-uid8="${esc(a.u)}" data-haeuser="${a.h.join(" ")}" data-verfuegbar="${verf.join(" ")}">
      <div class="karte-bild">${f1 ? fotoHtml(f1, "", true, true) : ""}${f2 ? fotoHtml(f2, "karte-bild-2", false, false) : ""}</div>
      <div class="karte-text">
        <p class="t-marke">${esc(d.marken[a.m] ?? a.m)}</p>
        <h2 class="karte-name"><a class="karte-link" href="${esc(a.url)}">${esc(a.n)}<span class="sr-only">, ${esc(a.c)}</span></a></h2>
        <p class="preis preis-karte" data-preis>${preisHtml(a)}</p>
        <p class="karte-verfuegbar t-klein nebentext">${esc(verfText)}</p>
        ${a.demo ? `<p class="karte-demo t-klein nebentext">${esc(tr("demo.artikel"))}</p>` : ""}
      </div>
    </article>`;
    return li;
  }

  /** Raster neu aufbauen; vorhandene Karten bleiben (Schlüssel uid8). Gibt die neuen zurück. */
  function zeichnen(d: Daten, opt: { animiert?: boolean } = {}): HTMLLIElement[] {
    const r = aktiv() ? ergebnis(d) : d.uids.map((u) => d.index.get(u)!);
    const start = aktiv() ? 0 : (seite - 1) * PAGE;
    const sichtbar = r.slice(start, start + limit);
    const vorhanden = new Map<string, HTMLLIElement>();
    for (const li of raster.querySelectorAll<HTMLLIElement>(":scope > li")) {
      const u = li.querySelector<HTMLElement>("[data-uid8]")?.dataset.uid8;
      if (u) vorhanden.set(u, li);
    }
    const neu: HTMLLIElement[] = [];
    const items = sichtbar.map((a) => {
      const alt = vorhanden.get(a.u);
      if (alt) {
        alt.hidden = false;
        alt.removeAttribute("data-ausgeblendet");
        return alt;
      }
      const li = karte(a, d);
      neu.push(li);
      return li;
    });
    // ab jetzt filtert diese Island, nicht mehr der Hausschalter direkt (global.ts)
    raster.removeAttribute("data-hausfilter");
    const blenden = opt.animiert && !reduziert;
    if (blenden) for (const li of neu) li.setAttribute("data-ausgeblendet", "");
    raster.replaceChildren(...items);
    if (blenden) requestAnimationFrame(() => requestAnimationFrame(() => neu.forEach((li) => li.removeAttribute("data-ausgeblendet"))));

    anzahl.textContent = trp("liste.anzahl", aktiv() ? r.length : gesamt);
    leer.hidden = r.length > 0;
    mehrBox.hidden = start + limit >= r.length;
    if (seitenNav) seitenNav.hidden = navVeraltet || aktiv();
    zeigen.textContent = trp("liste.zeigen", r.length);
    return neu;
  }

  /** zählt Änderungen: kommen mehrere schnell nacheinander, zeichnet nur die letzte */
  let lauf = 0;
  async function anwenden(opt: { animiert?: boolean } = {}) {
    const meiner = ++lauf;
    zaehler();
    inUrl();
    if (!aktiv() && !daten) {
      anzahl.textContent = trp("liste.anzahl", gesamt);
      zeigen.textContent = trp("liste.zeigen", gesamt);
      return;
    }
    limit = PAGE;
    let d: Daten;
    try {
      d = await laden();
    } catch {
      return; /* Hinweis steht schon da; die statischen Seiten bleiben */
    }
    if (meiner !== lauf) return;
    try {
      zeichnen(d, opt);
    } catch (e) {
      // nie in einem halben Zustand stehen bleiben: Hinweis zeigen, Seite bleibt bedienbar
      fehlerText.hidden = false;
      if (import.meta.env.DEV) console.error("Filter:", e);
    }
  }

  // ── Start ──────────────────────────────────────────────────────────────
  let z = ausUrl();
  inFormular(z);
  zaehler();

  // ── Ereignisse ─────────────────────────────────────────────────────────
  form.addEventListener("change", () => {
    z = ausFormular();
    void anwenden();
  });
  sortSel.addEventListener("change", () => {
    z = ausFormular();
    void anwenden();
  });
  for (const b of resetButtons) {
    b.addEventListener("click", () => {
      z = { marke: [], groesse: [], farbe: [], preis: [], sale: false, sort: z.sort };
      inFormular(z);
      // auch das Haus, sonst bliebe eine leere Liste leer
      const beide = document.querySelector<HTMLInputElement>('[data-hausschalter] input[value="beide"]');
      if (haus() !== "beide" && beide) {
        beide.checked = true;
        beide.dispatchEvent(new Event("change", { bubbles: true }));
      } else void anwenden();
    });
  }
  window.addEventListener("lj:haus", ((e: CustomEvent<{ haus: Haus; quelle: string }>) => {
    if (e.detail.quelle === "start") return;
    if (!daten && !aktiv()) {
      // zurück auf beide Häuser ohne Filter: global.ts blendet die Karten wieder ein
      zaehler();
      inUrl();
      return;
    }
    // ausgefilterte Karten blenden aus (C6), dann das neue Raster
    const h = haus();
    const weg = [...raster.querySelectorAll<HTMLLIElement>(":scope > li")].filter((li) => h !== "beide" && !(li.dataset.haeuser ?? "").split(" ").includes(h));
    if (!reduziert && weg.length && !raster.hasAttribute("data-hausfilter")) {
      weg.forEach((li) => li.setAttribute("data-ausgeblendet", ""));
      const geplant = ++lauf;
      window.setTimeout(() => {
        if (geplant === lauf) void anwenden({ animiert: true });
      }, 280);
    } else void anwenden({ animiert: true });
  }) as EventListener);

  mehr.addEventListener("click", async () => {
    mehr.disabled = true;
    try {
      const d = await laden();
      limit += PAGE;
      const neu = zeichnen(d);
      status.textContent = trp("liste.geladen", neu.length);
      neu[0]?.querySelector<HTMLAnchorElement>(".karte-link")?.focus();
    } catch {
      /* Hinweis steht da; die Seitenlinks bleiben */
    } finally {
      mehr.disabled = false;
    }
  });

  // ── Dialog (mobil) und Zeile (ab 1024 px) ─────────────────────────────────
  function platzieren() {
    if (mq.matches) {
      if (dialog.open) dialog.close();
      inline.append(form);
      for (const d of form.querySelectorAll<HTMLDetailsElement>("[data-filter-feld]")) d.open = false;
    } else {
      dialog.querySelector(".filter-dialog-kopf")!.after(form);
    }
  }
  platzieren();
  mq.addEventListener("change", platzieren);

  oeffnen.addEventListener("click", () => {
    // Daten schon laden, damit "n Artikel zeigen" stimmt
    laden().then(
      (d) => {
        if (aktiv()) zeichnen(d);
        else zeigen.textContent = trp("liste.zeigen", gesamt);
      },
      () => undefined,
    );
    dialog.showModal();
  });
  box.querySelector("[data-filter-zu]")!.addEventListener("click", () => dialog.close());
  zeigen.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  // Zeile: nur ein Feld offen; Klick daneben oder Escape schließt
  form.addEventListener(
    "toggle",
    (e) => {
      const d = e.target as HTMLDetailsElement;
      if (!mq.matches || !d.open) return;
      for (const o of form.querySelectorAll<HTMLDetailsElement>("[data-filter-feld][open]")) if (o !== d) o.open = false;
      laden().catch(() => undefined);
    },
    true,
  );
  document.addEventListener("click", (e) => {
    if (!mq.matches || form.contains(e.target as Node)) return;
    for (const o of form.querySelectorAll<HTMLDetailsElement>("[data-filter-feld][open]")) o.open = false;
  });
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !mq.matches) return;
    const d = (e.target as HTMLElement).closest<HTMLDetailsElement>("[data-filter-feld][open]");
    if (!d) return;
    d.open = false;
    d.querySelector("summary")?.focus();
  });

  // Parameter in der URL oder ein gewähltes Haus: gleich filtern
  if (aktiv()) void anwenden();
}
