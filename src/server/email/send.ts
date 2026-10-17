import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { emailLog } from "@/server/db/schema";
import { mailConfig } from "./config";
import { renderEmail, type EmailContent } from "./layout";

/** Marks e-mails « sent » in mode test (no SMTP configured): nothing really left the server. */
export const DEV_PROVIDER_ID = "mode-test";

let cached: { key: string; transporter: Transporter } | null = null;

function transporter() {
  const c = mailConfig();
  const key = `${c.host}:${c.port}:${c.user}:${c.secure}`;
  if (cached?.key !== key) {
    cached = {
      key,
      transporter: nodemailer.createTransport({
        host: c.host!,
        port: c.port,
        secure: c.secure,
        auth: { user: c.user!, pass: process.env.SMTP_PASSWORD!.trim() },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
      }),
    };
  }
  return cached.transporter;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  content: EmailContent;
  /** Links the e-mail to a contact (shown in their history). */
  contactId?: string | null;
  templateKey: string;
  replyTo?: string | null;
  attachments?: { filename: string; content: string | Buffer; contentType: string }[];
};

/**
 * Sends one e-mail and records it in email_log (queued → sent / failed).
 * Never throws: a failed e-mail must not break the action that triggered it. Call it inside `after()`.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; id: string | null }> {
  const c = mailConfig();
  const realTo = c.redirectTo ?? input.to;
  const subject = c.redirectTo ? `[Test → ${input.to}] ${input.subject}` : input.subject;

  let id: string | null = null;
  try {
    const [row] = await db
      .insert(emailLog)
      .values({
        contactId: input.contactId ?? null,
        to: input.to,
        redirectedTo: c.redirectTo,
        templateKey: input.templateKey,
        subject: input.subject,
      })
      .returning({ id: emailLog.id });
    id = row.id;

    const { html, text } = renderEmail(input.content);
    let providerId = DEV_PROVIDER_ID;
    if (c.configured) {
      const info = await transporter().sendMail({
        from: c.from,
        to: realTo,
        replyTo: input.replyTo ?? c.replyTo ?? undefined,
        subject,
        html,
        text,
        attachments: input.attachments,
      });
      providerId = info.messageId;
    } else {
      console.info(`[e-mail · mode test] ${input.templateKey} → ${realTo} : ${subject}`);
    }
    await db.update(emailLog).set({ status: "sent", providerId, sentAt: new Date() }).where(eq(emailLog.id, id));
    return { ok: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[e-mail] échec ${input.templateKey} → ${realTo} : ${message}`);
    if (id) {
      await db
        .update(emailLog)
        .set({ status: "failed", error: message.slice(0, 1000) })
        .where(eq(emailLog.id, id))
        .catch(() => {});
    }
    return { ok: false, id };
  }
}
