import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTestDb } from "./db/test-db";
import { eventRegistrations, events } from "./db/schema";
import { cancelRegistration, claimEventReminders, claimEventThanks, refillFromWaitlist, registerForEvent, seatsTaken } from "./events";
import { canRegister, eventSlug, eventTimes, freeSeats } from "@/lib/events";

const H = 3_600_000;
const NOW = new Date("2026-11-02T09:00:00.000Z");
const at = (hours: number) => new Date(NOW.getTime() + hours * H);

describe("events · pure helpers", () => {
  it("builds a readable, unique-per-day address", () => {
    assert.equal(eventSlug("Conférence : Révéler sa valeur !", new Date("2026-11-12T18:00:00Z")), "conference-reveler-sa-valeur-2026-11-12");
    assert.equal(eventSlug("   ", new Date("2026-11-12T18:00:00Z")), "evenement-2026-11-12");
  });
  it("counts free seats and never goes below zero", () => {
    assert.equal(freeSeats(null, 50), null);
    assert.equal(freeSeats(10, 4), 6);
    assert.equal(freeSeats(10, 12), 0);
  });
  it("reads date and times in Paris time", () => {
    const { startsAt, endsAt } = eventTimes({ date: "2026-11-12", startTime: "18:30", endTime: "20:00" });
    assert.equal(startsAt.toISOString(), "2026-11-12T17:30:00.000Z");
    assert.equal(endsAt.toISOString(), "2026-11-12T19:00:00.000Z");
  });
  it("only opens registration for published, open, future events", () => {
    const base = { status: "published", registrationOpen: true, startsAt: at(24), manualHistory: false };
    assert.equal(canRegister(base, NOW), true);
    assert.equal(canRegister({ ...base, status: "draft" }, NOW), false);
    assert.equal(canRegister({ ...base, registrationOpen: false }, NOW), false);
    assert.equal(canRegister({ ...base, startsAt: at(-1) }, NOW), false);
    assert.equal(canRegister({ ...base, manualHistory: true }, NOW), false);
  });
});

describe("events · seats", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let eventId: string;

  before(async () => {
    t = await createTestDb();
  });
  after(() => t.close());
  beforeEach(async () => {
    await t.db.delete(events);
    const [ev] = await t.db
      .insert(events)
      .values({ slug: `test-${Math.random()}`, title: "Atelier test", startsAt: at(72), endsAt: at(74), capacity: 5, status: "published" })
      .returning({ id: events.id });
    eventId = ev.id;
  });

  const person = (email: string, seats = 1, source: "site" | "manual" = "site") => ({
    eventId,
    contactId: null,
    firstName: "Test",
    lastName: "Personne",
    email,
    phone: null,
    company: null,
    seats,
    source,
  });

  it("confirms while seats are left, then fills the waiting list", async () => {
    const a = await registerForEvent(t.db, person("a@test.fr", 3), NOW);
    const b = await registerForEvent(t.db, person("b@test.fr", 2), NOW);
    const c = await registerForEvent(t.db, person("c@test.fr", 1), NOW);
    assert.equal(a.ok && a.status, "confirmed");
    assert.equal(b.ok && b.status, "confirmed");
    assert.equal(c.ok && c.status, "waitlist");
    assert.equal(await seatsTaken(t.db, eventId), 5);
  });

  it("says « full » when the event has no waiting list", async () => {
    await t.db.update(events).set({ waitlistEnabled: false }).where(eq(events.id, eventId));
    await registerForEvent(t.db, person("a@test.fr", 5, "manual"), NOW);
    const r = await registerForEvent(t.db, person("b@test.fr", 1), NOW);
    assert.deepEqual(r, { ok: false, reason: "full" });
  });

  it("updates the booking when the same e-mail registers again (no duplicate)", async () => {
    await registerForEvent(t.db, person("a@test.fr", 1), NOW);
    const again = await registerForEvent(t.db, person("A@Test.fr", 2), NOW);
    assert.equal(again.ok && again.updated, true);
    const rows = await t.db.select().from(eventRegistrations).where(eq(eventRegistrations.eventId, eventId));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].seats, 2);
  });

  it("refuses too many seats per booking, closed and past events", async () => {
    assert.deepEqual(await registerForEvent(t.db, person("a@test.fr", 9), NOW), { ok: false, reason: "too_many" });
    await t.db.update(events).set({ registrationOpen: false }).where(eq(events.id, eventId));
    assert.deepEqual(await registerForEvent(t.db, person("a@test.fr"), NOW), { ok: false, reason: "closed" });
    await t.db.update(events).set({ registrationOpen: true, startsAt: at(-1) }).where(eq(events.id, eventId));
    assert.deepEqual(await registerForEvent(t.db, person("a@test.fr"), NOW), { ok: false, reason: "closed" });
  });

  it("lets the coach add someone even when it is full", async () => {
    await registerForEvent(t.db, person("a@test.fr", 5, "manual"), NOW);
    const r = await registerForEvent(t.db, person("b@test.fr", 1, "manual"), NOW);
    assert.equal(r.ok && r.status, "confirmed");
  });

  it("moves the waiting list up in order when someone cancels", async () => {
    const a = await registerForEvent(t.db, person("a@test.fr", 4), NOW);
    const w1 = await registerForEvent(t.db, person("w1@test.fr", 3), NOW); // waits
    const w2 = await registerForEvent(t.db, person("w2@test.fr", 1), NOW); // fits right away (1 seat left)
    assert.equal(w1.ok && w1.status, "waitlist");
    assert.equal(w2.ok && w2.status, "confirmed");
    assert.ok(a.ok);
    const { promoted } = await cancelRegistration(t.db, a.registration.id, NOW);
    assert.deepEqual(promoted.map((p) => p.email), ["w1@test.fr"]);
    assert.equal(await seatsTaken(t.db, eventId), 4);
  });

  it("cancelling twice changes nothing", async () => {
    const a = await registerForEvent(t.db, person("a@test.fr"), NOW);
    assert.ok(a.ok);
    assert.ok((await cancelRegistration(t.db, a.registration.id, NOW)).cancelled);
    assert.equal((await cancelRegistration(t.db, a.registration.id, NOW)).cancelled, null);
  });

  it("fills new seats from the waiting list when the capacity goes up", async () => {
    await registerForEvent(t.db, person("a@test.fr", 5, "manual"), NOW);
    await registerForEvent(t.db, person("w@test.fr", 2), NOW);
    await t.db.update(events).set({ capacity: 8 }).where(eq(events.id, eventId));
    const promoted = await refillFromWaitlist(t.db, eventId, NOW);
    assert.deepEqual(promoted.map((p) => p.email), ["w@test.fr"]);
  });

  it("claims each reminder once, only for confirmed people booked early enough", async () => {
    await t.db.update(events).set({ startsAt: at(24), endsAt: at(26) }).where(eq(events.id, eventId));
    await t.db.insert(eventRegistrations).values([
      { eventId, firstName: "Early", email: "early@test.fr", createdAt: at(-48) },
      { eventId, firstName: "Late", email: "late@test.fr", createdAt: at(-1) },
      { eventId, firstName: "Waiting", email: "wait@test.fr", status: "waitlist", createdAt: at(-48) },
    ]);
    const first = await claimEventReminders(t.db, NOW);
    assert.deepEqual(first.map((r) => r.email), ["early@test.fr"]);
    assert.equal((await claimEventReminders(t.db, NOW)).length, 0);
  });

  it("thanks only the people marked present, the day after", async () => {
    await t.db.update(events).set({ startsAt: at(-26), endsAt: at(-24) }).where(eq(events.id, eventId));
    await t.db.insert(eventRegistrations).values([
      { eventId, firstName: "Present", email: "present@test.fr", attended: true },
      { eventId, firstName: "Absent", email: "absent@test.fr" },
    ]);
    const claimed = await claimEventThanks(t.db, NOW);
    assert.deepEqual(claimed.map((r) => r.email), ["present@test.fr"]);
    assert.equal((await claimEventThanks(t.db, NOW)).length, 0);
  });
});
