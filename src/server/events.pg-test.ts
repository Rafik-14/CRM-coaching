import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";
import { cancelRegistration, registerForEvent, seatsTaken } from "./events";

/**
 * Seats under real concurrency, on a real PostgreSQL with a pool of connections (`npm run test:pg`, run in CI
 * after the migrations). The in-memory database of the unit tests has a single connection, so it can't show
 * two bookings racing for the last seat; this can.
 */
const url = process.env.DATABASE_URL ?? "";
const usable = url.startsWith("postgres") && !url.includes(":54320"); // not the local single-session PGlite server

describe("seats under concurrency (PostgreSQL)", { skip: usable ? false : "needs DATABASE_URL on a real PostgreSQL" }, () => {
  const client = usable ? postgres(url, { max: 12 }) : null;
  const db = client ? drizzle({ client, schema }) : (null as never);
  let eventId = "";

  before(async () => {
    const [ev] = await db
      .insert(schema.events)
      .values({
        slug: `pg-test-${Date.now()}`,
        title: "Test de concurrence",
        startsAt: new Date(Date.now() + 7 * 86_400_000),
        endsAt: new Date(Date.now() + 7 * 86_400_000 + 7_200_000),
        capacity: 3,
        maxSeatsPerBooking: 1,
        status: "published",
      })
      .returning({ id: schema.events.id });
    eventId = ev.id;
  });
  after(async () => {
    if (eventId) await db.delete(schema.events).where(eq(schema.events.id, eventId));
    await client?.end();
  });

  it("12 people at the same moment for 3 seats: exactly 3 confirmed, 9 on the waiting list", async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        registerForEvent(db, {
          eventId,
          contactId: null,
          firstName: `P${i}`,
          lastName: "Test",
          email: `p${i}@example.test`,
          phone: null,
          company: null,
          seats: 1,
          source: "site",
        }),
      ),
    );
    const statuses = results.map((r) => (r.ok ? r.status : r.reason));
    assert.equal(statuses.filter((s) => s === "confirmed").length, 3);
    assert.equal(statuses.filter((s) => s === "waitlist").length, 9);
    assert.equal(await seatsTaken(db, eventId), 3);
  });

  it("3 cancellations at the same moment: the 3 next on the list get the seats, never more", async () => {
    const confirmed = await db.query.eventRegistrations.findMany({
      where: (r, { and, eq }) => and(eq(r.eventId, eventId), eq(r.status, "confirmed")),
    });
    const outcomes = await Promise.all(confirmed.map((r) => cancelRegistration(db, r.id)));
    assert.equal(outcomes.flatMap((o) => o.promoted).length, 3);
    assert.equal(await seatsTaken(db, eventId), 3);
  });

  it("the same person submitting twice at once keeps one booking", async () => {
    const same = () =>
      registerForEvent(db, { eventId, contactId: null, firstName: "Double", lastName: "Clic", email: "double@example.test", phone: null, company: null, seats: 1, source: "site" });
    await Promise.all([same(), same(), same()]);
    const rows = await db.query.eventRegistrations.findMany({
      where: (r, { and, eq, ne }) => and(eq(r.eventId, eventId), eq(r.email, "double@example.test"), ne(r.status, "cancelled")),
    });
    assert.equal(rows.length, 1);
  });
});
