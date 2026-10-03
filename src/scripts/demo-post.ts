/**
 * Demo-Postausgang (D10.8): Der Browser merkt sich die Reservierungen,
 * Bestellungen und Anfragen, die er selbst abgeschickt hat (Gruppen-ID und
 * Prüf-Token), und zeigt nur deren Mails. So sieht niemand die Eingaben anderer
 * Besucher der Demo.
 */
import { config } from "./config.ts";
import type { GroupRef } from "../../supabase/functions/_shared/contract.ts";

const KEY = "lj-demo-post";

export function gruppen(): GroupRef[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? (list as GroupRef[]).filter((x) => x && typeof x.g === "string" && typeof x.t === "string") : [];
  } catch {
    return [];
  }
}

export function gruppeMerken(art: GroupRef["art"], g?: string, t?: string) {
  if (!config().demo) return;
  const p = new URLSearchParams(location.search);
  const gid = g ?? p.get("g");
  const tok = t ?? p.get("t");
  if (!gid || !tok) return;
  const list = gruppen().filter((x) => x.g !== gid);
  list.unshift({ g: gid, t: tok, art, zeit: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* ohne localStorage zeigt der Postausgang nichts */
  }
}
