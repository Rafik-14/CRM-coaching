import { createHash, randomBytes } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import type { AnyDb } from "@/server/db/types";
import { revelateurAnswers, revelateurResults, revelateurSessions } from "@/server/db/schema";
import {
  QUESTIONNAIRE_VERSION,
  QUESTION_IDS,
  SCALE_LABELS,
  SCORING_ENGINE_VERSION,
  scoreAnswers,
  validateAnswers,
  type QuestionId,
  type ScoringResult,
} from "@/lib/revelateur/scoring";
import { interpret } from "./interpretation";
import { QUESTION_TEXTS } from "./question-texts";

/**
 * Passation logic of the Révélateur (dossier maître v2.0 §2 and §4):
 *  - one session per opaque token (cookie); only its SHA-256 is stored;
 *  - progressive save, resume on the same device for 30 days after the last activity;
 *  - no automatic move after a choice; going back keeps the answer;
 *  - a summary of the 30 answers, then an explicit, final confirmation that freezes them;
 *  - the score is computed on the server only, once (idempotent), from the raw answers.
 * The page only ever receives the screen it shows (never the 30 statements at once).
 */

export const RESUME_DAYS = 30;
export const OPEN_ANSWER_MAX = 1000;
const DAY = 86_400_000;

export type SessionRow = typeof revelateurSessions.$inferSelect;

export type Screen =
  | { kind: "welcome" }
  | {
      kind: "question";
      id: QuestionId;
      index: number;
      number: number;
      total: number;
      text: string;
      value: number | null;
      answered: boolean[];
    }
  | { kind: "open"; value: string }
  | { kind: "recap"; items: { index: number; number: number; value: number; label: string }[]; openAnswer: string }
  | { kind: "complete" };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** New passation; returns the token for the cookie (never stored in clear). */
export async function createSession(db: AnyDb) {
  const token = randomBytes(32).toString("base64url");
  const [session] = await db
    .insert(revelateurSessions)
    .values({ tokenHash: hashToken(token), questionnaireVersion: QUESTIONNAIRE_VERSION })
    .returning();
  return { token, session };
}

/** Session behind a cookie token, or null if unknown or (unfinished and) expired. */
export async function findSession(db: AnyDb, token: string | undefined, now = new Date()): Promise<SessionRow | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const session = await db.query.revelateurSessions.findFirst({ where: eq(revelateurSessions.tokenHash, hashToken(token)) });
  if (!session) return null;
  if (session.status === "in_progress" && now.getTime() - session.lastActivityAt.getTime() > RESUME_DAYS * DAY) return null;
  return session;
}

async function answersOf(db: AnyDb, sessionId: string) {
  const rows = await db
    .select({ questionId: revelateurAnswers.questionId, rawValue: revelateurAnswers.rawValue })
    .from(revelateurAnswers)
    .where(eq(revelateurAnswers.sessionId, sessionId));
  return new Map(rows.map((r) => [r.questionId as QuestionId, r.rawValue]));
}

/** What the page shows for this session right now. */
export async function screenFor(db: AnyDb, session: SessionRow): Promise<Screen> {
  if (session.status !== "in_progress") return { kind: "complete" };
  if (session.step === "welcome") return { kind: "welcome" };
  if (session.step === "open") return { kind: "open", value: session.openAnswer ?? "" };

  const answers = await answersOf(db, session.id);
  if (session.step === "recap") {
    return {
      kind: "recap",
      items: QUESTION_IDS.map((id, index) => {
        const value = answers.get(id) ?? 0;
        return { index, number: index + 1, value, label: SCALE_LABELS[value - 1] ?? "" };
      }),
      openAnswer: session.openAnswer ?? "",
    };
  }
  const index = session.questionIndex;
  const id = QUESTION_IDS[index];
  return {
    kind: "question",
    id,
    index,
    number: index + 1,
    total: QUESTION_IDS.length,
    text: QUESTION_TEXTS[id],
    value: answers.get(id) ?? null,
    answered: QUESTION_IDS.map((q) => answers.has(q)),
  };
}

/** An error whose message can be shown to the person (never a technical error). */
export class UserError extends Error {}
function assertOpen(session: SessionRow) {
  if (session.status !== "in_progress") throw new UserError("Les réponses sont confirmées et ne peuvent plus être modifiées.");
}

async function touch(db: AnyDb, sessionId: string, patch: Partial<typeof revelateurSessions.$inferInsert> = {}) {
  const [row] = await db
    .update(revelateurSessions)
    .set({ ...patch, lastActivityAt: new Date() })
    .where(and(eq(revelateurSessions.id, sessionId), eq(revelateurSessions.status, "in_progress")))
    .returning();
  if (!row) throw new UserError("Les réponses sont confirmées et ne peuvent plus être modifiées.");
  return row;
}

/** Saves the answer to the statement on screen. Does not move to the next one (v2.0: no automatic advance). */
export async function saveAnswer(db: AnyDb, session: SessionRow, questionId: string, value: unknown) {
  assertOpen(session);
  if (session.step !== "question" || QUESTION_IDS[session.questionIndex] !== questionId) {
    throw new UserError("Cette affirmation n'est pas celle affichée.");
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) throw new UserError("Réponse invalide.");
  await db
    .insert(revelateurAnswers)
    .values({ sessionId: session.id, questionId, rawValue: value })
    .onConflictDoUpdate({
      target: [revelateurAnswers.sessionId, revelateurAnswers.questionId],
      set: { rawValue: value, answeredAt: new Date() },
    });
  return touch(db, session.id);
}

export type Move =
  | { to: "start" }
  | { to: "next" }
  | { to: "previous" }
  | { to: "question"; index: number }
  | { to: "recap" };

/**
 * Navigation with the rules of the journey: a statement must be answered before going on, the
 * summary needs the 30 answers, and nothing moves once the answers are confirmed.
 */
export async function move(db: AnyDb, session: SessionRow, m: Move): Promise<SessionRow> {
  assertOpen(session);
  const answers = await answersOf(db, session.id);
  const allAnswered = QUESTION_IDS.every((id) => answers.has(id));

  switch (m.to) {
    case "start":
      return session.step === "welcome" ? touch(db, session.id, { step: "question", questionIndex: 0 }) : session;
    case "question": {
      if (!Number.isInteger(m.index) || m.index < 0 || m.index >= QUESTION_IDS.length) throw new UserError("Question inconnue.");
      // Free jumps only to statements already reached (summary « Modifier », or the progress bar).
      const reachable = m.index === 0 || QUESTION_IDS.slice(0, m.index).every((id) => answers.has(id));
      if (!reachable) throw new UserError("Répondez d'abord aux affirmations précédentes.");
      return touch(db, session.id, { step: "question", questionIndex: m.index });
    }
    case "previous":
      if (session.step === "question") {
        return session.questionIndex === 0 ? touch(db, session.id, { step: "welcome" }) : touch(db, session.id, { questionIndex: session.questionIndex - 1 });
      }
      if (session.step === "open") return touch(db, session.id, { step: "question", questionIndex: QUESTION_IDS.length - 1 });
      if (session.step === "recap") return touch(db, session.id, { step: "open" });
      return session;
    case "next":
      if (session.step === "welcome") return touch(db, session.id, { step: "question", questionIndex: 0 });
      if (session.step === "question") {
        if (!answers.has(QUESTION_IDS[session.questionIndex])) throw new UserError("Choisissez une réponse pour continuer.");
        return session.questionIndex === QUESTION_IDS.length - 1
          ? touch(db, session.id, { step: "open" })
          : touch(db, session.id, { questionIndex: session.questionIndex + 1 });
      }
      if (session.step === "open") {
        if (!allAnswered) throw new UserError("Il manque des réponses.");
        return touch(db, session.id, { step: "recap" });
      }
      return session;
    case "recap":
      if (!allAnswered) throw new UserError("Il manque des réponses.");
      return touch(db, session.id, { step: "recap" });
  }
}

/** Optional open answer: trimmed, capped, stored apart from the 30 answers. Empty = none. */
export async function saveOpenAnswer(db: AnyDb, session: SessionRow, text: unknown) {
  assertOpen(session);
  const value = typeof text === "string" ? text.trim().slice(0, OPEN_ANSWER_MAX) : "";
  return touch(db, session.id, { openAnswer: value || null });
}

export type ConfirmResult = { ok: true; result: ScoringResult } | { ok: false; error: string };

/**
 * Explicit final confirmation. Freezes the answers, then computes and stores the result snapshot —
 * exactly once, even if the button is pressed twice or the page is reloaded (SESSION02).
 */
export async function confirmSession(db: AnyDb, sessionId: string): Promise<ConfirmResult> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.revelateurResults.findFirst({ where: eq(revelateurResults.sessionId, sessionId) });
    if (existing) return { ok: true as const, result: existing.snapshot };

    const rows = await tx
      .select({ questionId: revelateurAnswers.questionId, value: revelateurAnswers.rawValue })
      .from(revelateurAnswers)
      .where(eq(revelateurAnswers.sessionId, sessionId));
    const check = validateAnswers(rows);
    if (check.status === "INCOMPLETE") return { ok: false as const, error: "Il manque des réponses." };
    if (check.status === "INVALID") {
      await tx.update(revelateurSessions).set({ status: "invalid" }).where(eq(revelateurSessions.id, sessionId));
      return { ok: false as const, error: "Les réponses enregistrées sont incohérentes." };
    }

    const [frozen] = await tx
      .update(revelateurSessions)
      .set({ status: "complete", confirmedAt: new Date(), lastActivityAt: new Date() })
      .where(and(eq(revelateurSessions.id, sessionId), eq(revelateurSessions.status, "in_progress")))
      .returning({ id: revelateurSessions.id });
    if (!frozen) {
      // A simultaneous confirmation (double click) froze it first: once that one has committed,
      // its result is the result — answer with it instead of an error.
      const done = await tx.query.revelateurResults.findFirst({ where: eq(revelateurResults.sessionId, sessionId) });
      return done ? { ok: true as const, result: done.snapshot } : { ok: false as const, error: "Cette passation n'est plus modifiable." };
    }

    const result = scoreAnswers(check.answers);
    const session = await tx.query.revelateurSessions.findFirst({ where: eq(revelateurSessions.id, sessionId) });
    const interpretation = interpret(check.answers, result, session?.openAnswer ?? null);
    await tx
      .insert(revelateurResults)
      .values({
        sessionId,
        questionnaireVersion: result.questionnaireVersion,
        scoringEngineVersion: SCORING_ENGINE_VERSION,
        snapshot: result,
        interpretationEngineVersion: interpretation.meta.interpretationEngineVersion,
        interpretation,
      })
      .onConflictDoNothing({ target: revelateurResults.sessionId });
    return { ok: true as const, result };
  });
}

/** Scheduled clean-up: unfinished passations are deleted (with their answers) 30 days after the last activity. */
export async function deleteExpiredSessions(db: AnyDb, now = new Date()) {
  const rows = await db
    .delete(revelateurSessions)
    .where(and(eq(revelateurSessions.status, "in_progress"), lt(revelateurSessions.lastActivityAt, new Date(now.getTime() - RESUME_DAYS * DAY))))
    .returning({ id: revelateurSessions.id });
  return rows.length;
}

export const isUserError = (e: unknown) => e instanceof UserError;
