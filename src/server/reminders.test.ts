import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTestDb } from "./db/test-db";
import { accessTokens, coachingSessions, contacts } from "./db/schema";
import { sendSessionReminders } from "./reminders";
import { findToken, hashToken } from "./access-tokens";

// The token secret is read when a token is made, not at import time.
process.env.BETTER_AUTH_SECRET ??= "test-secret-for-unit-tests-only-0123456789";

const H = 3_600_000;
const NOW = new Date("2026-10-15T08:00:00.000Z");
const at = (hoursFromNow: number) => new Date(NOW.getTime() + hoursFromNow * H);

describe("sendSessionReminders", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let withEmail: string;
  let noEmail: string;

  before(async () => {
    t = await createTestDb();
    [{ id: withEmail }, { id: noEmail }] = await t.db
      .insert(contacts)
      .values([
        { firstName: "Claire", email: "claire@example.test" },
        { firstName: "Marc", email: null },
      ])
      .returning({ id: contacts.id });
  });
  after(() => t.close());
  beforeEach(() => t.db.delete(coachingSessions));

  async function session(values: Partial<typeof coachingSessions.$inferInsert> & { startsAt: Date }) {
    const [row] = await t.db
      .insert(coachingSessions)
      .values({ contactId: withEmail, createdAt: at(-72), ...values })
      .returning({ id: coachingSessions.id });
    return row.id;
  }

  /** Runs the job and records who would have received an e-mail. */
  async function run(kind: "24h" | "1h", now = NOW, ok = true) {
    const delivered: { sessionId: string; token: string }[] = [];
    const result = await sendSessionReminders(t.db, kind, now, async (r) => {
      delivered.push({ sessionId: r.sessionId, token: r.manageToken });
      return ok;
    });
    return { ...result, delivered };
  }

  it("sends the 24 h reminder once, even when the job runs twice", async () => {
    const id = await session({ startsAt: at(23) });
    const first = await run("24h");
    const second = await run("24h");
    assert.deepEqual(first.delivered.map((d) => d.sessionId), [id]);
    assert.equal(second.delivered.length, 0);
    const [row] = await t.db.select().from(coachingSessions).where(eq(coachingSessions.id, id));
    assert.equal(row.reminder24hSentAt?.toISOString(), NOW.toISOString());
    assert.equal(row.reminder1hSentAt, null);
  });

  it("never sends twice when two runs overlap", async () => {
    await session({ startsAt: at(22) });
    const [a, b] = await Promise.all([run("24h"), run("24h")]);
    assert.equal(a.delivered.length + b.delivered.length, 1);
  });

  it("sends the 1 h reminder once, independently of the 24 h one", async () => {
    const id = await session({ startsAt: at(0.75), reminder24hSentAt: at(-23) });
    assert.deepEqual((await run("1h")).delivered.map((d) => d.sessionId), [id]);
    assert.equal((await run("1h")).delivered.length, 0);
  });

  it("skips cancelled sessions, contacts without e-mail and sessions outside the window", async () => {
    await session({ startsAt: at(23), status: "cancelled" });
    await session({ startsAt: at(23), contactId: noEmail });
    await session({ startsAt: at(26) });
    await session({ startsAt: at(19) });
    await session({ startsAt: at(0.1) });
    assert.equal((await run("24h")).delivered.length, 0);
    assert.equal((await run("1h")).delivered.length, 0);
  });

  it("skips the reminder when the session was booked shortly before (confirmation still fresh)", async () => {
    await session({ startsAt: at(23), createdAt: at(-0.5) }); // booked 23 h 30 before: no « 24 h » reminder
    await session({ startsAt: at(0.75), createdAt: at(-1) }); // booked 1 h 45 before: no « 1 h » reminder
    assert.equal((await run("24h")).delivered.length, 0);
    assert.equal((await run("1h")).delivered.length, 0);
  });

  it("retries on the next run when sending failed", async () => {
    const id = await session({ startsAt: at(23) });
    const failed = await run("24h", NOW, false);
    assert.equal(failed.failed, 1);
    const later = new Date(NOW.getTime() + 5 * 60_000);
    assert.deepEqual((await run("24h", later)).delivered.map((d) => d.sessionId), [id]);
  });

  it("reminds again for the new date once a session is moved (flags cleared)", async () => {
    const id = await session({ startsAt: at(23) });
    await run("24h");
    await t.db
      .update(coachingSessions)
      .set({ startsAt: at(47), reminder24hSentAt: null, reminder1hSentAt: null })
      .where(eq(coachingSessions.id, id));
    assert.equal((await run("24h")).delivered.length, 0); // 47 h away: not yet
    assert.deepEqual((await run("24h", at(24))).delivered.map((d) => d.sessionId), [id]);
  });

  it("puts the same working « gérer mon rendez-vous » link in both reminders", async () => {
    const id = await session({ startsAt: at(23) });
    const day = await run("24h");
    const hour = await run("1h", at(22.5));
    assert.equal(day.delivered[0].token, hour.delivered[0].token);
    const row = await findToken(t.db, "manage", day.delivered[0].token, at(22.5));
    assert.equal(row?.sessionId, id);
    const stored = await t.db.select().from(accessTokens).where(eq(accessTokens.sessionId, id));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].tokenHash, hashToken(day.delivered[0].token));
    assert.notEqual(stored[0].tokenHash, day.delivered[0].token);
  });
});
