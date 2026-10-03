/**
 * POST /forms: Kontakt (F4). Funktioniert ohne
 * JavaScript (normaler POST, 303). Empfänger aus Umgebungsvariablen.
 */
import { getCtx } from "../_shared/ctx.ts";
import { readForm, redirect303, safePath, siteHref, clientIp, field, text } from "../_shared/http.ts";
import { hashIp, rateLimit, groupToken } from "../_shared/security.ts";
import { looksLikeBot, pflicht, emailFeld, telefonFeld } from "../_shared/validate.ts";
import { isLang, type Lang } from "../_shared/i18n.ts";
import { STATIC_PATHS } from "../_shared/paths.ts";
import { F } from "../_shared/contract.ts";
import { shop } from "../_shared/generated/config/shop.ts";
import { getHouse } from "../_shared/generated/config/houses.ts";
import { anfrageHaus } from "../_shared/mail/templates.ts";
import { enqueue } from "../_shared/flows.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return text(405, "POST");
  const f = await readForm(req);
  const lang: Lang = isLang(f.get(F.lang)) ? (f.get(F.lang) as Lang) : "lb";
  const kind = "kontakt";
  const ok = safePath(f.get(F.ok), STATIC_PATHS.kontaktDanke[lang]);
  const back = safePath(f.get(F.back), STATIC_PATHS.kontakt[lang]);
  const zurueck = (code: string, extra: Record<string, string> = {}) => redirect303(siteHref(back, { fehler: code, ...extra }, "#formular-fehler"));
  if (looksLikeBot(f, Date.now())) return redirect303(siteHref(ok));
  const ctx = await getCtx();
  if (!(await rateLimit(ctx.db, `form:${await hashIp(clientIp(req))}`, shop.rateLimit.formulareProStunde, 3600))) return zurueck("zuviele");

  const err: string[] = [];
  const h = field(f, "haus", 10);
  if (!["lanners", "jager", "egal"].includes(h)) err.push("haus");
  pflicht(f, ["name", "nachricht"], err);
  const email = field(f, "email", 254);
  const tel = field(f, "telefon", 40);
  if (!email && !tel) err.push("email");
  if (email) emailFeld(f, "email", err);
  if (tel) telefonFeld(f, "telefon", err);
  const haus = h === "egal" ? null : h;
  const data: Record<string, string | string[]> = { Name: field(f, "name", 120), email, Telefon: tel, Haus: h === "lanners" || h === "jager" ? getHouse(h).name : "egal (beide Häuser)", Nachricht: field(f, "nachricht", 4000), Sprache: lang.toUpperCase() };
  const empfaenger = h === "lanners" ? [ctx.mailTo("lanners")] : h === "jager" ? [ctx.mailTo("jager")] : [ctx.mailTo("lanners"), ctx.mailTo("jager")];
  const betreff = `[Kontakt ${h === "lanners" ? "Lanners" : h === "jager" ? "Jager" : "Lanners und Jager"}] ${data.Name}`;
  if (f.get("einwilligung") !== "1") err.push("einwilligung");
  if (err.length) return zurueck("felder", { felder: [...new Set(err)].join(",") });

  const groupId = crypto.randomUUID();
  const token = await groupToken(groupId);
  await ctx.db.query(`insert into requests (group_id, kind, house_id, lang, data) values ($1::uuid, $2, $3, $4, $5::jsonb)`, [groupId, kind, haus, lang, data]);
  for (const to of empfaenger) {
    const m = anfrageHaus(kind, data, to, groupId, betreff);
    try {
      await ctx.mail.send(m);
    } catch {
      await enqueue(ctx, "mail", m, null, shop.outbox.intervallMinuten);
    }
  }
  return redirect303(siteHref(ok, { g: groupId, t: token }));
}
