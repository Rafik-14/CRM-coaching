import { and, desc, eq, isNull } from "drizzle-orm";
import { accessTokens, intakeResponses } from "@/server/db/schema";
import type { AnyDb } from "@/server/db/types";
import { findToken, issueToken, tokenFor } from "@/server/access-tokens";
import type { Answer } from "@/lib/questionnaire";

/**
 * Questionnaire links (/questionnaire/<token>): valid 30 days, one submission each.
 * No "server-only" import: the tests run it against PGlite; only server code imports it.
 */
export const QUESTIONNAIRE_LINK_DAYS = 30;

/** The contact's current link (still valid, not answered yet), or a new one. */
export async function questionnaireToken(db: AnyDb, contactId: string, now = new Date()) {
  const [open] = await db
    .select({ token: accessTokens })
    .from(intakeResponses)
    .innerJoin(accessTokens, eq(accessTokens.id, intakeResponses.tokenId))
    .where(and(eq(intakeResponses.contactId, contactId), isNull(intakeResponses.submittedAt), isNull(accessTokens.revokedAt)))
    .orderBy(desc(intakeResponses.sentAt))
    .limit(1);
  if (open && open.token.expiresAt && open.token.expiresAt > now) return tokenFor(open.token);

  const { token, row } = await issueToken(db, {
    purpose: "questionnaire",
    contactId,
    expiresAt: new Date(now.getTime() + QUESTIONNAIRE_LINK_DAYS * 86_400_000),
  });
  await db.insert(intakeResponses).values({ contactId, tokenId: row.id, sentAt: now });
  return token;
}

/** The questionnaire behind a link: null when unknown or expired; `submitted` once answered. */
export async function findQuestionnaire(db: AnyDb, token: string, now = new Date()) {
  const row = await findToken(db, "questionnaire", token, now);
  if (!row) return null;
  const [response] = await db.select().from(intakeResponses).where(eq(intakeResponses.tokenId, row.id)).limit(1);
  return response ? { response, submitted: !!response.submittedAt } : null;
}

/** Saves the answers once: a second submission (double click, back button) changes nothing. */
export async function submitAnswers(db: AnyDb, responseId: string, answers: Answer[], now = new Date()) {
  const rows = await db
    .update(intakeResponses)
    .set({ answers, submittedAt: now, consentAt: now })
    .where(and(eq(intakeResponses.id, responseId), isNull(intakeResponses.submittedAt)))
    .returning({ id: intakeResponses.id, contactId: intakeResponses.contactId });
  return rows[0] ?? null;
}
