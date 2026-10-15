import "server-only";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { clientPackages, contacts, tasks } from "@/server/db/schema";
import { currentToken, issueToken } from "@/server/access-tokens";
import { clientBookingUrl } from "@/server/client-booking";
import { appUrl } from "@/server/email/config";
import { COACH_NAME } from "@/server/email/messages";
import { sendEmail } from "@/server/email/send";
import { getTemplate } from "@/server/email/templates";
import type { EmailContent } from "@/server/email/layout";
import { scheduleEmail, sendDueEmails, type DeliveryResult, type ScheduledEmail } from "@/server/scheduled-emails";
import {
  TEMPLATE_DEFS,
  TEMPLATE_KEYS,
  fillTemplateText,
  type TemplateKey,
  type TemplateText,
  type TemplateVars,
} from "@/lib/email-templates";

/**
 * Automatic e-mails triggered by what happens in the CRM (PHASE-2-PLAN §10.2). Server actions call the
 * `on…` hooks; the e-mail is scheduled once (dedupe key) and sent by the cron job, or right after the
 * action for the immediate ones.
 */
const DAY = 86_400_000;

/** Sends what is due now, after the response (the coach never waits for the mail server). */
function sendSoon() {
  after(() => runDueEmails(new Date()).catch((error) => console.error("[sequences]", error)));
}

/** A contact became a client: welcome e-mail with the personal booking link. */
export async function onBecameClient(contactId: string) {
  const scheduled = await scheduleEmail(db, {
    contactId,
    templateKey: "welcome_client",
    sendAt: new Date(),
    dedupeKey: `welcome_client:${contactId}`,
  });
  if (scheduled) sendSoon();
}

/** An « Échange stratégique » was held: follow-up the next day, unless the person became a client meanwhile. */
export async function onDiscoveryDone(contactId: string, sessionId: string) {
  await scheduleEmail(db, {
    contactId,
    templateKey: "discovery_follow_up",
    sendAt: new Date(Date.now() + DAY),
    dedupeKey: `discovery_follow_up:${sessionId}`,
  });
}

/** A session was counted: when one session is left, tell the client and remind the coach to propose a renewal. */
export async function onSessionCounted(contactId: string, clientPackageId: string) {
  const cp = await db.query.clientPackages.findFirst({
    where: eq(clientPackages.id, clientPackageId),
    with: { package: { columns: { name: true, sessionsCount: true } } },
  });
  if (!cp || cp.package.sessionsCount - cp.sessionsUsed !== 1) return;
  const scheduled = await scheduleEmail(db, {
    contactId,
    templateKey: "package_last_session",
    sendAt: new Date(),
    dedupeKey: `package_last_session:${clientPackageId}`,
    payload: { clientPackageId },
  });
  if (!scheduled) return;
  const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contactId), columns: { firstName: true } });
  await db.insert(tasks).values({
    title: `Proposer un renouvellement à ${contact?.firstName ?? "ce client"} (dernière séance du ${cp.package.name})`,
    dueAt: new Date(Date.now() + 3 * DAY),
    contactId,
  });
  sendSoon();
}

/** Coaching closed « terminé »: thank-you and testimonial request two days later. */
export async function onCoachingFinished(contactId: string, clientId: string) {
  await scheduleEmail(db, {
    contactId,
    templateKey: "coaching_finished",
    sendAt: new Date(Date.now() + 2 * DAY),
    dedupeKey: `coaching_finished:${clientId}`,
  });
}

// ------------------------------------------------------------------ sending

type SequenceContact = {
  id: string;
  firstName: string;
  email: string | null;
  emailOptOut: boolean;
  client: { id: string; status: string } | null;
};

async function loadContact(contactId: string): Promise<SequenceContact | null> {
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
    columns: { id: true, firstName: true, email: true, emailOptOut: true },
    with: { client: { columns: { id: true, status: true } } },
  });
  return contact ?? null;
}

/** Variables for a contact: booking link (the personal one for an active client), site pages, names. */
export async function templateVars(contact: SequenceContact, extra: TemplateVars = {}): Promise<TemplateVars> {
  let booking = `${appUrl()}/reserver?source=email`;
  if (contact.client?.status === "active") {
    const link =
      (await currentToken(db, "client_booking", { contactId: contact.id })) ??
      (await issueToken(db, { purpose: "client_booking", contactId: contact.id }));
    booking = clientBookingUrl(link.token);
  }
  return {
    prenom: contact.firstName,
    nom_coach: COACH_NAME,
    lien_reservation: booking,
    lien_accompagnements: `${appUrl()}/accompagnements`,
    ...extra,
  };
}

/** « Ne plus recevoir ces e-mails » link of a contact. */
export async function unsubscribeUrl(contactId: string) {
  const link =
    (await currentToken(db, "unsubscribe", { contactId })) ?? (await issueToken(db, { purpose: "unsubscribe", contactId }));
  return `${appUrl()}/preferences/${link.token}`;
}

export function templateContent(text: TemplateText, vars: TemplateVars, unsubscribe?: string): { subject: string; content: EmailContent } {
  const filled = fillTemplateText(text, vars);
  return {
    subject: filled.subject,
    content: {
      preheader: (filled.paragraphs[0] ?? filled.heading).slice(0, 110),
      heading: filled.heading,
      paragraphs: filled.paragraphs,
      unsubscribeUrl: unsubscribe,
    },
  };
}

/** Re-checks at send time that the e-mail still makes sense, then sends it. */
async function deliver(email: ScheduledEmail): Promise<DeliveryResult> {
  if (!(TEMPLATE_KEYS as readonly string[]).includes(email.templateKey)) return { status: "skipped", reason: "E-mail inconnu" };
  const key = email.templateKey as TemplateKey;
  const contact = await loadContact(email.contactId);
  if (!contact) return { status: "skipped", reason: "Contact supprimé" };
  if (!contact.email) return { status: "skipped", reason: "Pas d’adresse e-mail" };
  const tpl = await getTemplate(key);
  if (!tpl.enabled) return { status: "skipped", reason: "E-mail désactivé dans Paramètres" };
  const essential = TEMPLATE_DEFS[key].essential;
  if (!essential && contact.emailOptOut) return { status: "skipped", reason: "La personne ne souhaite plus recevoir ces e-mails" };

  const extra: TemplateVars = {};
  if (key === "discovery_follow_up" && contact.client) return { status: "skipped", reason: "Devenue cliente entre-temps" };
  if (key === "welcome_client" && !contact.client) return { status: "skipped", reason: "N’est plus client" };
  if (key === "coaching_finished" && contact.client?.status !== "finished") return { status: "skipped", reason: "Accompagnement repris" };
  if (key === "package_last_session") {
    const cp = await db.query.clientPackages.findFirst({
      where: eq(clientPackages.id, email.payload.clientPackageId ?? ""),
      with: { package: { columns: { name: true } } },
    });
    if (!cp) return { status: "skipped", reason: "Accompagnement retiré" };
    extra.accompagnement = cp.package.name;
  }

  const vars = await templateVars(contact, extra);
  const mail = templateContent(tpl.text, vars, essential ? undefined : await unsubscribeUrl(contact.id));
  const result = await sendEmail({ ...mail, to: contact.email, contactId: contact.id, templateKey: key });
  return result.ok ? { status: "sent" } : { status: "failed", reason: "Envoi échoué (voir Paramètres › E-mails)" };
}

export function runDueEmails(now: Date) {
  return sendDueEmails(db, now, deliver);
}
