import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTestDb } from "../db/test-db";
import { revelateurDeliveries, revelateurResults } from "../db/schema";
import { QUESTION_IDS } from "@/lib/revelateur/scoring";
import {
  MAX_ATTEMPTS,
  MAX_VERIFY_SENDS,
  attemptDelivery,
  deliveryOf,
  dueDeliveries,
  maskEmail,
  normaliseEmail,
  releaseStuckDeliveries,
  requestDelivery,
  stateOf,
  verifyDelivery,
  type DeliveryDeps,
} from "./delivery";
import { confirmSession, createSession, move, saveAnswer } from "./session";

describe("Révélateur report delivery", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  before(async () => {
    t = await createTestDb();
  });
  after(() => t.close());

  async function confirmed() {
    const { session } = await createSession(t.db);
    let cur = await move(t.db, session, { to: "start" });
    for (let i = 0; i < 30; i++) {
      cur = await saveAnswer(t.db, cur, QUESTION_IDS[i], 4);
      cur = await move(t.db, cur, { to: "next" });
    }
    await move(t.db, cur, { to: "next" });
    const r = await confirmSession(t.db, session.id);
    assert.ok(r.ok);
    return session.id;
  }
  const pdf = Buffer.from("%PDF-1.4 test");
  const deps = (over: Partial<DeliveryDeps> = {}, sent: string[] = []): DeliveryDeps => ({
    buildPdf: async () => pdf,
    send: async (d) => (sent.push(d.email), { ok: true, id: null }),
    ...over,
  });

  it("stores the interpretation once, with the frozen result (versioned, traceable)", async () => {
    const id = await confirmed();
    const row = await t.db.query.revelateurResults.findFirst({ where: eq(revelateurResults.sessionId, id) });
    assert.ok(row?.interpretation);
    assert.equal(row.interpretationEngineVersion, row.interpretation.meta.interpretationEngineVersion);
    assert.equal(row.interpretation.qualityControl.status, "ok");
    assert.deepEqual(row.interpretation.configuration, row.snapshot.configuration);
  });

  it("validates and normalises the address; masks it for the screen", () => {
    assert.equal(normaliseEmail("  Jean.Dupont@Exemple.FR "), "jean.dupont@exemple.fr");
    assert.throws(() => normaliseEmail("pas-une-adresse"));
    assert.throws(() => normaliseEmail(""));
    assert.equal(maskEmail("jean@exemple.fr"), "j•••@exemple.fr");
  });

  it("asks the address only after confirmation", async () => {
    const { session } = await createSession(t.db);
    await assert.rejects(requestDelivery(t.db, session.id, { email: "a@b.fr", firstName: "" }), /Confirmez d'abord/);
  });

  it("confirms the address by a single-use link, then sends the PDF once", async () => {
    const id = await confirmed();
    const { token, delivery } = await requestDelivery(t.db, id, { email: "jean@exemple.fr", firstName: " Jean " });
    assert.equal(delivery.status, "awaiting_verification");
    assert.equal(delivery.firstName, "Jean");
    assert.notEqual(delivery.verifyTokenHash, token, "only a hash is stored");

    const v = await verifyDelivery(t.db, token);
    assert.ok(v.ok);
    assert.equal(v.delivery.status, "awaiting_report");
    const again = await verifyDelivery(t.db, token);
    assert.ok(again.ok && again.delivery.status === "awaiting_report", "a second click only shows the status");

    const sent: string[] = [];
    assert.equal(await attemptDelivery(t.db, v.delivery.id, deps({}, sent)), "sent");
    assert.equal(await attemptDelivery(t.db, v.delivery.id, deps({}, sent)), "skipped", "never sent twice");
    assert.deepEqual(sent, ["jean@exemple.fr"]);
    assert.equal(stateOf(await deliveryOf(t.db, id)).status, "sent");
    await assert.rejects(requestDelivery(t.db, id, { email: "autre@exemple.fr", firstName: "" }), /déjà confirmée/);
  });

  it("lets the person correct the address before confirming it (new link, old one dead)", async () => {
    const id = await confirmed();
    const first = await requestDelivery(t.db, id, { email: "erreur@exemple.fr", firstName: "" });
    const second = await requestDelivery(t.db, id, { email: "bon@exemple.fr", firstName: "" });
    assert.equal(second.delivery.email, "bon@exemple.fr");
    assert.deepEqual(await verifyDelivery(t.db, first.token), { ok: false, reason: "unknown" });
    assert.ok((await verifyDelivery(t.db, second.token)).ok);
  });

  it("limits the number of confirmation links", async () => {
    const id = await confirmed();
    for (let i = 0; i < MAX_VERIFY_SENDS; i++) await requestDelivery(t.db, id, { email: "x@exemple.fr", firstName: "" });
    await assert.rejects(requestDelivery(t.db, id, { email: "x@exemple.fr", firstName: "" }), /Trop d'envois/);
  });

  it("refuses an expired link", async () => {
    const id = await confirmed();
    const { token } = await requestDelivery(t.db, id, { email: "late@exemple.fr", firstName: "" }, new Date(Date.now() - 49 * 3_600_000));
    assert.deepEqual(await verifyDelivery(t.db, token), { ok: false, reason: "expired" });
  });

  it("waits while the report cannot be produced, then sends it", async () => {
    const id = await confirmed();
    const { token } = await requestDelivery(t.db, id, { email: "wait@exemple.fr", firstName: "" });
    const v = await verifyDelivery(t.db, token);
    assert.ok(v.ok);
    const now = new Date();
    assert.equal(await attemptDelivery(t.db, v.delivery.id, deps({ buildPdf: async () => null }), now), "no_report");
    const d = (await deliveryOf(t.db, id))!;
    assert.equal(d.status, "awaiting_report");
    assert.ok(d.nextAttemptAt! > now, "looked at again later");
    assert.ok((await dueDeliveries(t.db, new Date(now.getTime() + 16 * 60_000))).some((x) => x.id === d.id));
    assert.equal(await attemptDelivery(t.db, d.id, deps()), "sent");
  });

  it("retries a failed send with back-off, then gives up", async () => {
    const id = await confirmed();
    const { token } = await requestDelivery(t.db, id, { email: "fail@exemple.fr", firstName: "" });
    const v = await verifyDelivery(t.db, token);
    assert.ok(v.ok);
    const failing = deps({ send: async () => ({ ok: false, id: null, error: "SMTP down" }) });
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      assert.equal(await attemptDelivery(t.db, v.delivery.id, failing), "failed");
      const d = (await deliveryOf(t.db, id))!;
      assert.equal(d.attempts, i);
      if (i < MAX_ATTEMPTS) assert.ok(d.nextAttemptAt, "scheduled again");
    }
    const d = (await deliveryOf(t.db, id))!;
    assert.equal(d.nextAttemptAt, null);
    assert.deepEqual(stateOf(d), { status: "failed", email: "f•••@exemple.fr", givenUp: true });
  });

  it("puts back in the queue a delivery left « sending » by a stopped process", async () => {
    const id = await confirmed();
    const { token } = await requestDelivery(t.db, id, { email: "stuck@exemple.fr", firstName: "" });
    const v = await verifyDelivery(t.db, token);
    assert.ok(v.ok);
    // Simulate a crash mid-send: claimed 20 minutes ago, never finished.
    await t.db.update(revelateurDeliveries).set({ status: "sending", updatedAt: new Date(Date.now() - 20 * 60_000) }).where(eq(revelateurDeliveries.id, v.delivery.id));
    assert.equal((await deliveryOf(t.db, id))!.status, "sending");
    assert.equal(await releaseStuckDeliveries(t.db), 1);
    assert.equal((await deliveryOf(t.db, id))!.status, "failed");
  });
});
