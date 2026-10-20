import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTestDb } from "./db/test-db";
import { contacts, scheduledEmails } from "./db/schema";
import { MAX_ATTEMPTS, releaseStuckEmails, scheduleEmail, sendDueEmails, type DeliveryResult } from "./scheduled-emails";

const NOW = new Date("2026-10-15T08:00:00.000Z");
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

describe("scheduled e-mails (sequences)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let contactId: string;

  before(async () => {
    t = await createTestDb();
    [{ id: contactId }] = await t.db.insert(contacts).values({ firstName: "Claire", email: "claire@example.test" }).returning({ id: contacts.id });
  });
  after(() => t.close());
  beforeEach(() => t.db.delete(scheduledEmails));

  const schedule = (dedupeKey: string, sendAt = NOW, templateKey = "welcome_client") =>
    scheduleEmail(t.db, { contactId, templateKey, sendAt, dedupeKey });

  async function run(now = NOW, result: DeliveryResult = { status: "sent" }) {
    const delivered: string[] = [];
    const counts = await sendDueEmails(t.db, now, async (email) => {
      delivered.push(email.dedupeKey);
      return result;
    });
    return { ...counts, delivered };
  }

  it("one event schedules an e-mail only once (contact moved to « Client » twice)", async () => {
    assert.equal(await schedule(`welcome_client:${contactId}`), true);
    assert.equal(await schedule(`welcome_client:${contactId}`), false);
    assert.equal((await t.db.select().from(scheduledEmails)).length, 1);
  });

  it("sends a due e-mail once, even when the job runs twice", async () => {
    await schedule("a");
    assert.deepEqual((await run()).delivered, ["a"]);
    assert.deepEqual((await run()).delivered, []);
    const [row] = await t.db.select().from(scheduledEmails);
    assert.equal(row.status, "sent");
    assert.equal(row.sentAt?.toISOString(), NOW.toISOString());
  });

  it("never sends twice when two runs overlap", async () => {
    await schedule("a");
    await schedule("b");
    const [x, y] = await Promise.all([run(), run()]);
    assert.deepEqual([...x.delivered, ...y.delivered].sort(), ["a", "b"]);
  });

  it("waits until the e-mail is due", async () => {
    await schedule("tomorrow", later(24 * 60), "discovery_follow_up");
    assert.deepEqual((await run()).delivered, []);
    assert.deepEqual((await run(later(24 * 60))).delivered, ["tomorrow"]);
  });

  it("records why an e-mail was skipped (e.g. became a client meanwhile)", async () => {
    await schedule("a");
    await run(NOW, { status: "skipped", reason: "Devenue cliente entre-temps" });
    const [row] = await t.db.select().from(scheduledEmails);
    assert.equal(row.status, "skipped");
    assert.equal(row.note, "Devenue cliente entre-temps");
    assert.deepEqual((await run(later(60))).delivered, []);
  });

  it("retries a failed send later, then gives up after the last attempt", async () => {
    await schedule("a");
    let now = NOW;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const r = await run(now, { status: "failed", reason: "SMTP indisponible" });
      assert.equal(r.delivered.length, 1, `attempt ${attempt}`);
      now = later(attempt * 20);
    }
    const [row] = await t.db.select().from(scheduledEmails);
    assert.equal(row.status, "failed");
    assert.equal(row.attempts, MAX_ATTEMPTS);
    assert.deepEqual((await run(later(500))).delivered, []);
  });

  it("puts back in the queue an e-mail left « sending » by a stopped server", async () => {
    await schedule("a");
    await t.db.update(scheduledEmails).set({ status: "sending", claimedAt: NOW }).where(eq(scheduledEmails.dedupeKey, "a"));
    assert.equal(await releaseStuckEmails(t.db, later(10)), 0);
    assert.equal(await releaseStuckEmails(t.db, later(31)), 1);
    assert.deepEqual((await run(later(32))).delivered, ["a"]);
  });
});
