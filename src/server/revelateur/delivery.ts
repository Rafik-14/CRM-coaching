import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";
import type { AnyDb } from "@/server/db/types";
import { revelateurDeliveries, revelateurSessions } from "@/server/db/schema";
import { linkSessionToParticipant, logEvent, upsertParticipant } from "./crm";
import { UserError } from "./session";

/**
 * Report delivery (dossier v2.0 §2 steps 9–11 and §8). The address is asked only after the final
 * confirmation, confirmed by a link, and used only to send (and re-send) the report. The PDF goes as an
 * attachment; there is never a download link. This file holds the rules; sending is injected so the
 * rules can be tested without SMTP.
 */

export type DeliveryRow = typeof revelateurDeliveries.$inferSelect;
export type DeliveryState =
  | { status: "none" }
  | { status: DeliveryRow["status"]; email: string; givenUp: boolean };

export const VERIFY_HOURS = 48;
export const MAX_VERIFY_SENDS = 5;
export const MAX_ATTEMPTS = 6;
/** Waits between two attempts after a failure: 5 min, 30 min, 2 h, 6 h, 24 h. */
const BACKOFF_MIN = [5, 30, 120, 360, 1440];
/** While the report itself is not ready yet, look again a little later. */
const REPORT_RETRY_MIN = 15;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normaliseEmail(raw: unknown): string {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) throw new UserError("Cette adresse e-mail ne semble pas valide.");
  return email;
}

export function normaliseFirstName(raw: unknown): string | null {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ").slice(0, 60) : "";
  return name || null;
}

/** « j•••@exemple.fr »: enough to recognise one's address on screen, nothing more. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}•••@${domain}`;
}

export async function deliveryOf(db: AnyDb, sessionId: string): Promise<DeliveryRow | null> {
  return (await db.query.revelateurDeliveries.findFirst({ where: eq(revelateurDeliveries.sessionId, sessionId) })) ?? null;
}

export function stateOf(d: DeliveryRow | null): DeliveryState {
  if (!d) return { status: "none" };
  return { status: d.status, email: maskEmail(d.email), givenUp: d.status === "failed" && d.nextAttemptAt === null };
}

/**
 * The person gives (or corrects) the address after confirming. A new confirmation link is issued each
 * time; once the address is confirmed it can no longer be changed from the test.
 */
export async function requestDelivery(
  db: AnyDb,
  sessionId: string,
  input: { email: unknown; firstName: unknown },
  now = new Date(),
): Promise<{ token: string; delivery: DeliveryRow; participantId: string }> {
  const session = await db.query.revelateurSessions.findFirst({ where: eq(revelateurSessions.id, sessionId) });
  if (!session || session.status !== "complete") throw new UserError("Confirmez d'abord vos réponses.");
  const email = normaliseEmail(input.email);
  const firstName = normaliseFirstName(input.firstName);
  const existing = await deliveryOf(db, sessionId);
  if (existing && existing.status !== "awaiting_verification") throw new UserError("Votre adresse est déjà confirmée.");
  if (existing && existing.verifySends >= MAX_VERIFY_SENDS) throw new UserError("Trop d'envois de lien. Réessayez plus tard ou contactez-nous.");

  const token = randomBytes(32).toString("base64url");
  const values = {
    email,
    firstName,
    status: "awaiting_verification" as const,
    verifyTokenHash: hashToken(token),
    verifyExpiresAt: new Date(now.getTime() + VERIFY_HOURS * 3_600_000),
    verifySends: (existing?.verifySends ?? 0) + 1,
    updatedAt: now,
  };
  const [delivery] = existing
    ? await db.update(revelateurDeliveries).set(values).where(eq(revelateurDeliveries.id, existing.id)).returning()
    : await db.insert(revelateurDeliveries).values({ sessionId, ...values, createdAt: now }).returning();
  // The address identifies the participant (annexe 07 §10); the session is attached to them.
  const participant = await upsertParticipant(db, email, firstName, now);
  await linkSessionToParticipant(db, sessionId, participant.id);
  return { token, delivery, participantId: participant.id };
}

/** The link in the e-mail: confirms the address once and queues the report; later clicks only show its status. */
export async function verifyDelivery(
  db: AnyDb,
  token: unknown,
  now = new Date(),
): Promise<{ ok: true; delivery: DeliveryRow } | { ok: false; reason: "unknown" | "expired" }> {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return { ok: false, reason: "unknown" };
  const d = await db.query.revelateurDeliveries.findFirst({ where: eq(revelateurDeliveries.verifyTokenHash, hashToken(token)) });
  if (!d) return { ok: false, reason: "unknown" };
  // Clicked again after confirming: just show where the report stands (nothing is sent twice).
  if (d.status !== "awaiting_verification") return { ok: true, delivery: d };
  if (!d.verifyExpiresAt || d.verifyExpiresAt < now) return { ok: false, reason: "expired" };
  const [delivery] = await db
    .update(revelateurDeliveries)
    .set({ status: "awaiting_report", verifiedAt: now, verifyExpiresAt: null, nextAttemptAt: now, updatedAt: now })
    .where(and(eq(revelateurDeliveries.id, d.id), eq(revelateurDeliveries.status, "awaiting_verification")))
    .returning();
  return { ok: true, delivery: delivery ?? d };
}

export type DeliveryDeps = {
  /** The session's report as a PDF, or null while it cannot be produced yet. */
  buildPdf: (sessionId: string) => Promise<Buffer | null>;
  /** Sends the delivery e-mail with the PDF attached. */
  send: (d: DeliveryRow, pdf: Buffer) => Promise<{ ok: boolean; id: string | null; error?: string }>;
};

/**
 * One sending attempt. Claims the row first (so two runs never send twice), re-uses the same PDF on
 * every attempt, never recalculates anything. Returns what happened.
 */
export async function attemptDelivery(
  db: AnyDb,
  deliveryId: string,
  deps: DeliveryDeps,
  now = new Date(),
): Promise<"sent" | "failed" | "no_report" | "skipped"> {
  const [claimed] = await db
    .update(revelateurDeliveries)
    .set({ status: "sending", updatedAt: now })
    .where(and(eq(revelateurDeliveries.id, deliveryId), inArray(revelateurDeliveries.status, ["awaiting_report", "failed"])))
    .returning();
  if (!claimed) return "skipped";

  let pdf: Buffer | null = null;
  try {
    pdf = await deps.buildPdf(claimed.sessionId);
  } catch {
    pdf = null;
  }
  if (!pdf) {
    await db
      .update(revelateurDeliveries)
      .set({ status: "awaiting_report", nextAttemptAt: addMinutes(now, REPORT_RETRY_MIN), updatedAt: now })
      .where(eq(revelateurDeliveries.id, claimed.id));
    return "no_report";
  }

  const r = await deps.send(claimed, pdf).catch((e: unknown) => ({ ok: false, id: null, error: e instanceof Error ? e.message : "send failed" }));
  if (r.ok) {
    await db
      .update(revelateurDeliveries)
      .set({ status: "sent", sentAt: now, emailLogId: r.id, lastError: null, nextAttemptAt: null, attempts: claimed.attempts + 1, updatedAt: now })
      .where(eq(revelateurDeliveries.id, claimed.id));
    const session = await db.query.revelateurSessions.findFirst({ where: eq(revelateurSessions.id, claimed.sessionId) });
    await logEvent(db, { type: "REPORT_SENT", key: `REPORT_SENT:${claimed.id}:${claimed.attempts + 1}`, sessionId: claimed.sessionId, participantId: session?.participantId, at: now });
    return "sent";
  }
  const attempts = claimed.attempts + 1;
  await db
    .update(revelateurDeliveries)
    .set({
      status: "failed",
      attempts,
      emailLogId: r.id,
      lastError: ("error" in r && r.error ? r.error : "Échec de l'envoi").slice(0, 500),
      nextAttemptAt: attempts >= MAX_ATTEMPTS ? null : addMinutes(now, BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)]),
      updatedAt: now,
    })
    .where(eq(revelateurDeliveries.id, claimed.id));
  return "failed";
}

/** Deliveries waiting for a (new) attempt. */
export async function dueDeliveries(db: AnyDb, now = new Date()): Promise<DeliveryRow[]> {
  return db.query.revelateurDeliveries.findMany({
    where: and(
      inArray(revelateurDeliveries.status, ["awaiting_report", "failed"]),
      isNotNull(revelateurDeliveries.nextAttemptAt),
      lte(revelateurDeliveries.nextAttemptAt, now),
    ),
    limit: 25,
  });
}

/** A process stopped mid-send leaves « sending »: put it back in the queue after 15 minutes. */
export async function releaseStuckDeliveries(db: AnyDb, now = new Date()): Promise<number> {
  const rows = await db
    .update(revelateurDeliveries)
    .set({ status: "failed", nextAttemptAt: now, lastError: "Envoi interrompu", updatedAt: now })
    .where(and(eq(revelateurDeliveries.status, "sending"), lte(revelateurDeliveries.updatedAt, addMinutes(now, -15))))
    .returning({ id: revelateurDeliveries.id });
  return rows.length;
}

/**
 * From the CRM: send the report again (same PDF, no new test, no recalculation — v2.0 §4), optionally to a
 * corrected address. The coach vouches for a corrected address, so no new confirmation link is needed.
 */
export async function queueResend(db: AnyDb, sessionId: string, newEmail: unknown, now = new Date()): Promise<DeliveryRow> {
  const d = await deliveryOf(db, sessionId);
  if (!d) throw new UserError("Aucune adresse n'a été donnée pour cette passation.");
  if (d.status === "sending") throw new UserError("Un envoi est en cours. Réessayez dans un instant.");
  const email = newEmail ? normaliseEmail(newEmail) : d.email;
  const [row] = await db
    .update(revelateurDeliveries)
    .set({
      email,
      status: "failed",
      nextAttemptAt: now,
      verifiedAt: d.verifiedAt ?? now,
      verifyTokenHash: email === d.email ? d.verifyTokenHash : null,
      lastError: null,
      updatedAt: now,
    })
    .where(eq(revelateurDeliveries.id, d.id))
    .returning();
  return row;
}
