/**
 * Formulare (Briefing F): Prüfung im Browser mit Meldungen am Feld, gesammelt
 * oben in einer Liste mit Sprunglinks, Fokus dorthin. Der Server prüft immer
 * noch einmal und schickt bei Fehlern mit ?fehler= zurück (ohne persönliche
 * Daten in der URL). Damit nach so einer Rückkehr nichts neu getippt werden
 * muss, liegt ein Entwurf kurz im sessionStorage dieses Browsers.
 */
import { tr, telefone } from "./config.ts";
import { isEmail, isPhone, F } from "../../supabase/functions/_shared/contract.ts";

export type Regel = (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, form: HTMLFormElement) => string | null;

interface Fehler {
  el: HTMLElement;
  text: string;
}

function fehlerElement(el: HTMLElement): HTMLElement | null {
  const id = el.id || el.getAttribute("aria-describedby")?.split(" ").find((x) => x.endsWith("-fehler"))?.replace(/-fehler$/, "");
  return id ? document.getElementById(`${id}-fehler`) : null;
}

export function fehlerLoeschen(form: HTMLFormElement) {
  for (const el of form.querySelectorAll<HTMLElement>("[aria-invalid]")) el.removeAttribute("aria-invalid");
  for (const p of form.querySelectorAll<HTMLElement>(".feld-fehler")) {
    if (p.dataset.statisch !== undefined) continue;
    p.hidden = true;
    p.textContent = "";
  }
  const liste = form.querySelector<HTMLElement>("[data-fehlerliste]");
  if (liste) liste.hidden = true;
}

const warnIcon =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M12 3 22 20H2L12 3ZM12 9v5M12 16.5v1.5" vector-effect="non-scaling-stroke"/></svg>';

export function fehlerZeigen(form: HTMLFormElement, fehler: Fehler[], allgemein: string[] = []) {
  fehlerLoeschen(form);
  const liste = form.querySelector<HTMLElement>("[data-fehlerliste]");
  const ul = liste?.querySelector<HTMLElement>("[data-fehlerliste-liste]");
  if (ul) ul.innerHTML = "";
  for (const text of allgemein) {
    const li = document.createElement("li");
    li.textContent = text;
    ul?.append(li);
  }
  for (const f of fehler) {
    const isGroup = f.el.matches("fieldset, [role=radiogroup]");
    if (!isGroup) f.el.setAttribute("aria-invalid", "true");
    const p = fehlerElement(f.el);
    if (p) {
      p.innerHTML = warnIcon + "<span></span>";
      p.querySelector("span")!.textContent = f.text;
      p.hidden = false;
    }
    if (ul) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      const ziel = isGroup ? (f.el.querySelector<HTMLElement>("input:not([disabled])") ?? f.el) : f.el;
      if (!ziel.id) ziel.id = `f-${Math.random().toString(36).slice(2, 8)}`;
      a.href = `#${ziel.id}`;
      a.textContent = f.text;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        ziel.focus();
        ziel.scrollIntoView({ block: "center" });
      });
      li.append(a);
      ul.append(li);
    }
  }
  if (liste && (fehler.length || allgemein.length)) {
    liste.hidden = false;
    liste.focus();
    liste.scrollIntoView({ block: "start" });
  }
}

/** Standardregeln aus den Attributen: required, type=email, type=tel, Checkbox */
function standardRegel(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string | null {
  const key = el.dataset.fehler;
  const v = (el as HTMLInputElement).type === "checkbox" ? ((el as HTMLInputElement).checked ? "1" : "") : el.value.trim();
  if (el.required && !v) return key ? tr(key) : tr("form.fehlerAllgemein", { telefone: telefone() });
  if (!v) return null;
  if ((el as HTMLInputElement).type === "email" && !isEmail(v)) return tr("form.fehlerEmail");
  if ((el as HTMLInputElement).type === "tel" && !isPhone(v)) return key ? tr(key) : tr("form.fehlerTelefon");
  return null;
}

export interface FormularOptionen {
  /** zusätzliche Regeln je Feldname */
  regeln?: Record<string, Regel>;
  /** Regeln, die das ganze Formular betreffen (z. B. E-Mail ODER Telefon) */
  gesamt?: ((form: HTMLFormElement) => Fehler[])[];
  /** sessionStorage-Schlüssel für den Entwurf */
  entwurf?: string;
  /** vor dem Absenden, z. B. Positionen serialisieren; false = nicht senden */
  vorSenden?: (form: HTMLFormElement) => boolean;
}

const ENTWURF_AUSGENOMMEN = new Set(["einwilligung", F.honeypot, F.zeit, F.ok, F.back, F.lang, "positionen"]);

export function entwurfSpeichern(form: HTMLFormElement, key: string) {
  const data: Record<string, string> = {};
  for (const el of form.elements as unknown as (HTMLInputElement & { name: string })[]) {
    if (!el.name || ENTWURF_AUSGENOMMEN.has(el.name) || el.type === "hidden" || el.type === "submit") continue;
    // Kontrollkästchen mit Zustand speichern ("" = nicht angehakt), damit Laden
    // nur anfasst, was im Entwurf steht
    if (el.type === "checkbox") data[`${el.name}:${el.value}`] = el.checked ? el.value : "";
    else if (el.type === "radio") {
      if (el.checked) data[el.name] = el.value;
    } else data[el.name] = el.value;
  }
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ohne sessionStorage geht nur der Entwurf verloren */
  }
}

export function entwurfLaden(form: HTMLFormElement, key: string) {
  let data: Record<string, string> = {};
  try {
    data = JSON.parse(sessionStorage.getItem(key) ?? "{}");
  } catch {
    return;
  }
  for (const el of form.elements as unknown as (HTMLInputElement & { name: string })[]) {
    if (!el.name || ENTWURF_AUSGENOMMEN.has(el.name)) continue;
    if (el.type === "radio") {
      if (el.name in data) el.checked = data[el.name] === el.value;
    } else if (el.type === "checkbox") {
      const k = `${el.name}:${el.value}`;
      if (k in data) el.checked = data[k] === el.value;
    } else if (data[el.name] !== undefined && el.type !== "hidden") el.value = data[el.name];
  }
}

export function entwurfLoeschen(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* egal */
  }
}

export function initFormular(form: HTMLFormElement, opt: FormularOptionen = {}) {
  form.noValidate = true;
  const stempel = form.querySelector<HTMLInputElement>("[data-zeitstempel]");
  if (stempel) stempel.value = String(Date.now());
  form.querySelector("#formular-fehler")?.remove();

  const params = new URLSearchParams(location.search);
  const code = params.get("fehler");
  if (code && opt.entwurf) entwurfLaden(form, opt.entwurf);

  function pruefen(): Fehler[] {
    const fehler: Fehler[] = [];
    const gruppen = new Set<string>();
    for (const el of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")) {
      if (!el.name || el.type === "hidden" || el.disabled || el.closest("[hidden]") || el.closest(".hp")) continue;
      if (el.type === "radio") {
        if (gruppen.has(el.name)) continue;
        gruppen.add(el.name);
        const fs = el.closest("fieldset") as HTMLElement | null;
        const gewaehlt = form.querySelector<HTMLInputElement>(`input[name="${CSS.escape(el.name)}"]:checked`);
        if (el.required && !gewaehlt && fs) fehler.push({ el: fs, text: tr(fs.dataset.fehler ?? el.dataset.fehler ?? "form.fehlerAllgemein", { telefone: telefone() }) });
        continue;
      }
      const eigene = opt.regeln?.[el.name];
      const text = eigene ? eigene(el, form) : standardRegel(el);
      if (text) fehler.push({ el, text });
    }
    for (const g of opt.gesamt ?? []) fehler.push(...g(form));
    return fehler;
  }

  // Rückkehr vom Server mit Fehlern
  if (code) {
    const felder = (params.get("felder") ?? "").split(",").filter(Boolean);
    const fehler: Fehler[] = [];
    for (const name of felder) {
      const el = form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
      if (!el) continue;
      const target = (el as HTMLInputElement).type === "radio" ? (el.closest("fieldset") as HTMLElement) : el;
      const key = target.dataset.fehler ?? el.dataset.fehler;
      fehler.push({ el: target, text: key ? tr(key) : tr("form.fehlerAllgemein", { telefone: telefone() }) });
    }
    const allgemein: string[] = [];
    if (code === "zuviele") allgemein.push(tr("form.fehlerZuViele"));
    else if (code === "allgemein") allgemein.push(tr("form.fehlerAllgemein", { telefone: telefone() }));
    else if (code === "bestand") allgemein.push(tr("form.fehlerBestand"));
    else if (code === "preis") allgemein.push(tr("form.fehlerPreis"));
    else if (code === "tasche") allgemein.push(tr("form.fehlerTasche"));
    if (fehler.length || allgemein.length) queueMicrotask(() => fehlerZeigen(form, fehler, allgemein));
  }

  form.addEventListener("submit", (e) => {
    const fehler = pruefen();
    if (fehler.length) {
      e.preventDefault();
      fehlerZeigen(form, fehler);
      return;
    }
    if (opt.vorSenden && !opt.vorSenden(form)) {
      e.preventDefault();
      return;
    }
    if (opt.entwurf) entwurfSpeichern(form, opt.entwurf);
    fehlerLoeschen(form);
    // Der Button behält seinen Namen; Doppelklick verhindern
    const btn = form.querySelector<HTMLButtonElement>("button[type=submit]");
    if (btn) {
      if (btn.dataset.sendet) {
        e.preventDefault();
        return;
      }
      btn.dataset.sendet = "1";
      btn.setAttribute("aria-disabled", "true");
      setTimeout(() => {
        delete btn.dataset.sendet;
        btn.removeAttribute("aria-disabled");
      }, 8000);
    }
  });

  // Fehler am Feld verschwinden, sobald es korrigiert ist
  form.addEventListener("change", (e) => {
    const el = e.target as HTMLElement;
    if (el.getAttribute("aria-invalid") === "true") {
      el.removeAttribute("aria-invalid");
      const p = fehlerElement(el);
      if (p) p.hidden = true;
    }
  });
}
