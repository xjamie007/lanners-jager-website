/**
 * Danke-Seiten: Status holen (order-status), Text nach E6 bauen, Tasche
 * aufräumen, beim Kauf bis zu 30 Sekunden auf die Bestätigung der Zahlung warten.
 */
import { config, tr, trp, price, house, tagText } from "./config.ts";
import { heuteMarkieren } from "./zeiten.ts";
import { doppelpunkt } from "../../supabase/functions/_shared/text.ts";
import { lesen, entfernen } from "./tasche.ts";
import { entwurfLoeschen } from "./formular.ts";
import { gruppeMerken } from "./demo-post.ts";
import type { OrderStatusResponse, OrderView } from "../../supabase/functions/_shared/contract.ts";

const box = document.querySelector<HTMLElement>("[data-danke]");
const cfg = config();
const p = new URLSearchParams(location.search);
const g = p.get("g");
const tok = p.get("t");
const art = box?.dataset.art === "kauf" ? "kauf" : "reservierung";

const tag = (iso: string | null) => (iso ? tagText(iso) : "");

function positionen(o: OrderView): string {
  return o.items.map((i) => `${i.menge} × ${i.marke} ${i.name}, ${i.farbe}, ${i.groesse}`).join("; ");
}

function zeiten(h: string): DocumentFragment | null {
  const tpl = document.querySelector<HTMLTemplateElement>(`template[data-danke-zeiten="${h}"]`);
  if (!tpl) return null;
  const frag = tpl.content.cloneNode(true) as DocumentFragment;
  heuteMarkieren(frag);
  return frag;
}

function nichtGefunden() {
  const tpl = document.querySelector<HTMLTemplateElement>("template[data-nicht-gefunden]")!;
  box!.replaceChildren(tpl.content.cloneNode(true));
}

function absatz(text: string, cls = ""): HTMLParagraphElement {
  const el = document.createElement("p");
  if (cls) el.className = cls;
  el.textContent = text;
  return el;
}

function renderReservierung(orders: OrderView[]) {
  box!.replaceChildren();
  for (const o of orders) {
    const hs = house(o.house);
    const sec = document.createElement("section");
    sec.className = "danke-haus";
    if (o.status === "queued" || o.status === "nachpruefen") {
      sec.append(absatz(tr("danke.resAusstehend")));
      sec.append(absatz(tr("danke.resHausOhneNr", { haus: hs.short, hausnr: hs.nr, positionen: positionen(o), von: tag(o.pickupFrom), bis: tag(o.holdUntil) })));
    } else {
      sec.append(
        absatz(tr("danke.resHaus", { haus: hs.short, hausnr: hs.nr, positionen: positionen(o), resnr: o.reservationNo ?? o.number, von: tag(o.pickupFrom), bis: tag(o.holdUntil) })),
      );
    }
    const z = zeiten(o.house);
    if (z) sec.append(z);
    sec.append(absatz(`${hs.short}${doppelpunkt(cfg.lang)}${hs.phoneDisplay}`, "t-klein"));
    box!.append(sec);
  }
  box!.append(absatz(tr("danke.resMail", { email: orders[0].email })));
  aufraeumen(orders);
  entwurfLoeschen("lj-entwurf-reservieren");
  gruppeMerken("reservierung");
}

function renderKauf(orders: OrderView[], spaet: boolean) {
  const o = orders[0];
  const h1 = document.querySelector("h1");
  box!.replaceChildren();
  const hs = house(o.house);
  if (o.status === "pending") {
    box!.append(absatz(spaet ? tr("danke.kaufWartetLange") : tr("danke.kaufWartet")));
    return;
  }
  if (o.status === "failed" || o.status === "canceled" || o.status === "expired") {
    if (h1) h1.textContent = tr("danke.kaufFehlgeschlagen");
    const a = document.createElement("a");
    a.href = cfg.routes.tasche;
    a.className = "btn btn-primaer";
    a.textContent = tr("danke.zurTasche");
    box!.append(a);
    return;
  }
  // Bezahlt (auch "nachpruefen": Geld ist da, ein Artikel wird geprüft)
  if (h1) h1.textContent = tr("danke.kaufH1");
  if (o.status === "nachpruefen") {
    box!.append(absatz(tr("danke.kaufNachpruefen")));
  } else {
    const sec = document.createElement("section");
    sec.className = "danke-haus";
    if (o.mode === "collect") {
      sec.append(absatz(tr("danke.kaufAbholen", { datum: tag(o.pickupFrom), haus: hs.short, hausnr: hs.nr, bestellnr: o.number })));
      const z = zeiten(o.house);
      if (z) sec.append(z);
    } else {
      const p = absatz(tr("danke.kaufLiefern", { adresse: o.address ?? "" }) + " ");
      const offen = document.querySelector<HTMLTemplateElement>("template[data-versand-offen]");
      if (offen) p.append(offen.content.cloneNode(true));
      sec.append(p);
    }
    sec.append(absatz(positionen(o), "t-klein"));
    if (o.totals) sec.append(absatz(`${tr("kasse.gesamt")}${doppelpunkt(cfg.lang)}${price(o.totals.gesamt)}`, "t-klein"));
    box!.append(sec);
    box!.append(absatz(tr("danke.resMail", { email: o.email })));
  }
  aufraeumen(orders);
  entwurfLoeschen("lj-entwurf-kasse");
  gruppeMerken("bestellung");
  // Artikel aus dem anderen Haus noch in der Tasche? Dann gleich dort bezahlen.
  const rest = lesen().filter((x) => x.snap.haus !== o.house);
  if (rest.length) {
    const anderes = rest[0].snap.haus;
    const a = document.createElement("a");
    a.className = "btn btn-primaer";
    a.href = `${cfg.routes.kasse}?haus=${anderes}&modus=${o.mode}`;
    const n = rest.reduce((s, x) => s + x.menge, 0);
    a.textContent = trp("tasche.bezahlenBei", n, { haus: house(anderes).short, summe: price(rest.reduce((s, x) => s + x.snap.preis * x.menge, 0)) });
    box!.append(a);
  }
}

function aufraeumen(orders: OrderView[]) {
  const keys = orders.flatMap((o) => o.items.map((i) => i.key));
  const imBeutel = lesen().map((x) => x.key);
  const weg = keys.filter((k) => imBeutel.includes(k));
  if (weg.length) entfernen(weg);
  try {
    sessionStorage.removeItem("lj-direkt");
  } catch {
    /* egal */
  }
}

async function holen(): Promise<OrderStatusResponse | null> {
  try {
    const res = await fetch(`${cfg.functionsUrl}/order-status?g=${encodeURIComponent(g!)}&t=${encodeURIComponent(tok!)}`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as OrderStatusResponse;
  } catch {
    return null;
  }
}

async function start() {
  if (!box) return;
  if (!g || !tok || !cfg.functionsUrl) return nichtGefunden();
  const beginn = Date.now();
  for (;;) {
    const data = await holen();
    if (!data || data.orders.length === 0) return nichtGefunden();
    if (art === "reservierung") return renderReservierung(data.orders);
    const pending = data.orders[0].status === "pending";
    const spaet = Date.now() - beginn > 30000;
    renderKauf(data.orders, spaet);
    if (!pending || spaet) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
}
void start();
