import { createHash, createHmac, randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { accessTokens } from "@/server/db/schema";
import type { AnyDb } from "@/server/db/types";

/**
 * Private links without login (§3 of PHASE-2-PLAN): /rdv/<token>, /api/agenda/<token>.ics, /reserver?c=<token>.
 * The database keeps only SHA-256(token). The token is HMAC(server secret, purpose + row id): the CRM can show
 * a link again, a copy of the database alone opens nothing, and « Régénérer » revokes the row.
 * No "server-only" import here so the tests can run it against PGlite; only server code imports it.
 */
export type TokenPurpose = "manage" | "calendar_feed" | "client_booking";
export type AccessToken = typeof accessTokens.$inferSelect;

/** Booking links stay valid until 30 days after the appointment. */
export const MANAGE_LINK_DAYS = 30;

function secret() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET manquant");
  return s;
}

export const tokenFor = (row: Pick<AccessToken, "id" | "purpose">) =>
  createHmac("sha256", secret()).update(`access:${row.purpose}:${row.id}`).digest("base64url");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** 32 bytes in base64url = 43 characters. Anything else is rejected before touching the database. */
export const looksLikeToken = (token: string | null | undefined): token is string =>
  !!token && /^[A-Za-z0-9_-]{43}$/.test(token);

export async function issueToken(
  db: AnyDb,
  input: { purpose: TokenPurpose; sessionId?: string | null; contactId?: string | null; expiresAt?: Date | null },
) {
  const id = randomUUID();
  const token = tokenFor({ id, purpose: input.purpose });
  const [row] = await db
    .insert(accessTokens)
    .values({
      id,
      purpose: input.purpose,
      tokenHash: hashToken(token),
      sessionId: input.sessionId ?? null,
      contactId: input.contactId ?? null,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();
  return { token, row };
}

const usable = (now: Date) =>
  and(isNull(accessTokens.revokedAt), or(isNull(accessTokens.expiresAt), gt(accessTokens.expiresAt, now)));

/** The valid (not revoked, not expired) row for a token of this purpose, or null. */
export async function findToken(db: AnyDb, purpose: TokenPurpose, token: string | null | undefined, now = new Date()) {
  if (!looksLikeToken(token)) return null;
  const [row] = await db
    .select()
    .from(accessTokens)
    .where(and(eq(accessTokens.tokenHash, hashToken(token)), eq(accessTokens.purpose, purpose), usable(now)))
    .limit(1);
  return row ?? null;
}

/** Revokes every live token of this purpose for the owner (calendar feed: no owner). */
export async function revokeTokens(db: AnyDb, purpose: TokenPurpose, owner: { contactId?: string; sessionId?: string } = {}, now = new Date()) {
  await db
    .update(accessTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(accessTokens.purpose, purpose),
        isNull(accessTokens.revokedAt),
        owner.contactId ? eq(accessTokens.contactId, owner.contactId) : undefined,
        owner.sessionId ? eq(accessTokens.sessionId, owner.sessionId) : undefined,
      ),
    );
}

/** Latest live token of this purpose for the owner, or null. */
export async function currentToken(db: AnyDb, purpose: TokenPurpose, owner: { contactId?: string; sessionId?: string } = {}, now = new Date()) {
  const [row] = await db
    .select()
    .from(accessTokens)
    .where(
      and(
        eq(accessTokens.purpose, purpose),
        usable(now),
        owner.contactId ? eq(accessTokens.contactId, owner.contactId) : undefined,
        owner.sessionId ? eq(accessTokens.sessionId, owner.sessionId) : undefined,
      ),
    )
    .orderBy(desc(accessTokens.createdAt))
    .limit(1);
  return row ? { token: tokenFor(row), row } : null;
}

const manageExpiry = (startsAt: Date) => new Date(startsAt.getTime() + MANAGE_LINK_DAYS * 86_400_000);

/** The « gérer mon rendez-vous » token of a session: the same link in every e-mail about it. */
export async function manageToken(db: AnyDb, sessionId: string, startsAt: Date, now = new Date()) {
  const existing = await currentToken(db, "manage", { sessionId }, now);
  if (existing) {
    if ((existing.row.expiresAt?.getTime() ?? 0) < manageExpiry(startsAt).getTime()) {
      await db.update(accessTokens).set({ expiresAt: manageExpiry(startsAt) }).where(eq(accessTokens.id, existing.row.id));
    }
    return existing.token;
  }
  return (await issueToken(db, { purpose: "manage", sessionId, expiresAt: manageExpiry(startsAt) })).token;
}

/** A session moved: its links stay valid until 30 days after the new date. */
export async function extendManageTokens(db: AnyDb, sessionId: string, startsAt: Date) {
  await db
    .update(accessTokens)
    .set({ expiresAt: manageExpiry(startsAt) })
    .where(and(eq(accessTokens.purpose, "manage"), eq(accessTokens.sessionId, sessionId), isNull(accessTokens.revokedAt)));
}
