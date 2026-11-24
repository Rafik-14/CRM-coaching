"use server";

import { cookies } from "next/headers";
import { DIMENSIONS, QUESTION_DIMENSIONS, QUESTION_IDS } from "@/lib/revelateur/scoring";
import { db } from "@/server/db";
import { clientIp, rateLimited } from "@/server/rate-limit";
import { revelateurEnabled } from "@/server/revelateur/flag";
import {
  RESUME_DAYS,
  confirmSession,
  createSession,
  findSession,
  isUserError,
  move,
  saveAnswer,
  saveOpenAnswer,
  screenFor,
  type Move,
  type Screen,
  type SessionRow,
  UserError,
} from "@/server/revelateur/session";

/**
 * Server actions of the Révélateur page. The browser only ever sends the person's choices;
 * the server holds the state and answers with the next screen to show (one statement at a time).
 */

const COOKIE = "jg_revelateur";

export type RevelateurState = { screen: Screen; error?: string };

/**
 * Set once, when a passation starts. Setting a cookie in a server action makes Next.js re-render the
 * page, so it is not refreshed on every answer: the cookie simply lives longer than the resume period
 * and the server enforces the 30 days since the last activity (findSession).
 */
async function setCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/revelateur",
    maxAge: 3 * RESUME_DAYS * 86_400,
  });
}

async function current(): Promise<SessionRow | null> {
  if (!revelateurEnabled()) throw new Error("Indisponible.");
  return findSession(db, (await cookies()).get(COOKIE)?.value);
}

async function withSession(run: (s: SessionRow) => Promise<SessionRow | void>): Promise<RevelateurState> {
  const session = await current();
  if (!session) return { screen: { kind: "welcome" }, error: "Votre session a expiré. Vous pouvez recommencer l'expérience." };
  try {
    const next = (await run(session)) ?? session;
    return { screen: await screenFor(db, next) };
  } catch (e) {
    const fresh = (await findSession(db, (await cookies()).get(COOKIE)?.value)) ?? session;
    if (!isUserError(e)) console.error("[revelateur] action failed", e instanceof Error ? e.name : "unknown");
    return { screen: await screenFor(db, fresh), error: isUserError(e) ? (e as Error).message : "Une erreur est survenue. Réessayez." };
  }
}

/** Resumes the passation of this device, or starts a new one. */
export async function startRevelateur(): Promise<RevelateurState> {
  const existing = await current();
  if (existing && existing.status === "in_progress") return { screen: await screenFor(db, existing) };
  if (rateLimited(`revelateur:start:${await clientIp()}`, 30, 60 * 60_000)) {
    return { screen: { kind: "welcome" }, error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }
  const { token, session } = await createSession(db);
  await setCookie(token);
  return { screen: await screenFor(db, session) };
}

/** After a confirmed passation: start a brand-new one (a new session, the previous one is untouched). */
export async function restartRevelateur(): Promise<RevelateurState> {
  if (!revelateurEnabled()) throw new Error("Indisponible.");
  if (rateLimited(`revelateur:start:${await clientIp()}`, 30, 60 * 60_000)) {
    return { screen: { kind: "complete" }, error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }
  const { token, session } = await createSession(db);
  await setCookie(token);
  return { screen: await screenFor(db, session) };
}

export async function answerRevelateur(questionId: string, value: number): Promise<RevelateurState> {
  if (rateLimited(`revelateur:answer:${await clientIp()}`, 240, 60_000)) {
    return withSession(async () => {
      throw new UserError("Trop de réponses en peu de temps. Patientez un instant.");
    });
  }
  return withSession((s) => saveAnswer(db, s, questionId, value));
}

export async function moveRevelateur(m: Move): Promise<RevelateurState> {
  // « Commencer » after the session expired (or the cookie was cleared): open a new one first.
  if (m?.to === "start" && !(await current())) {
    const opened = await startRevelateur();
    if (opened.error) return opened;
  }
  return withSession((s) => move(db, s, m));
}

export async function saveOpenAndContinue(text: string, direction: "next" | "previous"): Promise<RevelateurState> {
  return withSession(async (s) => {
    const saved = await saveOpenAnswer(db, s, text);
    return move(db, saved, { to: direction });
  });
}

/**
 * After confirmation the answers are frozen; `axes` gives, for each statement in order (Q01 → Q30),
 * the axis (0–4) its summary row flies to in the preparation animation. Sent only once confirmed.
 */
export type ConfirmState = { ok: true; axes: number[] } | { ok: false; error: string };

/** Explicit, final confirmation (v2.0 §2 step 7). Idempotent: a double click gives one result. */
export async function confirmRevelateur(): Promise<ConfirmState> {
  const session = await current();
  if (!session) return { ok: false, error: "Votre session a expiré." };
  const r = await confirmSession(db, session.id);
  return r.ok ? { ok: true, axes: QUESTION_IDS.map((id) => DIMENSIONS.indexOf(QUESTION_DIMENSIONS[id])) } : { ok: false, error: r.error };
}
