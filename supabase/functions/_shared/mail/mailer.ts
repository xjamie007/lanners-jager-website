/**
 * Mailversand. MAIL_MODE=log schreibt alle Mails in mail_log (Demo-Postausgang),
 * es wird nichts verschickt. MAIL_MODE=smtp verschickt über einen EU-Anbieter
 * (OP-02.4); Supabase Edge Functions erlauben ausgehend Port 465 (nicht 25/587).
 */
import type { Db } from "../db.ts";
import { env } from "../env.ts";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  lang: string;
  kind: string;
  groupId?: string | null;
  replyTo?: string;
}

export interface Mailer {
  readonly mode: "log" | "smtp";
  send(mail: Mail): Promise<void>;
}

export class LogMailer implements Mailer {
  readonly mode = "log" as const;
  private db: Db;
  constructor(db: Db) {
    this.db = db;
  }
  async send(m: Mail) {
    await this.db.query(`insert into mail_log (group_id, kind, to_addr, subject, text_body, html_body, lang) values ($1, $2, $3, $4, $5, $6, $7)`, [
      m.groupId ?? null,
      m.kind,
      m.to,
      m.subject,
      m.text,
      m.html,
      m.lang,
    ]);
  }
}

export class SmtpMailer implements Mailer {
  readonly mode = "smtp" as const;
  // deno-lint-ignore no-explicit-any
  private transport: any = null;

  private async tx() {
    if (this.transport) return this.transport;
    const { default: nodemailer } = await import("npm:nodemailer@7.0.6");
    this.transport = nodemailer.createTransport({
      host: env("SMTP_HOST"),
      port: Number(env("SMTP_PORT") ?? 465),
      secure: Number(env("SMTP_PORT") ?? 465) === 465,
      auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
    });
    return this.transport;
  }

  async send(m: Mail) {
    const from = env("MAIL_FROM");
    if (!from) throw new Error("MAIL_FROM fehlt");
    const t = await this.tx();
    await t.sendMail({ from, to: m.to, subject: m.subject, text: m.text, html: m.html, replyTo: m.replyTo });
  }
}
