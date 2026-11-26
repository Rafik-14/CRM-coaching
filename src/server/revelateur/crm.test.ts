import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTestDb } from "../db/test-db";
import { coachingSessions, contacts, revelateurEvents, revelateurSessions } from "../db/schema";
import { QUESTION_IDS } from "@/lib/revelateur/scoring";
import { DISCOVERY_TYPE } from "@/lib/validations/coaching";
import { configurationDistribution, counters, logEvent, normalisePhone, onDiscoveryBooked, openCallbacks, participantFile, requestCallback, searchParticipants, setCallbackStatus } from "./crm";
import { requestDelivery } from "./delivery";
import { confirmSession, createSession, move, saveAnswer } from "./session";

describe("Révélateur CRM (annexe 07)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  before(async () => {
    t = await createTestDb();
  });
  after(() => t.close());

  async function completed(value = 4) {
    const { session } = await createSession(t.db);
    let cur = await move(t.db, session, { to: "start" });
    for (let i = 0; i < 30; i++) {
      cur = await saveAnswer(t.db, cur, QUESTION_IDS[i], value);
      cur = await move(t.db, cur, { to: "next" });
    }
    await move(t.db, cur, { to: "next" });
    assert.ok((await confirmSession(t.db, session.id)).ok);
    return session.id;
  }
  async function bookCall(email: string, startsAt: Date) {
    const [c] = await t.db.insert(contacts).values({ firstName: "X", email }).returning();
    const [s] = await t.db.insert(coachingSessions).values({ contactId: c.id, startsAt, type: DISCOVERY_TYPE, status: "planned", bookedVia: "online" }).returning();
    return s.id;
  }

  it("validates French and Swiss phone numbers only", () => {
    assert.equal(normalisePhone("06 12 34 56 78"), "0612345678");
    assert.equal(normalisePhone("+41 79 123 45 67"), "+41791234567");
    assert.equal(normalisePhone("0033 6 12 34 56 78"), "+33612345678");
    assert.throws(() => normalisePhone("12345"));
    assert.throws(() => normalisePhone("+44 7911 123456"));
  });

  it("counts sessions, not people; incomplete sessions never count", async () => {
    const before = (await counters(t.db)).tests;
    const a = await completed();
    const b = await completed();
    await createSession(t.db); // started, never finished
    await requestDelivery(t.db, a, { email: "same@exemple.fr", firstName: "Léa" });
    await requestDelivery(t.db, b, { email: "SAME@exemple.fr", firstName: "Léa" });
    assert.equal((await counters(t.db)).tests, before + 2);
    const found = await searchParticipants(t.db, "same@");
    assert.equal(found.length, 1, "same normalised address = same participant");
    assert.equal(found[0].sessions, 2, "both sessions kept, none overwritten");
  });

  it("never merges two people sharing a first name", async () => {
    const a = await completed();
    const b = await completed();
    await requestDelivery(t.db, a, { email: "camille.a@exemple.fr", firstName: "Camille" });
    await requestDelivery(t.db, b, { email: "camille.b@exemple.fr", firstName: "Camille" });
    assert.equal((await searchParticipants(t.db, "camille")).length, 2);
  });

  it("a callback exists only on explicit request, and leaves the counter once closed or converted", async () => {
    const id = await completed();
    const { participantId } = await requestDelivery(t.db, id, { email: "rappel@exemple.fr", firstName: "Noé" });
    const n0 = (await counters(t.db)).callbacks;
    const cb = await requestCallback(t.db, { sessionId: id, participantId, phone: "06 11 22 33 44" });
    await requestCallback(t.db, { sessionId: id, participantId, phone: "06 11 22 33 55" }); // same session: no duplicate
    assert.equal((await counters(t.db)).callbacks, n0 + 1);
    assert.equal((await openCallbacks(t.db)).find((c) => c.id === cb.id)?.phone, "0611223355");

    await setCallbackStatus(t.db, cb.id, "in_progress", null);
    assert.equal((await counters(t.db)).callbacks, n0 + 1, "in progress stays counted");
    await setCallbackStatus(t.db, cb.id, "completed", "Message laissé");
    assert.equal((await counters(t.db)).callbacks, n0, "completed leaves the counter");
    assert.equal(await setCallbackStatus(t.db, cb.id, "cancelled", null), null, "a closed request cannot be reopened");
  });

  it("a booked call converts the open callback; only confirmed future calls are counted", async () => {
    const id = await completed();
    const { participantId } = await requestDelivery(t.db, id, { email: "rdv@exemple.fr", firstName: "Inès" });
    await requestCallback(t.db, { sessionId: id, participantId, phone: "0612345678" });
    const c0 = await counters(t.db);
    const future = await bookCall("Rdv@Exemple.fr", new Date(Date.now() + 3 * 86_400_000));
    await onDiscoveryBooked(t.db, "Rdv@Exemple.fr", future);
    await onDiscoveryBooked(t.db, "Rdv@Exemple.fr", future); // repeated event: idempotent
    const c1 = await counters(t.db);
    assert.equal(c1.callbacks, c0.callbacks - 1, "converted callback leaves the counter");
    assert.equal(c1.calls, c0.calls + 1);
    const file = await participantFile(t.db, participantId);
    assert.equal(file!.callbacks[0].status, "converted");
    assert.equal(file!.events.filter((e) => e.type === "APPOINTMENT_BOOKED").length, 1);

    await t.db.update(coachingSessions).set({ status: "cancelled" }).where(eq(coachingSessions.id, future));
    assert.equal((await counters(t.db)).calls, c0.calls, "a cancelled call is no longer counted");
    const past = await bookCall("rdv@exemple.fr", new Date(Date.now() - 86_400_000));
    void past;
    assert.equal((await counters(t.db)).calls, c0.calls, "a past call is not counted");
  });

  it("someone who only took the test is never a prospect to call", async () => {
    const id = await completed();
    const { participantId } = await requestDelivery(t.db, id, { email: "silence@exemple.fr", firstName: null });
    const f = await participantFile(t.db, participantId);
    assert.equal(f!.callbacks.length, 0);
    assert.equal(f!.consents.length, 0);
  });

  it("events are idempotent", async () => {
    const id = await completed();
    await logEvent(t.db, { type: "TEST_COMPLETED", key: `TEST_COMPLETED:${id}`, sessionId: id });
    await logEvent(t.db, { type: "TEST_COMPLETED", key: `TEST_COMPLETED:${id}`, sessionId: id });
    assert.equal((await t.db.select().from(revelateurEvents).where(eq(revelateurEvents.sessionId, id))).length, 1);
  });

  it("each complete session falls in exactly one of the five configuration categories", async () => {
    const dist = await configurationDistribution(t.db);
    assert.equal(dist.length, 5);
    const [{ n }] = [{ n: (await t.db.select().from(revelateurSessions).where(eq(revelateurSessions.status, "complete"))).length }];
    assert.equal(dist.reduce((s, d) => s + d.n, 0), n);
  });
});
