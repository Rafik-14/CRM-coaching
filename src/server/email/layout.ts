import "server-only";

/**
 * JG® e-mail layout: table-based HTML with inline styles (what e-mail clients understand),
 * navy / gold / ivory, a text wordmark instead of images (no remote images to block), and a plain-text version.
 */
const NAVY = "#172536";
const GOLD = "#D4A866";
const IVORY = "#F8F6F2";
const TEXT = "#343A3F";
const LINE = "#E7E7E5";
const FONT = "Lato, 'Helvetica Neue', Arial, sans-serif";
const HEADING_FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export type EmailContent = {
  /** Short line shown next to the subject in the inbox. */
  preheader: string;
  heading: string;
  /** Plain text paragraphs (escaped here; line breaks kept). */
  paragraphs: string[];
  /** Label / value pairs shown in a box (date, heure, lieu…). */
  details?: [string, string][];
  /** Main button. */
  cta?: { label: string; url: string };
  /** Small text under the button. */
  note?: string;
  /** Sign-off; defaults to Jérémy's. */
  signature?: string[];
  /** Non-essential e-mails: link to stop receiving them. */
  unsubscribeUrl?: string;
};

/** Escapes the text and turns the web addresses it contains into links. */
const withLinks = (s: string) =>
  esc(s).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (url) => `<a href="${url}" style="color:${NAVY};font-weight:600;">${url}</a>`);

const DEFAULT_SIGNATURE = ["Jérémy Galéa", "Coach & formateur · Créateur de la Méthode JG®"];

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const signature = c.signature ?? DEFAULT_SIGNATURE;
  const p = (s: string) =>
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.6;color:${TEXT};">${withLinks(s).replace(/\n/g, "<br>")}</p>`;
  const details = c.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:${IVORY};border-radius:10px;">
        ${c.details
          .map(
            ([label, value]) => `<tr>
          <td style="padding:12px 20px 0;font-family:${FONT};font-size:13px;color:${TEXT};width:38%;vertical-align:top;">${esc(label)}</td>
          <td style="padding:12px 20px 0;font-family:${HEADING_FONT};font-size:15px;font-weight:600;color:${NAVY};vertical-align:top;">${esc(value)}</td>
        </tr>`,
          )
          .join("")}
        <tr><td colspan="2" style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>
      </table>`
    : "";
  const cta = c.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr>
        <td style="background:${NAVY};border-radius:7px;">
          <a href="${esc(c.cta.url)}" style="display:inline-block;padding:14px 26px;font-family:${HEADING_FONT};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">${esc(c.cta.label)}</a>
        </td></tr></table>`
    : "";
  const note = c.note
    ? `<p style="margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:1.5;color:${TEXT};">${esc(c.note)}</p>`
    : "";

  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.heading)}</title></head>
<body style="margin:0;padding:0;background:${IVORY};">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${esc(c.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${IVORY};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="background:${NAVY};border-radius:12px 12px 0 0;padding:24px 32px;">
        <div style="font-family:${HEADING_FONT};font-size:15px;font-weight:600;letter-spacing:3px;color:#FFFFFF;">JÉRÉMY GALÉA</div>
        <div style="font-family:${FONT};font-size:11px;letter-spacing:2px;color:${IVORY};margin-top:4px;">RÉVÉLER VOTRE POTENTIEL</div>
        <div style="width:40px;height:2px;background:${GOLD};margin-top:12px;font-size:0;line-height:0;">&nbsp;</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 20px;font-family:${HEADING_FONT};font-size:22px;line-height:1.25;font-weight:600;color:${NAVY};">${esc(c.heading)}</h1>
        ${c.paragraphs.map(p).join("")}
        ${details}
        ${cta}
        ${note}
        <p style="margin:24px 0 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${TEXT};">${signature
          .map((line, i) => (i === 0 ? `<strong style="color:${NAVY};">${esc(line)}</strong>` : esc(line)))
          .join("<br>")}</p>
      </td></tr>
      <tr><td style="border-top:1px solid ${LINE};padding:16px 32px;font-family:${FONT};font-size:12px;color:${TEXT};">
        Méthode JG® · France • Suisse${
          c.unsubscribeUrl
            ? ` · <a href="${esc(c.unsubscribeUrl)}" style="color:${TEXT};">Ne plus recevoir ces e-mails</a>`
            : ""
        }
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    c.heading,
    "",
    ...c.paragraphs.flatMap((s) => [s, ""]),
    ...(c.details?.map(([label, value]) => `${label} : ${value}`) ?? []),
    ...(c.details?.length ? [""] : []),
    ...(c.cta ? [`${c.cta.label} : ${c.cta.url}`, ""] : []),
    ...(c.note ? [c.note, ""] : []),
    ...signature,
    "",
    "Méthode JG® · France • Suisse",
    ...(c.unsubscribeUrl ? [`Ne plus recevoir ces e-mails : ${c.unsubscribeUrl}`] : []),
  ].join("\n");

  return { html, text };
}
