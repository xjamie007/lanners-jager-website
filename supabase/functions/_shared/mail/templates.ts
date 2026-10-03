/**
 * Mails an Kunden (in ihrer Sprache) und an die Häuser (Deutsch, intern).
 * Schlicht: Text plus einfaches HTML ohne externe Bilder oder Schriften.
 */
import { t, type Lang } from "../i18n.ts";
import { getHouse } from "../generated/config/houses.ts";
import hours from "../generated/content/oeffnungszeiten.json" with { type: "json" };
import { WEEKDAYS, type HouseHours } from "../hours.ts";
import { formatPrice, formatDay } from "../format.ts";
import { escapeHtml, doppelpunkt } from "../text.ts";
import { siteHref } from "../http.ts";
import { STATIC_PATHS, housePath } from "../paths.ts";
import { adresseText, type Order } from "../orders.ts";
import type { Mail } from "./mailer.ts";
import { isDemo } from "../env.ts";

type Block = { kind: "p" | "h" | "small"; text: string } | { kind: "list"; items: string[] } | { kind: "link"; text: string; href: string };

function render(lang: Lang, title: string, blocks: Block[]): { text: string; html: string } {
  const demo = isDemo() ? [{ kind: "small", text: t(lang, "mail.demo") } as Block] : [];
  const all = [...demo, ...blocks];
  const text = [title, "", ...all.map((b) => (b.kind === "list" ? b.items.map((i) => `- ${i}`).join("\n") : b.kind === "link" ? `${b.text}${doppelpunkt(lang)}${b.href}` : b.text)), "", "Lanners & Jager, Grand-Rue, Ettelbruck"].join("\n\n");
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;color:#000000;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55">
<div style="max-width:600px;margin:0 auto;padding:28px 20px">
<p style="margin:0 0 24px;font-family:Impact,'Arial Narrow',Arial,sans-serif;font-size:26px;letter-spacing:0.01em;text-transform:uppercase">Lanners &amp; Jager</p>
<h1 style="margin:0 0 20px;font-size:20px;line-height:1.3">${escapeHtml(title)}</h1>
${all
  .map((b) => {
    switch (b.kind) {
      case "h":
        return `<h2 style="margin:28px 0 8px;font-size:16px">${escapeHtml(b.text)}</h2>`;
      case "small":
        return `<p style="margin:0 0 16px;font-size:13px;color:#5C5F66">${escapeHtml(b.text)}</p>`;
      case "list":
        return `<ul style="margin:0 0 16px;padding-left:20px">${b.items.map((i) => `<li style="margin:0 0 6px">${escapeHtml(i)}</li>`).join("")}</ul>`;
      case "link":
        return `<p style="margin:0 0 16px"><a href="${escapeHtml(b.href)}" style="color:#000000">${escapeHtml(b.text)}</a></p>`;
      default:
        return `<p style="margin:0 0 16px">${escapeHtml(b.text)}</p>`;
    }
  })
  .join("\n")}
<p style="margin:32px 0 0;font-size:13px;color:#5C5F66">Confection Lanners, 18, Grand-Rue, L-9050 Ettelbruck, +352 81 22 80<br>Jager-Oberlinkels, 32, Grand-Rue, L-9050 Ettelbruck, +352 81 22 79</p>
</div></body></html>`;
  return { text, html };
}

function hoursLines(house: "lanners" | "jager", lang: Lang): string[] {
  const h = (hours as unknown as Record<string, HouseHours>)[house];
  return WEEKDAYS.map((wd) => {
    const r = h.regulaer[wd] ?? [];
    return `${t(lang, `zeiten.tage.${wd}`)}${doppelpunkt(lang)}${r.length ? r.map(([a, b]) => `${a}–${b}`).join(t(lang, "zeiten.und")) : t(lang, "zeiten.geschlossen")}`;
  });
}

const positionen = (o: Order, lang: Lang) => o.items.map((i) => `${i.menge} × ${i.marke} ${i.name}, ${i.farbe}, ${i.groesse}, ${formatPrice(i.preis, lang)}`);

function haeuserNamen(orders: Order[], lang: Lang): string {
  const names = [...new Set(orders.map((o) => getHouse(o.house_id).name))];
  return names.join(t(lang, "seo.und"));
}

// ── An Kunden ─────────────────────────────────────────────────────────────
export function reservierungKunde(orders: Order[], lang: Lang): Mail {
  const c = orders[0].customer;
  const blocks: Block[] = [{ kind: "p", text: t(lang, "mail.anrede", { name: `${c.vorname} ${c.name}` }) }];
  for (const o of orders) {
    const h = getHouse(o.house_id);
    blocks.push({ kind: "h", text: `${h.name}, ${h.streetAddress}` });
    if (o.status === "queued" || o.status === "nachpruefen") {
      blocks.push({ kind: "p", text: t(lang, "danke.resAusstehend") });
      blocks.push({ kind: "p", text: t(lang, "danke.resHausOhneNr", { haus: h.short, hausnr: h.nr, positionen: "", von: formatDay(o.pickup_from!, lang), bis: formatDay(o.hold_until!, lang) }).replace(/\s*:\s*\./, ".") });
    } else {
      blocks.push({ kind: "p", text: t(lang, "danke.resHaus", { haus: h.short, hausnr: h.nr, positionen: "", resnr: o.st_reservation_key ?? o.number, von: formatDay(o.pickup_from!, lang), bis: formatDay(o.hold_until!, lang) }).replace(/\s*:\s*\./, ".") });
    }
    blocks.push({ kind: "list", items: positionen(o, lang) });
    blocks.push({ kind: "small", text: `${t(lang, "mail.zeiten")}${doppelpunkt(lang)}${hoursLines(o.house_id, lang).join("; ")}` });
    blocks.push({ kind: "p", text: t(lang, "mail.fragen", { telefon: h.phone }) });
  }
  blocks.push({ kind: "p", text: t(lang, "mail.imLaden") });
  blocks.push({ kind: "small", text: t(lang, "mail.datenschutz", { link: siteHref(STATIC_PATHS.datenschutz[lang]) }) });
  blocks.push({ kind: "p", text: t(lang, "mail.gruss") });
  const subject = t(lang, "mail.betreffReservierung", { haeuser: haeuserNamen(orders, lang) });
  return { to: c.email, subject, lang, kind: "reservierung_kunde", groupId: orders[0].group_id, ...render(lang, t(lang, "danke.resH1"), blocks) };
}

export function bestellungKunde(o: Order): Mail {
  const lang = o.lang;
  const h = getHouse(o.house_id);
  const c = o.customer;
  const blocks: Block[] = [{ kind: "p", text: t(lang, "mail.anrede", { name: `${c.vorname} ${c.name}` }) }];
  if (o.mode === "collect") {
    blocks.push({ kind: "p", text: t(lang, "danke.kaufAbholen", { datum: formatDay(o.pickup_from!, lang), haus: h.short, hausnr: h.nr, bestellnr: o.number }) });
    blocks.push({ kind: "small", text: `${t(lang, "mail.zeiten")}${doppelpunkt(lang)}${hoursLines(o.house_id, lang).join("; ")}` });
  } else {
    blocks.push({ kind: "p", text: t(lang, "danke.kaufLiefern", { adresse: adresseText(c.adresse) }) });
  }
  blocks.push({ kind: "h", text: t(lang, "mail.artikel") });
  blocks.push({ kind: "list", items: positionen(o, lang) });
  if (o.totals) {
    if (o.mode === "ship") blocks.push({ kind: "p", text: `${t(lang, "kasse.versand")}${doppelpunkt(lang)}${formatPrice(o.totals.versand, lang)}` });
    blocks.push({ kind: "p", text: `${t(lang, "kasse.gesamt")}${doppelpunkt(lang)}${formatPrice(o.totals.gesamt, lang)}` });
  }
  blocks.push({ kind: "p", text: t(lang, "mail.fragen", { telefon: h.phone }) });
  blocks.push({ kind: "small", text: t(lang, "mail.datenschutz", { link: siteHref(STATIC_PATHS.datenschutz[lang]) }) });
  blocks.push({ kind: "p", text: t(lang, "mail.gruss") });
  return { to: c.email, subject: t(lang, "mail.betreffBestellung", { nr: o.number, haus: h.name }), lang, kind: "bestellung_kunde", groupId: o.group_id, ...render(lang, t(lang, "danke.kaufH1"), blocks) };
}

export function nachpruefenKunde(o: Order): Mail {
  const lang = o.lang;
  const h = getHouse(o.house_id);
  const blocks: Block[] = [
    { kind: "p", text: t(lang, "mail.anrede", { name: `${o.customer.vorname} ${o.customer.name}` }) },
    { kind: "p", text: t(lang, "danke.kaufNachpruefen") },
    { kind: "list", items: positionen(o, lang) },
    { kind: "p", text: t(lang, "mail.fragen", { telefon: h.phone }) },
  ];
  return { to: o.customer.email, subject: t(lang, "mail.betreffNachpruefen", { nr: o.number }), lang, kind: "nachpruefen_kunde", groupId: o.group_id, ...render(lang, t(lang, "mail.betreffNachpruefen", { nr: o.number }), blocks) };
}

export function bereitKunde(o: Order, art: "abholung" | "versand"): Mail {
  const lang = o.lang;
  const h = getHouse(o.house_id);
  const subject = art === "abholung" ? t(lang, "mail.betreffBereitAbholung", { nr: o.number }) : t(lang, "mail.betreffBereitVersand", { nr: o.number });
  const blocks: Block[] = [
    { kind: "p", text: t(lang, "mail.anrede", { name: `${o.customer.vorname} ${o.customer.name}` }) },
    { kind: "p", text: art === "abholung" ? t(lang, "mail.bereitAbholung", { haus: h.short, hausnr: h.nr, bestellnr: o.number }) : t(lang, "mail.bereitVersand") },
    { kind: "list", items: positionen(o, lang) },
    { kind: "link", text: h.name, href: siteHref(housePath(o.house_id, lang)) },
    { kind: "p", text: t(lang, "mail.gruss") },
  ];
  return { to: o.customer.email, subject, lang, kind: `bereit_${art}`, groupId: o.group_id, ...render(lang, subject, blocks) };
}

// ── An die Häuser (intern, Deutsch) ──────────────────────────────────────
function hausKopf(o: Order): Block[] {
  const c = o.customer;
  return [
    { kind: "list", items: [
      `Kunde: ${c.vorname} ${c.name}`,
      `E-Mail: ${c.email}`,
      ...(c.mobil ? [`Mobil: ${c.mobil}`] : []),
      ...(c.telefon ? [`Telefon: ${c.telefon}`] : []),
      `Sprache: ${o.lang.toUpperCase()}`,
      `Nummer: ${o.number}`,
    ] },
  ];
}

export function reservierungHaus(o: Order, to: string): Mail {
  const lang: Lang = "de";
  const imSystem = o.st_reservation_key
    ? `In FasMan angelegt: Reservierung ${o.st_reservation_key}. Der Beleg wurde zum Drucken an die Kasse geschickt.`
    : "NOCH NICHT in FasMan angelegt (SoftTouch nicht erreichbar). Die Website versucht es alle 5 Minuten weiter. Bitte die Artikel von Hand zurücklegen.";
  const blocks: Block[] = [
    { kind: "p", text: imSystem },
    ...hausKopf(o),
    { kind: "h", text: "Abholung" },
    { kind: "p", text: `ab ${formatDay(o.pickup_from!, lang)}, zurücklegen bis ${formatDay(o.hold_until!, lang)}` },
    { kind: "h", text: "Artikel" },
    { kind: "list", items: o.items.map((i) => `${i.menge} × ${i.marke} ${i.name}, ${i.farbe}, ${i.groesse}, ${formatPrice(i.preis, lang)} (Schlüssel ${i.key})`) },
    ...(o.customer.bemerkung ? [{ kind: "h", text: "Bemerkung" } as Block, { kind: "p", text: o.customer.bemerkung } as Block] : []),
  ];
  const subject = `[Web-Reservierung] ${o.number}, ${o.customer.vorname} ${o.customer.name}`;
  return { to, subject, lang, kind: "reservierung_haus", groupId: o.group_id, ...render(lang, subject, blocks) };
}

export function bestellungHaus(o: Order, to: string, nachpruefen = false): Mail {
  const lang: Lang = "de";
  const art = o.mode === "collect" ? `Abholung im Haus ab ${formatDay(o.pickup_from!, lang)}` : `Versand an: ${adresseText(o.customer.adresse)}`;
  const status = nachpruefen
    ? "BEZAHLT, aber mindestens ein Artikel war beim Abschluss nicht mehr verfügbar. Bitte innerhalb eines Werktags mit dem Kunden Kontakt aufnehmen; ist der Artikel nicht verfügbar, den vollen Betrag beim Zahlungsanbieter erstatten (README, Abschnitt Erstattung)."
    : o.st_reservation_key
      ? `BEZAHLT. In FasMan als Reservierung ${o.st_reservation_key} angelegt (Zahlungsreferenz ${o.payment_id}). Den Verkauf schließt das Haus in FasMan ab.`
      : `BEZAHLT. NOCH NICHT in FasMan angelegt (SoftTouch nicht erreichbar); die Website versucht es weiter. Bitte die Artikel zurücklegen.`;
  const blocks: Block[] = [
    { kind: "p", text: status },
    ...hausKopf(o),
    { kind: "p", text: art },
    ...(o.customer.rechnung ? [{ kind: "p", text: `Rechnungsadresse: ${adresseText(o.customer.rechnung)}` } as Block] : []),
    { kind: "h", text: "Artikel" },
    { kind: "list", items: o.items.map((i) => `${i.menge} × ${i.marke} ${i.name}, ${i.farbe}, ${i.groesse}, ${formatPrice(i.preis, lang)} (Schlüssel ${i.key})`) },
    ...(o.totals ? [{ kind: "p", text: `Gesamt: ${formatPrice(o.totals.gesamt, lang)} (davon Versand ${formatPrice(o.totals.versand, lang)})` } as Block] : []),
  ];
  const subject = `[Web-Bestellung${nachpruefen ? ", NACHPRÜFEN" : ""}] ${o.number}, ${o.customer.vorname} ${o.customer.name}`;
  return { to, subject, lang, kind: nachpruefen ? "nachpruefen_haus" : "bestellung_haus", groupId: o.group_id, ...render(lang, subject, blocks) };
}

export function anfrageHaus(kind: "kontakt", data: Record<string, string | string[]>, to: string, groupId: string, subject: string): Mail {
  const lang: Lang = "de";
  const items = Object.entries(data)
    .filter(([, v]) => (Array.isArray(v) ? v.length : v))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
  return { to, subject, lang, kind: `anfrage_${kind}`, groupId, replyTo: typeof data.email === "string" && data.email ? data.email : undefined, ...render(lang, subject, [{ kind: "list", items }]) };
}

export function alarm(to: string, subject: string, lines: string[]): Mail {
  return { to, subject: `[Alarm Website] ${subject}`, lang: "de", kind: "alarm", ...render("de", subject, [{ kind: "list", items: lines }]) };
}
