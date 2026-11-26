import { and, desc, eq, gt, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { AnyDb } from "@/server/db/types";
import {
  coachingSessions,
  contacts,
  revelateurCallbacks,
  revelateurConsents,
  revelateurDeliveries,
  revelateurEvents,
  revelateurParticipants,
  revelateurResults,
  revelateurSessions,
} from "@/server/db/schema";
import { DISCOVERY_TYPE } from "@/lib/validations/coaching";
import { UserError } from "./session";

/**
 * The test's CRM (annexe 07): participants, callback requests, consents, events and the three counters.
 * Counters are always computed from server data (§1.2): sessions, callback rows, booked calls.
 */

export type EventType =
  | "TEST_COMPLETED"
  | "REPORT_SENT"
  | "CALLBACK_REQUESTED"
  | "CALLBACK_COMPLETED"
  | "CALLBACK_CANCELLED"
  | "APPOINTMENT_BOOKED"
  | "REPORT_RESENT"
  | "ADDRESS_CORRECTED";

/** Idempotent: the same key never creates a second event (annexe 07 §5). */
export async function logEvent(db: AnyDb, e: { type: EventType; key: string; sessionId?: string | null; participantId?: string | null; at?: Date }) {
  await db
    .insert(revelateurEvents)
    .values({ type: e.type, key: e.key, sessionId: e.sessionId ?? null, participantId: e.participantId ?? null, occurredAt: e.at ?? new Date() })
    .onConflictDoNothing({ target: revelateurEvents.key });
}

/** Same normalised e-mail = same participant; the first name is never an identifier (§10). */
export async function upsertParticipant(db: AnyDb, email: string, firstName: string | null, now = new Date()) {
  const [p] = await db
    .insert(revelateurParticipants)
    .values({ email, firstName, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: revelateurParticipants.email,
      set: { firstName: firstName ? firstName : sql`${revelateurParticipants.firstName}`, updatedAt: now },
    })
    .returning();
  return p;
}

export async function linkSessionToParticipant(db: AnyDb, sessionId: string, participantId: string) {
  await db.update(revelateurSessions).set({ participantId }).where(eq(revelateurSessions.id, sessionId));
  await db.update(revelateurEvents).set({ participantId }).where(and(eq(revelateurEvents.sessionId, sessionId), isNull(revelateurEvents.participantId)));
}

// ---------------------------------------------------------------------------
// Callback requests
// ---------------------------------------------------------------------------

/** Text shown next to the (unticked) box; its version is stored with each consent. DRAFT wording. */
export const CALLBACK_CONSENT = {
  version: "rappel-v1",
  text: "Je souhaite être rappelé(e) par Jérémy Galéa pour échanger sur mes résultats. Mon numéro sert uniquement à ce rappel.",
} as const;

/** French and Swiss numbers (decision of 18 Nov): +33 / +41 or a 10-digit national number. Returns the E.164 form. */
export function normalisePhone(raw: unknown): string {
  const t = typeof raw === "string" ? raw.replace(/[\s.\-()]/g, "") : "";
  if (/^\+33[1-9]\d{8}$/.test(t) || /^\+41[1-9]\d{8}$/.test(t)) return t;
  if (/^0033[1-9]\d{8}$/.test(t) || /^0041[1-9]\d{8}$/.test(t)) return `+${t.slice(2)}`;
  if (/^0[1-9]\d{8}$/.test(t)) return t; // national form: France or Switzerland, kept as typed
  throw new UserError("Ce numéro ne semble pas valide (numéro français ou suisse).");
}

/** Explicit request (box ticked + valid phone). One request per session; re-sending only updates the number. */
export async function requestCallback(db: AnyDb, input: { sessionId: string; participantId: string; phone: unknown }, now = new Date()) {
  const phone = normalisePhone(input.phone);
  await db.insert(revelateurConsents).values({
    participantId: input.participantId,
    sessionId: input.sessionId,
    type: "callback",
    choice: true,
    textVersion: CALLBACK_CONSENT.version,
    source: "fin du test",
    capturedAt: now,
  });
  const [cb] = await db
    .insert(revelateurCallbacks)
    .values({ participantId: input.participantId, sessionId: input.sessionId, phone, requestedAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: revelateurCallbacks.sessionId, set: { phone, updatedAt: now } })
    .returning();
  await logEvent(db, { type: "CALLBACK_REQUESTED", key: `CALLBACK_REQUESTED:${cb.id}`, sessionId: input.sessionId, participantId: input.participantId, at: now });
  return cb;
}

export async function setCallbackStatus(db: AnyDb, id: string, status: "in_progress" | "completed" | "cancelled", outcome: string | null, now = new Date()) {
  const [cb] = await db
    .update(revelateurCallbacks)
    .set({ status, outcome: outcome?.trim().slice(0, 500) || null, closedAt: status === "in_progress" ? null : now, updatedAt: now })
    .where(and(eq(revelateurCallbacks.id, id), inArray(revelateurCallbacks.status, ["pending", "in_progress"])))
    .returning();
  if (cb && status !== "in_progress") {
    if (status === "cancelled") {
      await db.update(revelateurConsents).set({ withdrawnAt: now }).where(and(eq(revelateurConsents.sessionId, cb.sessionId), eq(revelateurConsents.type, "callback"), isNull(revelateurConsents.withdrawnAt)));
    }
    await logEvent(db, { type: status === "completed" ? "CALLBACK_COMPLETED" : "CALLBACK_CANCELLED", key: `CALLBACK_CLOSED:${cb.id}`, sessionId: cb.sessionId, participantId: cb.participantId, at: now });
  }
  return cb ?? null;
}

/**
 * A discovery call was booked on the site (APPOINTMENT_BOOKED). If the address belongs to a participant,
 * their open callback requests become « converted » and leave the « Rappels à effectuer » counter.
 */
export async function onDiscoveryBooked(db: AnyDb, email: string | null | undefined, appointmentId: string, now = new Date()) {
  const normalised = (email ?? "").trim().toLowerCase();
  if (!normalised) return;
  const p = await db.query.revelateurParticipants.findFirst({ where: eq(revelateurParticipants.email, normalised) });
  if (!p) return;
  await db
    .update(revelateurCallbacks)
    .set({ status: "converted", appointmentId, closedAt: now, updatedAt: now })
    .where(and(eq(revelateurCallbacks.participantId, p.id), inArray(revelateurCallbacks.status, ["pending", "in_progress"])));
  await logEvent(db, { type: "APPOINTMENT_BOOKED", key: `APPOINTMENT_BOOKED:${appointmentId}`, participantId: p.id, at: now });
}

// ---------------------------------------------------------------------------
// Counters, distribution, lists (annexe 07 §1, §3, §13)
// ---------------------------------------------------------------------------

/** Discovery calls of participants: confirmed (planned) and still to come. */
function upcomingCallsWhere(now: Date, from?: Date) {
  return and(
    eq(coachingSessions.type, DISCOVERY_TYPE),
    eq(coachingSessions.status, "planned"),
    gt(coachingSessions.startsAt, now),
    sql`lower(${contacts.email}) in (select email from ${revelateurParticipants})`,
    from ? gte(coachingSessions.createdAt, from) : undefined,
  );
}

export async function counters(db: AnyDb, opts: { from?: Date; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const [tests] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(revelateurSessions)
    .where(and(eq(revelateurSessions.status, "complete"), opts.from ? gte(revelateurSessions.confirmedAt, opts.from) : undefined));
  const [callbacks] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(revelateurCallbacks)
    .where(and(inArray(revelateurCallbacks.status, ["pending", "in_progress"]), opts.from ? gte(revelateurCallbacks.requestedAt, opts.from) : undefined));
  const [calls] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(coachingSessions)
    .innerJoin(contacts, eq(contacts.id, coachingSessions.contactId))
    .where(upcomingCallsWhere(now, opts.from));
  return { tests: tests.n, callbacks: callbacks.n, calls: calls.n };
}

export const CONFIGURATION_CATEGORIES = [
  { code: "SINGLE_PROFILE", label: "Profil principal unique" },
  { code: "JOINT", label: "Configuration conjointe" },
  { code: "PLURAL", label: "Configuration plurielle" },
  { code: "VALUE_EMBODIED", label: "La Valeur incarnée" },
  { code: "DEVELOPED", label: "Configuration développée" },
] as const;

/** Five mutually exclusive categories; the secondary profile is never a sixth one (§13). */
export async function configurationDistribution(db: AnyDb, from?: Date) {
  const rows = await db
    .select({ code: sql<string>`${revelateurResults.snapshot}->'configuration'->>'code'`, n: sql<number>`count(*)::int` })
    .from(revelateurResults)
    .innerJoin(revelateurSessions, eq(revelateurSessions.id, revelateurResults.sessionId))
    .where(and(eq(revelateurSessions.status, "complete"), from ? gte(revelateurSessions.confirmedAt, from) : undefined))
    .groupBy(sql`1`);
  return CONFIGURATION_CATEGORIES.map((c) => ({ ...c, n: rows.find((r) => r.code === c.code)?.n ?? 0 }));
}

export async function completedSessions(db: AnyDb, opts: { from?: Date; limit?: number } = {}) {
  return db
    .select({
      id: revelateurSessions.id,
      confirmedAt: revelateurSessions.confirmedAt,
      participantId: revelateurParticipants.id,
      firstName: revelateurParticipants.firstName,
      email: revelateurParticipants.email,
      configuration: sql<string | null>`${revelateurResults.snapshot}->'configuration'->>'code'`,
      profile: sql<string | null>`${revelateurResults.snapshot}->'configuration'->>'profile'`,
      delivery: revelateurDeliveries.status,
    })
    .from(revelateurSessions)
    .leftJoin(revelateurParticipants, eq(revelateurParticipants.id, revelateurSessions.participantId))
    .leftJoin(revelateurResults, eq(revelateurResults.sessionId, revelateurSessions.id))
    .leftJoin(revelateurDeliveries, eq(revelateurDeliveries.sessionId, revelateurSessions.id))
    .where(and(eq(revelateurSessions.status, "complete"), opts.from ? gte(revelateurSessions.confirmedAt, opts.from) : undefined))
    .orderBy(desc(revelateurSessions.confirmedAt))
    .limit(opts.limit ?? 200);
}

export async function openCallbacks(db: AnyDb, from?: Date) {
  return db
    .select({
      id: revelateurCallbacks.id,
      status: revelateurCallbacks.status,
      phone: revelateurCallbacks.phone,
      requestedAt: revelateurCallbacks.requestedAt,
      sessionId: revelateurCallbacks.sessionId,
      participantId: revelateurParticipants.id,
      firstName: revelateurParticipants.firstName,
      email: revelateurParticipants.email,
    })
    .from(revelateurCallbacks)
    .innerJoin(revelateurParticipants, eq(revelateurParticipants.id, revelateurCallbacks.participantId))
    .where(and(inArray(revelateurCallbacks.status, ["pending", "in_progress"]), from ? gte(revelateurCallbacks.requestedAt, from) : undefined))
    .orderBy(revelateurCallbacks.requestedAt);
}

export async function upcomingCalls(db: AnyDb, opts: { from?: Date; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  return db
    .select({
      id: coachingSessions.id,
      startsAt: coachingSessions.startsAt,
      contactId: contacts.id,
      firstName: contacts.firstName,
      email: contacts.email,
      participantId: revelateurParticipants.id,
    })
    .from(coachingSessions)
    .innerJoin(contacts, eq(contacts.id, coachingSessions.contactId))
    .innerJoin(revelateurParticipants, sql`${revelateurParticipants.email} = lower(${contacts.email})`)
    .where(upcomingCallsWhere(now, opts.from))
    .orderBy(coachingSessions.startsAt);
}

/** One search box: first name or e-mail, case-insensitive; homonyms are listed, never merged (§4.1). */
export async function searchParticipants(db: AnyDb, q: string) {
  const term = q.trim().toLowerCase().slice(0, 100);
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  return db
    .select({
      id: revelateurParticipants.id,
      firstName: revelateurParticipants.firstName,
      email: revelateurParticipants.email,
      updatedAt: revelateurParticipants.updatedAt,
      // Explicit aliases: inside the sub-query an unqualified « id » would be the session's own id.
      sessions: sql<number>`(select count(*)::int from revelateur_sessions rs where rs.participant_id = revelateur_participants.id and rs.status = 'complete')`,
    })
    .from(revelateurParticipants)
    .where(or(ilike(revelateurParticipants.email, like), ilike(revelateurParticipants.firstName, like)))
    .orderBy(desc(revelateurParticipants.updatedAt))
    .limit(50);
}

export async function participantFile(db: AnyDb, id: string) {
  const p = await db.query.revelateurParticipants.findFirst({ where: eq(revelateurParticipants.id, id) });
  if (!p) return null;
  const [sessions, callbacks, consents, events, calls] = await Promise.all([
    db
      .select({
        id: revelateurSessions.id,
        status: revelateurSessions.status,
        startedAt: revelateurSessions.startedAt,
        confirmedAt: revelateurSessions.confirmedAt,
        questionnaireVersion: revelateurSessions.questionnaireVersion,
        scoringVersion: revelateurResults.scoringEngineVersion,
        interpretationVersion: revelateurResults.interpretationEngineVersion,
        configuration: sql<string | null>`${revelateurResults.snapshot}->'configuration'->>'code'`,
        profile: sql<string | null>`${revelateurResults.snapshot}->'configuration'->>'profile'`,
        delivery: revelateurDeliveries.status,
        sentAt: revelateurDeliveries.sentAt,
      })
      .from(revelateurSessions)
      .leftJoin(revelateurResults, eq(revelateurResults.sessionId, revelateurSessions.id))
      .leftJoin(revelateurDeliveries, eq(revelateurDeliveries.sessionId, revelateurSessions.id))
      .where(eq(revelateurSessions.participantId, id))
      .orderBy(desc(revelateurSessions.startedAt)),
    db.query.revelateurCallbacks.findMany({ where: eq(revelateurCallbacks.participantId, id), orderBy: desc(revelateurCallbacks.requestedAt) }),
    db.query.revelateurConsents.findMany({ where: eq(revelateurConsents.participantId, id), orderBy: desc(revelateurConsents.capturedAt) }),
    db.query.revelateurEvents.findMany({ where: eq(revelateurEvents.participantId, id), orderBy: desc(revelateurEvents.occurredAt), limit: 100 }),
    db
      .select({ id: coachingSessions.id, startsAt: coachingSessions.startsAt, status: coachingSessions.status, contactId: contacts.id })
      .from(coachingSessions)
      .innerJoin(contacts, eq(contacts.id, coachingSessions.contactId))
      .where(and(eq(coachingSessions.type, DISCOVERY_TYPE), sql`lower(${contacts.email}) = ${p.email}`))
      .orderBy(desc(coachingSessions.startsAt)),
  ]);
  return { participant: p, sessions, callbacks, consents, events, calls };
}

// ---------------------------------------------------------------------------
// Admin alerts (v2.0 §8): shown in the CRM only, never e-mailed. red = blocking, orange = to handle.
// ---------------------------------------------------------------------------

export type Alert = { level: "red" | "orange" | "green"; text: string; href?: string };

export async function alerts(db: AnyDb, now = new Date()): Promise<Alert[]> {
  const out: Alert[] = [];
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const [givenUp] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(revelateurDeliveries)
    .where(and(eq(revelateurDeliveries.status, "failed"), isNull(revelateurDeliveries.nextAttemptAt)));
  if (givenUp.n) out.push({ level: "red", text: `${givenUp.n} rapport${givenUp.n > 1 ? "s n'ont" : " n'a"} pas pu être envoyé${givenUp.n > 1 ? "s" : ""} après plusieurs tentatives : vérifier l'adresse et renvoyer.`, href: "?vue=tests" });
  const [stuck] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(revelateurDeliveries)
    .where(and(eq(revelateurDeliveries.status, "awaiting_report"), lte(revelateurDeliveries.verifiedAt, hoursAgo(1))));
  if (stuck.n) out.push({ level: "red", text: `${stuck.n} rapport${stuck.n > 1 ? "s attendent" : " attend"} depuis plus d'une heure (contrôle éditorial ou génération bloqués).`, href: "?vue=tests" });
  const [late] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(revelateurCallbacks)
    .where(and(eq(revelateurCallbacks.status, "pending"), lte(revelateurCallbacks.requestedAt, hoursAgo(48))));
  if (late.n) out.push({ level: "orange", text: `${late.n} demande${late.n > 1 ? "s" : ""} de rappel en attente depuis plus de 48 heures.`, href: "?vue=rappels" });
  if (!out.length) out.push({ level: "green", text: "Aucune anomalie : les rapports partent normalement." });
  return out;
}
