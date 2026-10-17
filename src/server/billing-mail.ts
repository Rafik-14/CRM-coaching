import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { contacts, invoices } from "@/server/db/schema";
import { getTemplate } from "@/server/email/templates";
import { sendEmail } from "@/server/email/send";
import { COACH_NAME } from "@/server/email/messages";
import { invoicePdf, paymentUrl, stripeEnabled } from "@/server/billing";
import { readStoredFile } from "@/server/storage";
import { fillTemplateText } from "@/lib/email-templates";
import { formatCents } from "@/lib/invoices";
import { APP_TIME_ZONE } from "@/lib/format";

const longDate = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, day: "numeric", month: "long", year: "numeric" });

type Key = "invoice_issued" | "payment_reminder" | "payment_received";

/** Sends one of the invoice e-mails (PDF attached for the invoice and the reminder). Never throws. */
export async function sendInvoiceMail(invoiceId: string, key: Key, dueCents?: number) {
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!inv?.number) return { ok: false, reason: "Facture introuvable" };
  const contact = inv.contactId
    ? await db.query.contacts.findFirst({ where: eq(contacts.id, inv.contactId), columns: { firstName: true, email: true } })
    : null;
  const to = inv.billTo.email || contact?.email;
  if (!to) return { ok: false, reason: "Pas d’adresse e-mail" };
  const tpl = await getTemplate(key);
  if (!tpl.enabled) return { ok: false, reason: "E-mail désactivé dans Paramètres" };

  const link = stripeEnabled() && key !== "payment_received" ? await paymentUrl(inv.id) : "";
  const filled = fillTemplateText(tpl.text, {
    prenom: contact?.firstName ?? inv.billTo.name,
    nom_coach: COACH_NAME,
    numero_facture: inv.number,
    montant: formatCents(dueCents ?? inv.totalCents, inv.currency),
    echeance: inv.dueAt ? longDate.format(inv.dueAt) : "",
    lien_paiement: link,
  });
  // Without online payment, drop the sentence that ends on the (empty) link.
  const paragraphs = link ? filled.paragraphs : filled.paragraphs.filter((p) => !p.trim().endsWith(":"));

  let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined;
  if (key !== "payment_received") {
    const pdf = inv.pdfPath ? await readStoredFile(inv.pdfPath).catch(() => invoicePdf(inv)) : await invoicePdf(inv);
    attachments = [{ filename: `facture-${inv.number}.pdf`, content: pdf, contentType: "application/pdf" }];
  }
  const result = await sendEmail({
    to,
    subject: filled.subject,
    content: { preheader: paragraphs[0]?.slice(0, 110) ?? filled.heading, heading: filled.heading, paragraphs },
    contactId: inv.contactId,
    templateKey: key,
    attachments,
  });
  return { ok: result.ok, reason: result.ok ? undefined : "Envoi échoué" };
}
