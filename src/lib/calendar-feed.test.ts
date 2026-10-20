import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCoachFeed, shortName } from "./calendar-feed";
import { icsEvent, icsFold } from "./ics";

const session = {
  id: "8f8e9f7e-1111-4222-8333-944455556666",
  contactId: "1a2b3c4d-1111-4222-8333-944455556666",
  startsAt: new Date("2026-10-20T08:00:00Z"),
  durationMin: 60,
  type: "Séance individuelle",
  status: "planned",
  location: "Visio",
  updatedAt: new Date("2026-10-15T09:30:00Z"),
  firstName: "Claire",
  lastName: "dupont",
};

describe("calendar feed", () => {
  const feed = buildCoachFeed([session], "https://crm.example.test", new Date("2026-10-15T10:00:00Z"));
  const unfolded = feed.replace(/\r\n /g, "");

  it("is a valid calendar with CRLF line endings and lines of at most 75 octets", () => {
    assert.ok(feed.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
    assert.ok(feed.endsWith("END:VCALENDAR\r\n"));
    assert.ok(!/[^\r]\n/.test(feed));
    for (const line of feed.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75, line);
  });

  it("has one event per session, with a stable UID and UTC times", () => {
    assert.equal(unfolded.match(/BEGIN:VEVENT/g)?.length, 1);
    assert.match(unfolded, /UID:session-8f8e9f7e-1111-4222-8333-944455556666@crm-jeremygalea\r\n/);
    assert.match(unfolded, /DTSTART:20261020T080000Z\r\nDTEND:20261020T090000Z\r\n/);
  });

  it("shows type, first name and initial only (no notes, no e-mail, no phone)", () => {
    assert.match(unfolded, /SUMMARY:Séance individuelle · Claire D\.\r\n/);
    assert.doesNotMatch(unfolded, /dupont|@example|AGENDA/i);
  });

  it("names the calendar and asks for an hourly refresh", () => {
    assert.match(unfolded, /X-WR-CALNAME:Séances · Méthode JG®/);
    assert.match(unfolded, /REFRESH-INTERVAL;VALUE=DURATION:PT60M/);
  });

  it("escapes commas, semicolons and line breaks", () => {
    const ics = icsEvent({ uid: "x", start: session.startsAt, durationMin: 20, summary: "A, B; C\nD" });
    assert.match(ics, /SUMMARY:A\\, B\\; C\\nD\r\n/);
    assert.match(ics, /TRIGGER:-PT30M/);
  });
});

describe("icsFold", () => {
  it("never cuts inside an accented character", () => {
    const line = `SUMMARY:${"é".repeat(60)}`;
    const folded = icsFold(line);
    assert.equal(folded.replace(/\r\n /g, ""), line);
    for (const part of folded.split("\r\n")) assert.ok(Buffer.byteLength(part) <= 75);
  });
});

describe("shortName", () => {
  it("keeps the first name and the initial", () => {
    assert.equal(shortName("Claire", "Dupont"), "Claire D.");
    assert.equal(shortName("Marc", ""), "Marc");
  });
});
