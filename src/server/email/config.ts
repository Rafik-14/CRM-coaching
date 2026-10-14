import "server-only";

/**
 * E-mail settings from the environment (never stored in the database: the SMTP password is a secret).
 * Without a complete SMTP configuration the app runs in « mode test »: e-mails are logged, not sent.
 */
export type MailConfig = {
  /** Host, user and password all present → real sending. */
  configured: boolean;
  host: string | null;
  port: number;
  /** TLS from the start (port 465) instead of STARTTLS (587). */
  secure: boolean;
  user: string | null;
  from: string;
  replyTo: string | null;
  /** Tests: every e-mail goes to this address instead of the real recipient. */
  redirectTo: string | null;
  /** Missing variables, to show in Paramètres › E-mails. */
  missing: string[];
};

export function mailConfig(): MailConfig {
  const host = process.env.SMTP_HOST?.trim() || null;
  const user = process.env.SMTP_USER?.trim() || null;
  const password = process.env.SMTP_PASSWORD?.trim() || null;
  const port = Number(process.env.SMTP_PORT || 587);
  const missing = [!host && "SMTP_HOST", !user && "SMTP_USER", !password && "SMTP_PASSWORD"].filter(Boolean) as string[];
  return {
    configured: missing.length === 0,
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    user,
    from: process.env.MAIL_FROM?.trim() || (user ? `Jérémy Galéa <${user}>` : "Jérémy Galéa <no-reply@localhost>"),
    replyTo: process.env.MAIL_REPLY_TO?.trim() || null,
    redirectTo: process.env.MAIL_REDIRECT_TO?.trim() || null,
    missing,
  };
}

/** Base address for links in e-mails (website pages, CRM contact files). */
export function appUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL || "http://localhost:3100").replace(/\/$/, "");
}
