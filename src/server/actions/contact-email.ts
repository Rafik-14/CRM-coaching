"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, contacts, scheduledEmails } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { sendEmail } from "@/server/email/send";
import { getTemplate } from "@/server/email/templates";
import { templateVars } from "@/server/sequences";
import { TEMPLATE_DEFS, TEMPLATE_KEYS, fillTemplateText, type TemplateKey } from "@/lib/email-templates";
import type { ActionState } from "./coaching";

async function loadContact(contactId: string) {
  return db.query.contacts.findFirst({
    where: eq(contacts.id, z.uuid().parse(contactId)),
    columns: { id: true, firstName: true, email: true, emailOptOut: true },
    with: { client: { columns: { id: true, status: true } } },
  });
}

/** « Envoyer un e-mail »: a template filled for this contact, to edit before sending (or an empty message). */
export async function getEmailDraft(contactId: string, key: TemplateKey | "libre") {
  await requireCoach();
  const contact = await loadContact(contactId);
  if (!contact) return null;
  if (key === "libre") return { subject: "", heading: `Bonjour ${contact.firstName},`, body: "" };
  const k = z.enum(TEMPLATE_KEYS).parse(key);
  const [{ text }, vars] = await Promise.all([getTemplate(k), templateVars(contact)]);
  const filled = fillTemplateText(text, vars);
  return { subject: filled.subject, heading: filled.heading, body: filled.paragraphs.join("\n\n") };
}

const messageSchema = z.object({
  template: z.string().max(60).optional(),
  subject: z.string().trim().min(1, "Indiquez un objet.").max(200),
  heading: z.string().trim().min(1, "Indiquez un titre.").max(200),
  body: z.string().trim().min(1, "Écrivez votre message.").max(10_000),
});

export async function sendContactEmail(contactId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  const contact = await loadContact(contactId);
  if (!contact) return { error: "Contact introuvable." };
  if (!contact.email) return { error: "Ce contact n’a pas d’adresse e-mail." };
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  const v = parsed.data;
  const key = (TEMPLATE_KEYS as readonly string[]).includes(v.template ?? "") ? (v.template as TemplateKey) : null;

  const paragraphs = v.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const result = await sendEmail({
    to: contact.email,
    subject: v.subject,
    content: { preheader: paragraphs[0]?.slice(0, 110) ?? v.heading, heading: v.heading, paragraphs },
    contactId: contact.id,
    templateKey: key ? `manual:${key}` : "manual",
  });
  await db.insert(activityLog).values({ actorId: user.id, entity: "contact", entityId: contact.id, action: "email_sent" });
  refresh();
  if (!result.ok) return { error: "L’envoi a échoué : voir Paramètres › E-mails." };
  const optOutNote = key && !TEMPLATE_DEFS[key].essential && contact.emailOptOut;
  return {
    ok: true,
    message: optOutNote
      ? "E-mail envoyé (vous l’avez envoyé vous-même : ce contact ne reçoit plus les e-mails automatiques facultatifs)."
      : "E-mail envoyé.",
  };
}

/** The coach cancels an automatic e-mail that has not gone out yet. */
export async function cancelScheduledEmail(id: string): Promise<ActionState> {
  await requireCoach();
  const rows = await db
    .update(scheduledEmails)
    .set({ status: "cancelled", note: "Annulé par vous" })
    .where(and(eq(scheduledEmails.id, z.uuid().parse(id)), eq(scheduledEmails.status, "pending")))
    .returning({ id: scheduledEmails.id });
  refresh();
  return rows.length ? { ok: true } : { error: "Cet e-mail est déjà parti ou annulé." };
}
