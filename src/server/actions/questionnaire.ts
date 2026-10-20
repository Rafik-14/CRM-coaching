"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, contacts, settings } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { clientIp, rateLimited } from "@/server/rate-limit";
import { sendEmail } from "@/server/email/send";
import { getTemplate } from "@/server/email/templates";
import { coachNotificationAddress, coachQuestionnaireSubmitted } from "@/server/email/messages";
import { getQuestionnaire, questionnaireUrl } from "@/server/questionnaire";
import { findQuestionnaire, submitAnswers } from "@/server/questionnaire-links";
import { templateContent, templateVars } from "@/server/sequences";
import { QUESTIONNAIRE_KEY, formatAnswer, questionnaireSchema, readAnswers } from "@/lib/questionnaire";
import type { ActionState } from "./coaching";

// ------------------------------------------------------------------ CRM

/** Paramètres › Questionnaire: the editor sends the whole questionnaire as JSON. */
export async function saveQuestionnaire(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoach();
  let data: unknown;
  try {
    data = JSON.parse(String(formData.get("data") ?? ""));
  } catch {
    return { error: "Questionnaire illisible." };
  }
  const parsed = questionnaireSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db
    .insert(settings)
    .values({ key: QUESTIONNAIRE_KEY, value: parsed.data })
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });
  refresh();
  return { ok: true };
}

/** Fiche client › Questionnaire › « Envoyer »: e-mail with the link (the open one, else a new one). */
export async function sendQuestionnaire(contactId: string): Promise<ActionState> {
  const user = await requireCoach();
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, z.uuid().parse(contactId)),
    columns: { id: true, firstName: true, email: true, emailOptOut: true },
    with: { client: { columns: { id: true, status: true } } },
  });
  if (!contact) return { error: "Contact introuvable." };
  if (!contact.email) return { error: "Ajoutez d’abord une adresse e-mail à la fiche." };
  const [{ text }, url] = await Promise.all([getTemplate("questionnaire_invite"), questionnaireUrl(contact.id)]);
  const mail = templateContent(text, await templateVars(contact, { lien_questionnaire: url }));
  const result = await sendEmail({ ...mail, to: contact.email, contactId: contact.id, templateKey: "questionnaire_invite" });
  await db.insert(activityLog).values({ actorId: user.id, entity: "contact", entityId: contact.id, action: "questionnaire_sent" });
  refresh();
  return result.ok ? { ok: true, message: `Questionnaire envoyé à ${contact.email}.` } : { error: "L’envoi a échoué (voir Paramètres › E-mails)." };
}

/** « Copier le lien » without sending an e-mail (WhatsApp…). */
export async function getQuestionnaireLink(contactId: string): Promise<string> {
  await requireCoach();
  return questionnaireUrl(z.uuid().parse(contactId));
}

// ------------------------------------------------------------------ public /questionnaire/<token>

export type QuestionnaireState = {
  done?: boolean;
  error?: string;
  errors?: Record<string, string>;
  /** What was typed, to refill the form (React resets it after the action). */
  values?: Record<string, string | string[]>;
};

export async function submitQuestionnaire(token: string, _prev: QuestionnaireState, formData: FormData): Promise<QuestionnaireState> {
  if (rateLimited(`questionnaire:${await clientIp()}`, 10, 10 * 60_000)) {
    return { error: "Trop de tentatives en peu de temps. Merci de réessayer un peu plus tard." };
  }
  const found = await findQuestionnaire(db, token);
  if (!found) return { error: "Ce lien n’est plus valide." };
  if (found.submitted) return { done: true };

  const { questions } = await getQuestionnaire();
  const form: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    const current = form[key];
    form[key] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value];
  }
  const result = readAnswers(questions, form);
  if (!result.ok) return { errors: result.errors, error: "Certaines réponses sont à compléter.", values: form };

  const saved = await submitAnswers(db, found.response.id, result.answers);
  if (!saved) return { done: true }; // already sent (double click)
  await db.insert(activityLog).values({ entity: "contact", entityId: saved.contactId, action: "questionnaire_submitted" });

  after(async () => {
    const coach = await coachNotificationAddress();
    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, saved.contactId),
      columns: { firstName: true, lastName: true },
    });
    if (!coach || !contact) return;
    const notice = coachQuestionnaireSubmitted({
      contactId: saved.contactId,
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      answers: result.answers.map((a) => [a.label, formatAnswer(a)]),
    });
    await sendEmail({ ...notice, to: coach, contactId: saved.contactId, templateKey: "coach_questionnaire_submitted" });
  });
  return { done: true };
}
