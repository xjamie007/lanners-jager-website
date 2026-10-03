/**
 * Auf jeder Seite: Hausschalter, Taschenzahl, Menü- und Suchdialog,
 * "heute" in den Öffnungszeiten, View-Transition-Namen für Produktfotos.
 * Bewusst ohne Bibliothek (Ziel: wenig JavaScript, Briefing H).
 */
import { config, tr, trp, escapeHtml } from "./config.ts";
import { lesen, anzahl } from "./tasche.ts";
import { heuteMarkieren } from "./zeiten.ts";
import { statusAnzeigen } from "./offen-status.ts";

const root = document.documentElement;

// ── Hausschalter (C3) ──────────────────────────────────────────────────────
type Haus = "beide" | "lanners" | "jager";
function aktuellesHaus(): Haus {
  const h = root.dataset.haus;
  return h === "lanners" || h === "jager" ? h : "beide";
}
function hausSetzen(h: Haus, quelle: "nutzer" | "start") {
  if (h === "beide") delete root.dataset.haus;
  else root.dataset.haus = h;
  try {
    localStorage.setItem("lj-haus", h);
  } catch {
    /* privat/blockiert: Wahl gilt nur für diese Seite */
  }
  for (const input of document.querySelectorAll<HTMLInputElement>("[data-hausschalter] input")) input.checked = input.value === h;
  // Listenseiten halten die Wahl zusätzlich in ?haus=
  if (quelle === "nutzer" && document.querySelector("[data-liste]")) {
    const url = new URL(location.href);
    if (h === "beide") url.searchParams.delete("haus");
    else url.searchParams.set("haus", h);
    try {
      if (url.href !== location.href) history.replaceState(history.state, "", url.href);
    } catch {
      /* Safari drosselt replaceState: die Wahl gilt trotzdem */
    }
  }
  window.dispatchEvent(new CustomEvent("lj:haus", { detail: { haus: h, quelle } }));
}
// Start und Hausseiten stehen selbst für ein Haus: Dort ist der Schalter eine
// Navigation (Links, HouseSwitcher.astro), und die Seite merkt sich ihr Haus.
const seitenHaus = root.dataset.seitenHaus as Haus | undefined;
hausSetzen(seitenHaus ?? aktuellesHaus(), "start");
document.addEventListener("change", (e) => {
  const t = e.target as HTMLInputElement;
  if (t.matches("[data-hausschalter] input")) hausSetzen(t.value as Haus, "nutzer");
});
// Zurück aus dem Cache (bfcache): Schalter wieder auf das Haus dieser Seite
window.addEventListener("pageshow", (e) => {
  if (e.persisted && seitenHaus) hausSetzen(seitenHaus, "start");
});

// Ausgefilterte Einträge blenden aus (C6), statt hart zu verschwinden
function hausFiltern(h: Haus, animiert: boolean) {
  const dauer = animiert && !matchMedia("(prefers-reduced-motion: reduce)").matches ? 280 : 0;
  for (const box of document.querySelectorAll<HTMLElement>("[data-hausfilter]")) {
    for (const el of box.querySelectorAll<HTMLElement>(":scope [data-haeuser]")) {
      if (el.closest("[data-hausfilter]") !== box) continue;
      if (el.matches("[data-karte]") && el.parentElement?.matches("[data-haeuser]")) continue;
      const passt = h === "beide" || (el.dataset.haeuser ?? "").split(" ").includes(h);
      if (passt) {
        el.hidden = false;
        requestAnimationFrame(() => el.removeAttribute("data-ausgeblendet"));
      } else if (!el.hidden) {
        el.setAttribute("data-ausgeblendet", "");
        window.setTimeout(() => {
          if (el.hasAttribute("data-ausgeblendet")) el.hidden = true;
        }, dauer);
      }
    }
    box.dispatchEvent(new CustomEvent("lj:gefiltert", { bubbles: true }));
  }
}
hausFiltern(aktuellesHaus(), false);
window.addEventListener("lj:haus", (e) => {
  const d = (e as CustomEvent<{ haus: Haus; quelle: string }>).detail;
  if (d.quelle === "nutzer") hausFiltern(d.haus, true);
});

// ── Taschenzahl ───────────────────────────────────────────────────────────
function tascheAnzeigen(animiert: boolean) {
  const n = anzahl(lesen());
  for (const el of document.querySelectorAll<HTMLElement>("[data-tasche-zahl]")) {
    el.hidden = n === 0;
    el.textContent = String(n);
    if (animiert) {
      el.removeAttribute("data-neu");
      void el.offsetWidth;
      el.setAttribute("data-neu", "");
    }
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-tasche-label]")) {
    el.textContent = n === 0 ? tr("nav.tascheLeer") : trp("nav.tascheAnzahl", n);
  }
}
tascheAnzeigen(false);
window.addEventListener("lj:tasche", () => tascheAnzeigen(true));
window.addEventListener("storage", (e) => {
  if (e.key === "lj-tasche") tascheAnzeigen(false);
});

// ── Menü-Dialog ───────────────────────────────────────────────────────────
const menu = document.getElementById("menu-dialog") as HTMLDialogElement | null;
const menuBtn = document.querySelector<HTMLAnchorElement>("[data-menu-oeffnen]");
if (menu && menuBtn) {
  menuBtn.setAttribute("role", "button");
  menuBtn.setAttribute("aria-haspopup", "dialog");
  menuBtn.setAttribute("aria-controls", "menu-dialog");
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.addEventListener("click", (e) => {
    e.preventDefault();
    menu.showModal();
    menuBtn.setAttribute("aria-expanded", "true");
  });
  menuBtn.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      e.preventDefault();
      menuBtn.click();
    }
  });
  menu.querySelector("[data-menu-schliessen]")?.addEventListener("click", () => menu.close());
  menu.addEventListener("close", () => {
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.focus();
  });
  // Ab 1100 px gibt es kein Menü mehr (volle Navigationsleiste)
  matchMedia("(min-width: 1100px)").addEventListener("change", (m) => {
    if (m.matches && menu.open) menu.close();
  });
}

// ── Suche (Pagefind, erst beim Öffnen geladen) ────────────────────────────
type PagefindSub = { title: string; url: string; excerpt: string };
type PagefindResult = { url: string; meta: Record<string, string>; excerpt: string; sub_results?: PagefindSub[] };
type Pagefind = { search: (q: string) => Promise<{ results: { data: () => Promise<PagefindResult> }[] }>; options: (o: object) => Promise<void> };
let pagefindPromise: Promise<Pagefind> | null = null;
export function loadPagefind(): Promise<Pagefind> {
  if (!pagefindPromise) {
    const url = config().base + "pagefind/pagefind.js";
    pagefindPromise = import(/* @vite-ignore */ url).then(
      async (pf: Pagefind) => {
        await pf.options({ baseUrl: config().base });
        return pf;
      },
      (e: unknown) => {
        pagefindPromise = null; // beim nächsten Versuch neu laden
        throw e;
      },
    );
  }
  return pagefindPromise;
}

let suchLauf = 0;
export async function sucheRendern(q: string, ziel: HTMLElement) {
  const query = q.trim();
  // Jede Eingabe zählt hoch: Ältere, langsamere Antworten überschreiben nichts
  const lauf = ++suchLauf;
  if (query.length < 2) {
    ziel.innerHTML = "";
    return;
  }
  // Im Dev-Server baut sich der Index beim ersten Aufruf; dann kurz Bescheid geben
  const warten = window.setTimeout(() => {
    if (lauf === suchLauf) ziel.innerHTML = `<p class="nebentext">${escapeHtml(tr("suche.laedt"))}</p>`;
  }, 400);
  try {
    const pf = await loadPagefind();
    const res = await pf.search(query);
    const items = await Promise.all(res.results.slice(0, 24).map((r) => r.data()));
    if (lauf !== suchLauf) return;
    if (items.length === 0) {
      ziel.innerHTML = `<p>${escapeHtml(tr("suche.leer", { q: query }))}</p>`;
      return;
    }
    // Artikel und Infoseiten getrennt; die Gruppe mit dem besten Treffer steht oben
    const seiten = items.filter((d) => d.meta.typ === "seite");
    const artikel = items.filter((d) => d.meta.typ !== "seite");
    const gruppen = [
      { titel: tr("suche.gruppeArtikel"), html: artikel.map(artikelTreffer).join(""), n: artikel.length, erster: items.indexOf(artikel[0]!) },
      { titel: tr("suche.gruppeSeiten"), html: seiten.map(seitenTreffer).join(""), n: seiten.length, erster: items.indexOf(seiten[0]!) },
    ]
      .filter((g) => g.n > 0)
      .sort((a, b) => a.erster - b.erster);
    ziel.innerHTML =
      `<p class="t-klein nebentext">${escapeHtml(trp("suche.treffer", items.length))}</p>` +
      gruppen
        .map((g) => `${gruppen.length > 1 ? `<h3 class="suche-gruppe">${escapeHtml(g.titel)}</h3>` : ""}<ul class="suche-liste">${g.html}</ul>`)
        .join("");
  } catch {
    if (lauf === suchLauf) ziel.innerHTML = `<p>${escapeHtml(tr("suche.fehler"))}</p>`;
  } finally {
    window.clearTimeout(warten);
  }
}

function artikelTreffer(d: PagefindResult): string {
  return `<li><a href="${escapeHtml(d.url)}" class="suche-treffer">${
    d.meta.image ? `<span class="suche-bild"><img src="${escapeHtml(d.meta.image)}" alt="" width="60" height="80" loading="lazy"></span>` : ""
  }<span class="suche-text"><span class="t-marke">${escapeHtml(d.meta.marke ?? "")}</span><span class="suche-titel">${escapeHtml(d.meta.title ?? "")}</span>${
    d.meta.farbe ? `<span class="t-klein nebentext">${escapeHtml(d.meta.farbe)}</span>` : ""
  }${d.meta.preis ? `<span class="t-preis">${escapeHtml(d.meta.preis)}</span>` : ""}</span></a></li>`;
}

/** Pagefind liefert Auszüge mit <mark>; alles andere bleibt Text */
const auszug = (s: string) => escapeHtml(s).replace(/&lt;(\/?)mark&gt;/g, "<$1mark>");

function seitenTreffer(d: PagefindResult): string {
  // Unterabschnitte (Überschriften mit id), z. B. "Reservéieren" auf "Wéi et geet"
  const subs = (d.sub_results ?? []).filter((s) => s.url !== d.url && s.title && s.title !== d.meta.title).slice(0, 3);
  return `<li class="suche-seite"><a href="${escapeHtml(d.url)}" class="suche-treffer"><span class="suche-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg></span><span class="suche-text"><span class="suche-titel">${escapeHtml(
    d.meta.title ?? "",
  )}</span><span class="suche-auszug">${auszug(d.excerpt)}</span></span></a>${
    subs.length
      ? `<ul class="suche-unter">${subs.map((s) => `<li><a href="${escapeHtml(s.url)}">${escapeHtml(s.title)}</a></li>`).join("")}</ul>`
      : ""
  }</li>`;
}

const suche = document.getElementById("suche-dialog") as HTMLDialogElement | null;
if (suche) {
  const input = suche.querySelector<HTMLInputElement>("input[name=q]")!;
  const ziel = suche.querySelector<HTMLElement>("[data-suche-ergebnisse]")!;
  let opener: HTMLElement | null = null;
  let timer = 0;
  document.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLElement>("[data-suche-oeffnen]");
    if (!a) return;
    e.preventDefault();
    opener = a;
    if (menu?.open) menu.close();
    suche.showModal();
    input.focus();
    void loadPagefind().catch(() => undefined);
  });
  suche.querySelector("[data-suche-schliessen]")?.addEventListener("click", () => suche.close());
  // Treffer auf derselben Seite (Sprungmarke): Dialog zu, damit man den Abschnitt sieht
  ziel.addEventListener("click", (e) => {
    if ((e.target as Element).closest("a[href]")) suche.close();
  });
  suche.addEventListener("close", () => opener?.focus());
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => void sucheRendern(input.value, ziel), 200);
  });
}

// ── "heute" in den Öffnungszeiten und Live-Status (Zeitzone Luxemburg) ────
heuteMarkieren();
statusAnzeigen();
window.setInterval(() => statusAnzeigen(), 60_000);

// ── Untermenüs der Navigation (Disclosure: Knopf neben dem Link) ──────────
const gruppen = [...document.querySelectorAll<HTMLElement>("[data-nav-gruppe]")];
function gruppeSchliessen(g: HTMLElement, fokus = false) {
  if (!g.hasAttribute("data-offen")) return;
  g.removeAttribute("data-offen");
  const btn = g.querySelector<HTMLButtonElement>(".nav-auf");
  btn?.setAttribute("aria-expanded", "false");
  if (fokus) btn?.focus();
}
for (const g of gruppen) {
  const btn = g.querySelector<HTMLButtonElement>(".nav-auf");
  btn?.addEventListener("click", () => {
    const auf = !g.hasAttribute("data-offen");
    for (const x of gruppen) if (x !== g) gruppeSchliessen(x);
    g.toggleAttribute("data-offen", auf);
    g.removeAttribute("data-zu");
    btn.setAttribute("aria-expanded", String(auf));
  });
  g.addEventListener("focusout", (e) => {
    if (!g.contains(e.relatedTarget as Node | null)) gruppeSchliessen(g);
  });
  // Nach Escape bleibt das Panel zu, bis die Maus die Gruppe verlässt
  g.addEventListener("mouseleave", () => g.removeAttribute("data-zu"));
}

// ── Markenband: Pause-Knopf (WCAG 2.2.2) ─────────────────────────────────
document.addEventListener("click", (e) => {
  const knopf = (e.target as Element).closest<HTMLButtonElement>("[data-band-pause]");
  const band = knopf?.closest<HTMLElement>("[data-markenband]");
  if (!knopf || !band) return;
  const pause = !band.hasAttribute("data-pausiert");
  band.toggleAttribute("data-pausiert", pause);
  knopf.setAttribute("aria-pressed", String(pause));
});

// ── Sprachauswahl im Kopf (<details>) ─────────────────────────────────────
const sprachwahlen = [...document.querySelectorAll<HTMLDetailsElement>("[data-sprachwahl]")];
document.addEventListener("click", (e) => {
  const ziel = e.target as Node;
  for (const d of sprachwahlen) if (d.open && !d.contains(ziel)) d.open = false;
  for (const g of gruppen) if (!g.contains(ziel)) gruppeSchliessen(g);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  for (const d of sprachwahlen) {
    if (d.open) {
      d.open = false;
      d.querySelector("summary")?.focus();
    }
  }
  for (const g of gruppen) {
    if (g.matches(":hover")) g.setAttribute("data-zu", "");
    gruppeSchliessen(g, g.contains(document.activeElement));
  }
});

// ── View Transitions: gemeinsame Elemente morphen beim Seitenwechsel (C6) ───
// Hier die Abfahrt (pageswap); die Ankunft steht in vt-ankunft.js.
// Hin: Der Klick auf eine Karte merkt sich ihr Element (data-vt-quelle, bei
// Produktkarten data-vt-foto); auf der neuen Seite übernimmt das passende Ziel
// (data-vt-ziel, bei Produkten data-vt-hauptfoto) den Namen: Kartenfoto →
// Produktfoto, Hauskarte → Hausfoto, Kachel → Listentitel.
// Zurück/Vor im Verlauf (kein Klick): Das sichtbare Ziel morpht in die Karte,
// die auf diese Seite verlinkt, falls sie auf der neuen Seite zu sehen ist.
// data-vt-statisch: gleiche Bausteine (Fotokopf, Seitentitel) morphen ineinander.
// Namen gibt es nur für sichtbare Elemente und jeden Namen nur einmal.
type VtSpur = { art: "hin" | "zurueck"; key: string; namen: string[] };
const VT_SPUR = "lj-vt";
const vtBenannt: HTMLElement[] = [];
const sichtbar = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
};
const pfadVon = (href: string) => {
  try {
    return new URL(href, location.href).pathname;
  } catch {
    return "";
  }
};
const quelleName = (el: HTMLElement) => el.dataset.vtQuelle ?? (el.hasAttribute("data-vt-foto") ? "produktfoto" : "");
const zielName = (el: HTMLElement) => el.dataset.vtZiel ?? (el.hasAttribute("data-vt-hauptfoto") ? "produktfoto" : "");
function vtBenennen(el: HTMLElement, name: string, vergeben: Set<string>) {
  if (!name || vergeben.has(name) || el.style.viewTransitionName) return;
  vergeben.add(name);
  el.style.viewTransitionName = name;
  vtBenannt.push(el);
}
function statischeBenennen(vergeben: Set<string>) {
  for (const el of document.querySelectorAll<HTMLElement>("[data-vt-statisch]")) if (sichtbar(el)) vtBenennen(el, el.dataset.vtStatisch!, vergeben);
}
const karteVon = (el: Element) => el.closest<HTMLElement>("[data-karte], [data-vt-karte]");

let vtKlick: { el: HTMLElement; name: string; key: string } | null = null;
let vtLinkZeit = 0;
document.addEventListener(
  "click",
  (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (a) vtLinkZeit = Date.now();
    const karte = a && karteVon(a);
    const el = karte?.querySelector<HTMLElement>("[data-vt-quelle], [data-vt-foto]");
    vtKlick = a && el ? { el, name: quelleName(el), key: pfadVon(a.href) } : null;
  },
  { capture: true },
);
window.addEventListener("pageswap", ((e: Event & { viewTransition?: unknown }) => {
  if (!e.viewTransition) return;
  const vergeben = new Set<string>();
  let spur: VtSpur | null = null;
  const frisch = Date.now() - vtLinkZeit < 3000; // Navigation kam vom letzten Klick
  if (vtKlick && frisch && sichtbar(vtKlick.el)) {
    vtBenennen(vtKlick.el, vtKlick.name, vergeben);
    spur = { art: "hin", key: vtKlick.key, namen: [vtKlick.name] };
  } else if (!frisch) {
    const namen: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("[data-vt-ziel], [data-vt-hauptfoto]")) {
      const n = zielName(el);
      if (sichtbar(el) && !vergeben.has(n)) {
        vtBenennen(el, n, vergeben);
        namen.push(n);
      }
    }
    if (namen.length) spur = { art: "zurueck", key: location.pathname, namen };
  }
  statischeBenennen(vergeben);
  try {
    if (spur) sessionStorage.setItem(VT_SPUR, JSON.stringify(spur));
    else sessionStorage.removeItem(VT_SPUR);
  } catch {
    /* ohne sessionStorage: nur die statischen Morphs */
  }
}) as EventListener);
// Ankunft auf der neuen Seite (pagereveal): src/scripts/vt-ankunft.js, inline im <head>
function vtAufraeumen() {
  for (const el of vtBenannt.splice(0)) el.style.viewTransitionName = "";
}
// Beim Zurückgehen aus dem Cache darf kein Name hängen bleiben
window.addEventListener("pageshow", (e) => {
  if (e.persisted) vtAufraeumen();
});

// ── Hausschalter-Leiste: beim Herunterscrollen weg, beim Hochscrollen wieder da ─
// Auf Wunsch des Kunden. Ein passiver Scroll-Listener, der nur zwei Zahlen vergleicht
// und das Attribut allein beim Richtungswechsel umschaltet; die Bewegung macht CSS.
(function leisteBeimScrollen() {
  const leiste = document.querySelector<HTMLElement>("[data-hausleiste]");
  if (!leiste) return;
  const ABSTAND = 8; // px Scrollweg, bevor die Richtung zählt (kein Flattern)
  const OBEN = 200; // darüber (Demo-Leiste, Infoleiste, Kopf) ist sie immer da
  let letzte = Math.max(0, window.scrollY);
  const setzen = (weg: boolean) => {
    if (root.hasAttribute("data-leiste-weg") !== weg) root.toggleAttribute("data-leiste-weg", weg);
  };
  window.addEventListener(
    "scroll",
    () => {
      const y = Math.max(0, window.scrollY);
      const d = y - letzte;
      if (y <= OBEN) {
        setzen(false);
        letzte = y;
      } else if (Math.abs(d) >= ABSTAND) {
        // Fokus in der Leiste (Tastatur): nicht wegschieben
        setzen(d > 0 && !leiste.contains(document.activeElement));
        letzte = y;
      }
    },
    { passive: true },
  );
  leiste.addEventListener("focusin", () => setzen(false));
  // Tastatur: Tab holt die Leiste zurück, damit der Hausschalter erreichbar bleibt
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") setzen(false);
  });
})();

// ── Einblenden beim Scrollen (Kundenwunsch) ─────────────────────────────────
// Nur Elemente, die beim Laden unterhalb des Bildschirms liegen, warten unsichtbar
// (data-einblenden="warten") und gleiten herein, sobald sie sichtbar werden.
// Was schon zu sehen ist, bleibt unberührt (kein Flackern, kein späteres LCP).
// Gleichzeitig hereinkommende Elemente folgen kurz versetzt aufeinander.
// Gemessen wird erst nach dem Laden (fertiges Layout); betroffen sind ohnehin nur
// Elemente außerhalb des Bildschirms, es kann also nichts Sichtbares verschwinden.
function einblenden() {
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ZIELE = [
    // Abschnittsköpfe und Text
    "main .abschnitt-kopf",
    "main .kopfzeile",
    "main .seite > :is(h2, h3, p, ul:not(.schritte), dl, .prosa)",
    "main .howto-text > *",
    "main .geschichte-inhalt > *",
    "main .ueber-text > *",
    "main .info-block",
    "main .anfahrt-info",
    "main .liste-kopf",
    // Karten, Kacheln, Reihen
    "main .shops-raster > *",
    "main .anderes-haus > *",
    "main .kacheln > li",
    "main .reihe-liste > li",
    "main .raster > li",
    "main .info-kacheln > li",
    "main .schritte > li",
    "main .faq-eintrag",
    "main .zeitstrahl > li",
    "main .g-haus",
    "main .marken-raster > li",
    "main .haus-abschnitt",
  ].join(",");
  const BILDER = "main :is(.howto-bild, .ueber-bilder, .anfahrt-raster > :first-child)";
  const unten = window.innerHeight;
  const warten = new Set<HTMLElement>();
  const markieren = (el: HTMLElement, art?: "bild") => {
    // nur einmal, nur unterhalb des Bildschirms, nicht in ausgeblendeten Bereichen
    if (el.dataset.einblenden || el.closest("[data-einblenden]") || el.closest("[hidden], dialog")) return;
    // seitlich außerhalb (Karussell, Reihen zum Wischen): bleibt sichtbar
    const r = el.getBoundingClientRect();
    if (r.top < unten || r.left >= window.innerWidth || r.right <= 0) return;
    el.dataset.einblenden = "warten";
    if (art) el.dataset.einblendenArt = art;
    warten.add(el);
  };
  for (const el of document.querySelectorAll<HTMLElement>(BILDER)) markieren(el, "bild");
  for (const el of document.querySelectorAll<HTMLElement>(ZIELE)) markieren(el);
  if (!warten.size) return;

  const los = (el: HTMLElement, verz: number) => {
    el.style.setProperty("--einblenden-verz", `${verz}ms`);
    el.dataset.einblenden = "los";
    // danach aufräumen, damit Hover- und Filter-Übergänge wieder allein gelten
    window.setTimeout(() => {
      delete el.dataset.einblenden;
      delete el.dataset.einblendenArt;
      el.style.removeProperty("--einblenden-verz");
    }, 1500 + verz);
  };
  const io = new IntersectionObserver(
    (eintraege) => {
      const rein = eintraege
        .filter((e) => e.isIntersecting)
        .map((e) => e.target as HTMLElement)
        .sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return ra.top - rb.top || ra.left - rb.left;
        });
      rein.forEach((el, i) => {
        io.unobserve(el);
        warten.delete(el);
        los(el, Math.min(i, 6) * 80);
      });
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
  );
  for (const el of warten) io.observe(el);
  // Drucken: alles sofort zeigen
  const alleZeigen = () => {
    for (const el of warten) {
      io.unobserve(el);
      delete el.dataset.einblenden;
      delete el.dataset.einblendenArt;
    }
    warten.clear();
  };
  window.addEventListener("beforeprint", alleZeigen);
}
if (document.readyState === "complete") requestAnimationFrame(einblenden);
else window.addEventListener("load", () => requestAnimationFrame(einblenden), { once: true });
