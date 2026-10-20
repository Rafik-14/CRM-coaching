import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BOOKING, bookingSettingsSchema, computeAvailability, exceptionFormSchema, zonedTimeToUtc } from "./booking";

const TZ = "Europe/Zurich";

describe("zonedTimeToUtc", () => {
  it("handles summer time (UTC+2)", () => {
    assert.equal(zonedTimeToUtc(2026, 10, 24, 9 * 60, TZ).toISOString(), "2026-10-24T07:00:00.000Z");
  });
  it("handles winter time (UTC+1), the day after the change", () => {
    assert.equal(zonedTimeToUtc(2026, 10, 26, 9 * 60, TZ).toISOString(), "2026-10-26T08:00:00.000Z");
  });
});

describe("computeAvailability", () => {
  const now = new Date("2026-10-14T10:00:00Z"); // Wednesday, 12:00 in Zurich

  it("respects the minimum notice (24 h)", () => {
    const days = computeAvailability(DEFAULT_BOOKING, [], now, TZ);
    assert.equal(days[0].date, "2026-10-15");
    assert.ok(days[0].slots.every((s) => new Date(s).getTime() >= now.getTime() + 24 * 3_600_000));
  });

  it("skips weekends (no ranges on Saturday / Sunday by default)", () => {
    const days = computeAvailability(DEFAULT_BOOKING, [], now, TZ);
    assert.ok(!days.some((d) => d.date === "2026-10-17" || d.date === "2026-10-18"));
  });

  it("removes slots overlapping a planned session widened by the buffer", () => {
    // Session 09:30–10:30 Zurich; buffer 10 min blocks 09:20–10:40.
    const busy = [{ start: new Date("2026-10-16T07:30:00Z"), end: new Date("2026-10-16T08:30:00Z") }];
    const friday = computeAvailability(DEFAULT_BOOKING, busy, now, TZ).find((d) => d.date === "2026-10-16")!;
    assert.deepEqual(friday.slots.slice(0, 2), ["2026-10-16T07:00:00.000Z", "2026-10-16T09:00:00.000Z"]);
  });

  it("stops at the booking horizon", () => {
    const days = computeAvailability({ ...DEFAULT_BOOKING, horizonDays: 7 }, [], now, TZ);
    assert.ok(days.every((d) => d.date <= "2026-10-21"));
  });

  it("returns nothing when online booking is closed", () => {
    assert.deepEqual(computeAvailability({ ...DEFAULT_BOOKING, enabled: false }, [], now, TZ), []);
  });

  it("keeps the same local times across the change to winter time", () => {
    const days = computeAvailability({ ...DEFAULT_BOOKING, horizonDays: 14 }, [], now, TZ);
    const before = days.find((d) => d.date === "2026-10-23")!.slots[0];
    const after = days.find((d) => d.date === "2026-10-26")!.slots[0];
    assert.equal(before, "2026-10-23T07:00:00.000Z"); // 09:00 summer time
    assert.equal(after, "2026-10-26T08:00:00.000Z"); // 09:00 winter time
  });
});

describe("bookingSettingsSchema", () => {
  const base = { slotMinutes: "20", bufferMinutes: "10", minNoticeHours: "24", horizonDays: "30", location: "Visio" };

  it("parses « 09:00-12:00, 14:00-18:00 » into sorted ranges", () => {
    const r = bookingSettingsSchema.parse({ ...base, enabled: "on", day1: "14:00-18:00, 9h00-12h00" });
    assert.deepEqual(r.weekly[1], [
      { start: "09:00", end: "12:00" },
      { start: "14:00", end: "18:00" },
    ]);
    assert.equal(r.enabled, true);
  });

  it("rejects a range that ends before it starts", () => {
    assert.equal(bookingSettingsSchema.safeParse({ ...base, day2: "12:00-09:00" }).success, false);
  });
});

describe("days off and extra hours", () => {
  const now = new Date("2026-10-14T10:00:00Z"); // Wednesday, 12:00 in Zurich
  const day = (days: ReturnType<typeof computeAvailability>, date: string) => days.find((d) => d.date === date);

  it("a day off removes every slot of that day, and only that day", () => {
    const days = computeAvailability(DEFAULT_BOOKING, [], now, TZ, [
      { kind: "blocked", startsOn: "2026-10-16", endsOn: "2026-10-16", startTime: null, endTime: null },
    ]);
    assert.equal(day(days, "2026-10-16"), undefined);
    assert.ok(day(days, "2026-10-15"));
    assert.ok(day(days, "2026-10-19"));
  });

  it("a period off covers every day from start to end (inclusive)", () => {
    const days = computeAvailability(DEFAULT_BOOKING, [], now, TZ, [
      { kind: "blocked", startsOn: "2026-10-19", endsOn: "2026-10-23", startTime: null, endTime: null },
    ]);
    assert.ok(!days.some((d) => d.date >= "2026-10-19" && d.date <= "2026-10-23"));
    assert.ok(day(days, "2026-10-26"));
  });

  it("blocked hours remove only the slots that overlap them", () => {
    const days = computeAvailability(DEFAULT_BOOKING, [], now, TZ, [
      { kind: "blocked", startsOn: "2026-10-16", endsOn: "2026-10-16", startTime: "09:00", endTime: "11:00" },
    ]);
    const friday = day(days, "2026-10-16")!;
    // 09:00–11:00 Zurich = 07:00–09:00 UTC: first slot left is 11:00 local.
    assert.equal(friday.slots[0], "2026-10-16T09:00:00.000Z");
  });

  it("extra hours open slots on a day without availability (Saturday)", () => {
    const days = computeAvailability(DEFAULT_BOOKING, [], now, TZ, [
      { kind: "extra", startsOn: "2026-10-17", endsOn: "2026-10-17", startTime: "10:00", endTime: "11:00" },
    ]);
    assert.deepEqual(day(days, "2026-10-17")?.slots, ["2026-10-17T08:00:00.000Z", "2026-10-17T08:30:00.000Z"]);
  });

  it("extra hours overlapping the usual ones never duplicate a slot", () => {
    const days = computeAvailability(DEFAULT_BOOKING, [], now, TZ, [
      { kind: "extra", startsOn: "2026-10-16", endsOn: "2026-10-16", startTime: "09:00", endTime: "10:00" },
    ]);
    const slots = day(days, "2026-10-16")!.slots;
    assert.equal(new Set(slots).size, slots.length);
  });

  it("long sessions start every 30 minutes", () => {
    const days = computeAvailability({ ...DEFAULT_BOOKING, slotMinutes: 60 }, [], now, TZ);
    assert.deepEqual(day(days, "2026-10-16")!.slots.slice(0, 3), [
      "2026-10-16T07:00:00.000Z",
      "2026-10-16T07:30:00.000Z",
      "2026-10-16T08:00:00.000Z",
    ]);
  });
});

describe("exceptionFormSchema", () => {
  it("one whole day off when only the start date is given", () => {
    const r = exceptionFormSchema.parse({ kind: "blocked", startsOn: "2026-10-20", endsOn: "", allDay: "on" });
    assert.deepEqual(r, { kind: "blocked", startsOn: "2026-10-20", endsOn: "2026-10-20", startTime: null, endTime: null, note: null });
  });

  it("requires hours for extra availability and checks their order", () => {
    assert.equal(exceptionFormSchema.safeParse({ kind: "extra", startsOn: "2026-10-20", allDay: "on" }).success, false);
    assert.equal(exceptionFormSchema.safeParse({ kind: "blocked", startsOn: "2026-10-20", startTime: "12:00", endTime: "09:00" }).success, false);
  });

  it("rejects an end date before the start date", () => {
    assert.equal(exceptionFormSchema.safeParse({ kind: "blocked", startsOn: "2026-10-20", endsOn: "2026-10-19", allDay: "on" }).success, false);
  });
});
