import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTestDb } from "./db/test-db";
import { contacts, intakeResponses } from "./db/schema";
import { findQuestionnaire, questionnaireToken, submitAnswers } from "./questionnaire-links";

// The token secret is read when a token is made, not at import time.
process.env.BETTER_AUTH_SECRET ??= "test-secret-for-unit-tests-only-0123456789";

const NOW = new Date("2026-10-15T08:00:00.000Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const answers = [{ id: "motivation", label: "Ce qui vous amène", type: "long" as const, value: "Changer de poste" }];

describe("questionnaire links", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let contactId: string;

  before(async () => {
    t = await createTestDb();
    [{ id: contactId }] = await t.db.insert(contacts).values({ firstName: "Claire" }).returning({ id: contacts.id });
  });
  after(() => t.close());

  it("sending twice gives the same open link (no duplicate questionnaires)", async () => {
    const a = await questionnaireToken(t.db, contactId, NOW);
    const b = await questionnaireToken(t.db, contactId, days(1));
    assert.equal(a, b);
    assert.equal((await t.db.select().from(intakeResponses).where(eq(intakeResponses.contactId, contactId))).length, 1);
  });

  it("answers are saved once; a second submission changes nothing", async () => {
    const token = await questionnaireToken(t.db, contactId, NOW);
    const found = await findQuestionnaire(t.db, token, days(1));
    assert.ok(found && !found.submitted);
    assert.ok(await submitAnswers(t.db, found.response.id, answers, days(1)));
    assert.equal(await submitAnswers(t.db, found.response.id, [], days(2)), null);
    const again = await findQuestionnaire(t.db, token, days(2));
    assert.equal(again?.submitted, true);
    assert.deepEqual(again?.response.answers, answers);
  });

  it("after an answered questionnaire, sending again creates a new link", async () => {
    const first = await questionnaireToken(t.db, contactId, days(3));
    const found = await findQuestionnaire(t.db, first, days(3));
    assert.equal(found?.submitted, false); // the previous one was answered, so this is a fresh link
  });

  it("a link stops working after 30 days, and a new one is issued", async () => {
    const token = await questionnaireToken(t.db, contactId, days(3));
    assert.equal(await findQuestionnaire(t.db, token, days(34)), null);
    const fresh = await questionnaireToken(t.db, contactId, days(34));
    assert.notEqual(fresh, token);
    assert.ok(await findQuestionnaire(t.db, fresh, days(35)));
  });

  it("an unknown or malformed link finds nothing", async () => {
    assert.equal(await findQuestionnaire(t.db, "nope", NOW), null);
    assert.equal(await findQuestionnaire(t.db, "A".repeat(43), NOW), null);
  });
});
