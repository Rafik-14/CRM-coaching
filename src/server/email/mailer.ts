import nodemailer, { type Transporter } from "nodemailer";

/**
 * The only place that talks to nodemailer: SMTP connection + one message.
 * No "server-only" import, so src/server/email/mailer.test.ts can send through a fake SMTP server;
 * only server code (send.ts) imports it.
 *
 * Hardening: messages may never read a file on the server or fetch a URL (attachments are built in memory:
 * calendar files, PDFs). nodemailer would otherwise follow `path` / `href` options.
 */
export type SmtpSettings = { host: string; port: number; secure: boolean; user: string; pass: string };

export type OutgoingMail = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string | Buffer; contentType: string }[];
};

export function createSmtpTransport(s: SmtpSettings): Transporter {
  return nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth: { user: s.user, pass: s.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

/** Sends one message; resolves with the provider's message id. */
export async function deliver(transport: Transporter, mail: OutgoingMail) {
  const info = await transport.sendMail({ ...mail, disableFileAccess: true, disableUrlAccess: true });
  return info.messageId as string;
}
