import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTestDb } from "../db/test-db";
import { revelateurAnswers, revelateurResults, revelateurSessions } from "../db/schema";
import { QUESTION_IDS } from "@/lib/revelateur/scoring";
import {
  RESUME_DAYS,
  confirmSession,
  createSession,
  deleteExpiredSessions,
  findSession,
  move,
  saveAnswer,
  saveOpenAnswer,
  screenFor,
  type SessionRow,
} from "./session";

describe("Révélateur passation", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  before(async () => {
    t = await createTestDb();
  });
  after(() => t.close());

  const reload = async (s: SessionRow) => (await t.db.query.revelateurSessions.findFirst({ where: eq(revelateurSessions.id, s.id) }))!;

  /** Answers every statement with the given value, following the journey. */
  async function answerAll(s: SessionRow, value = 4) {
    let cur = await move(t.db, s, { to: "start" });
    for (let i = 0; i < 30; i++) {
      cur = await saveAnswer(t.db, cur, QUESTION_IDS[i], value);
      cur = await move(t.db, cur, { to: "next" });
    }
    return cur;
  }

  it("stores only a hash of the token and finds the session from it", async () => {
    const { token, session } = await createSession(t.db);
    assert.notEqual(session.tokenHash, token);
    assert.equal((await findSession(t.db, token))?.id, session.id);
    assert.equal(await findSession(t.db, token.slice(0, -2) + "xx"), null);
    assert.equal(await findSession(t.db, undefined), null);
  });

  it("starts on the welcome screen and shows one statement at a time", async () => {
    const { session } = await createSession(t.db);
    assert.deepEqual(await screenFor(t.db, session), { kind: "welcome" });
    const s = await move(t.db, session, { to: "start" });
    const screen = await screenFor(t.db, s);
    assert.equal(screen.kind, "question");
    assert.ok(screen.kind === "question" && screen.id === "Q01" && screen.value === null && screen.text.length > 10);
  });

  it("does not move on after a choice; next is refused until the statement is answered", async () => {
    const { session } = await createSession(t.db);
    let s = await move(t.db, session, { to: "start" });
    await assert.rejects(move(t.db, s, { to: "next" }), /Choisissez une réponse/);
    s = await saveAnswer(t.db, s, "Q01", 3);
    assert.equal(s.questionIndex, 0, "still on Q01 after answering");
    s = await move(t.db, s, { to: "next" });
    assert.equal(s.questionIndex, 1);
  });

  it("going back keeps the answer; changing it replaces it (one answer per question)", async () => {
    const { session } = await createSession(t.db);
    let s = await move(t.db, session, { to: "start" });
    s = await saveAnswer(t.db, s, "Q01", 2);
    s = await move(t.db, s, { to: "next" });
    s = await move(t.db, s, { to: "previous" });
    const back = await screenFor(t.db, s);
    assert.ok(back.kind === "question" && back.value === 2);
    s = await saveAnswer(t.db, s, "Q01", 5);
    const rows = await t.db.select().from(revelateurAnswers).where(eq(revelateurAnswers.sessionId, s.id));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].rawValue, 5);
  });

  it("rejects an answer to a statement that is not on screen, or out of range", async () => {
    const { session } = await createSession(t.db);
    const s = await move(t.db, session, { to: "start" });
    await assert.rejects(saveAnswer(t.db, s, "Q05", 3), /pas celle affichée/);
    for (const bad of [0, 6, 2.5, "3", null]) await assert.rejects(saveAnswer(t.db, s, "Q01", bad), /invalide/);
  });

  it("cannot jump ahead past unanswered statements", async () => {
    const { session } = await createSession(t.db);
    const s = await move(t.db, session, { to: "start" });
    await assert.rejects(move(t.db, s, { to: "question", index: 5 }), /précédentes/);
    await assert.rejects(move(t.db, s, { to: "recap" }), /manque/);
  });

  it("full journey: 30 answers → open question → summary → confirm → frozen, scored once", async () => {
    const { session } = await createSession(t.db);
    let s = await answerAll(session, 4);
    assert.equal(s.step, "open");
    s = await saveOpenAnswer(t.db, s, "  Mieux présenter ce que j'apporte.  ");
    assert.equal(s.openAnswer, "Mieux présenter ce que j'apporte.");
    s = await move(t.db, s, { to: "next" });
    const recap = await screenFor(t.db, s);
    assert.ok(recap.kind === "recap" && recap.items.length === 30 && recap.items[0].label === "Plutôt vrai");
    // the summary carries no statement wording
    assert.equal(JSON.stringify(recap).includes("Je suis capable"), false);

    const [a, b] = await Promise.all([confirmSession(t.db, s.id), confirmSession(t.db, s.id)]);
    assert.ok(a.ok && b.ok);
    assert.deepEqual(a.result, b.result);
    const results = await t.db.select().from(revelateurResults).where(eq(revelateurResults.sessionId, s.id));
    assert.equal(results.length, 1, "one result even with a double confirmation");
    // all answers 4: reversed items correct to 2 → each total 4*5+2 = 22 → 66,67; all ≥ 60 and equal → profile 06
    assert.equal(results[0].snapshot.configuration.code, "VALUE_EMBODIED");

    const frozen = await reload(s);
    assert.equal(frozen.status, "complete");
    assert.ok(frozen.confirmedAt);
    await assert.rejects(saveAnswer(t.db, frozen, "Q01", 1), /confirmées/);
    await assert.rejects(move(t.db, frozen, { to: "previous" }), /confirmées/);
    assert.deepEqual(await screenFor(t.db, frozen), { kind: "complete" });
  });

  it("an incomplete session (29 answers) never produces a result", async () => {
    const { session } = await createSession(t.db);
    let s = await move(t.db, session, { to: "start" });
    for (let i = 0; i < 29; i++) {
      s = await saveAnswer(t.db, s, QUESTION_IDS[i], 3);
      s = await move(t.db, s, { to: "next" });
    }
    const r = await confirmSession(t.db, s.id);
    assert.equal(r.ok, false);
    assert.equal((await t.db.select().from(revelateurResults).where(eq(revelateurResults.sessionId, s.id))).length, 0);
    assert.equal((await reload(s)).status, "in_progress");
  });

  it("resume lasts 30 days after the last activity; expired unfinished sessions are deleted", async () => {
    const { token, session } = await createSession(t.db);
    const old = new Date(Date.now() - (RESUME_DAYS + 1) * 86_400_000);
    await t.db.update(revelateurSessions).set({ lastActivityAt: old }).where(eq(revelateurSessions.id, session.id));
    assert.equal(await findSession(t.db, token), null);
    assert.ok((await findSession(t.db, token, new Date(old.getTime() + 86_400_000)))?.id);

    const done = await answerAll((await createSession(t.db)).session);
    await move(t.db, done, { to: "next" });
    await confirmSession(t.db, done.id);
    await t.db.update(revelateurSessions).set({ lastActivityAt: old }).where(eq(revelateurSessions.id, done.id));

    const deleted = await deleteExpiredSessions(t.db);
    assert.ok(deleted >= 1);
    assert.equal(await t.db.query.revelateurSessions.findFirst({ where: eq(revelateurSessions.id, session.id) }), undefined);
    assert.ok(await t.db.query.revelateurSessions.findFirst({ where: eq(revelateurSessions.id, done.id) }), "confirmed sessions are not removed by this job");
  });
});
