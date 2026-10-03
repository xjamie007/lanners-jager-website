/**
 * Outbox (D10.5.7): Aufrufe an SoftTouch und Mails, die wiederholt werden
 * müssen. Alle 5 Minuten, bis zu 24 Stunden. Nach 3 gescheiterten Versuchen
 * eine Warnmail an ALERT_RECIPIENT; nach 24 Stunden aufgegeben (mit Warnung).
 */
import type { Ctx } from "./ctx.ts";
import { shop } from "./generated/config/shop.ts";
import { pushToSoftTouch, isRetryable, alertMail } from "./flows.ts";
import { orderById, setStatus } from "./orders.ts";
import { reservierungKunde, reservierungHaus, bestellungHaus } from "./mail/templates.ts";
import type { Mail } from "./mail/mailer.ts";

interface Job {
  id: number;
  kind: string;
  payload: Record<string, unknown>;
  order_id: string | null;
  attempts: number;
  alerted: boolean;
  created_at: string;
}

async function run(ctx: Ctx, job: Job) {
  switch (job.kind) {
    case "st_reservation": {
      const key = await pushToSoftTouch(ctx, job.order_id!);
      const o = (await orderById(ctx.db, job.order_id!))!;
      if (o.status === "queued") await setStatus(ctx.db, o.id, "reserved");
      const fresh = (await orderById(ctx.db, o.id))!;
      // Jetzt die eigentliche Bestätigung mit Reservierungsnummer
      await ctx.mail.send(reservierungKunde([fresh], fresh.lang));
      await ctx.mail.send({ ...reservierungHaus(fresh, ctx.mailTo(fresh.house_id)), subject: `[Web-Reservierung, nachgetragen] ${fresh.number} (${key})` });
      return;
    }
    case "st_paid_order": {
      const key = await pushToSoftTouch(ctx, job.order_id!);
      const o = (await orderById(ctx.db, job.order_id!))!;
      await ctx.mail.send({ ...bestellungHaus(o, ctx.mailTo(o.house_id)), subject: `[Web-Bestellung, nachgetragen] ${o.number} (${key})` });
      return;
    }
    case "st_message": {
      const p = job.payload as { store: string; house: "lanners" | "jager"; key: string };
      await ctx.conn(p.house).client.sendMessage({ store: p.store, subject: "PRINT RESERVATION", message: p.key });
      return;
    }
    case "mail": {
      await ctx.mail.send(job.payload as unknown as Mail);
      return;
    }
    default:
      throw new Error(`Unbekannte Outbox-Art ${job.kind}`);
  }
}

export async function processOutbox(ctx: Ctx): Promise<{ done: number; retried: number; failed: number }> {
  const jobs = await ctx.db.query<Job>(
    `select id::int as id, kind, payload, order_id::text as order_id, attempts, alerted, created_at::text as created_at
     from outbox where done_at is null and failed_at is null and next_attempt_at <= now() order by id limit 25`,
  );
  let done = 0,
    retried = 0,
    failed = 0;
  for (const job of jobs) {
    try {
      await run(ctx, job);
      await ctx.db.query(`update outbox set done_at = now(), attempts = attempts + 1, last_error = null where id = $1`, [job.id]);
      done++;
    } catch (e) {
      const msg = (e as Error).message.slice(0, 500);
      const attempts = job.attempts + 1;
      const age = ctx.now().getTime() - new Date(job.created_at).getTime();
      const aufgeben = !isRetryable(e) || age > shop.outbox.maxStunden * 3600000;
      if (aufgeben) {
        await ctx.db.query(`update outbox set failed_at = now(), attempts = $2, last_error = $3 where id = $1`, [job.id, attempts, msg]);
        if (job.order_id) await setStatus(ctx.db, job.order_id, "nachpruefen");
        await alertMail(ctx, `Outbox aufgegeben: ${job.kind}`, [`Job ${job.id}`, `Bestellung ${job.order_id ?? "–"}`, `Fehler: ${msg}`, "Bitte von Hand in FasMan anlegen und den Kunden informieren."]);
        failed++;
      } else {
        await ctx.db.query(`update outbox set attempts = $2, last_error = $3, next_attempt_at = now() + make_interval(mins => $4) where id = $1`, [
          job.id,
          attempts,
          msg,
          shop.outbox.intervallMinuten,
        ]);
        if (attempts >= shop.outbox.warnungNachVersuchen && !job.alerted) {
          await ctx.db.query(`update outbox set alerted = true where id = $1`, [job.id]);
          await alertMail(ctx, `SoftTouch antwortet nicht (${attempts} Versuche)`, [`Job ${job.id}: ${job.kind}`, `Bestellung ${job.order_id ?? "–"}`, `Letzter Fehler: ${msg}`, "Die Website versucht es alle 5 Minuten weiter, bis zu 24 Stunden."]);
        }
        retried++;
      }
    }
  }
  return { done, retried, failed };
}
