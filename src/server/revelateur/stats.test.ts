import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestDb } from "../db/test-db";
import { QUESTION_IDS } from "@/lib/revelateur/scoring";
import { confirmSession, createSession, move, saveAnswer } from "./session";
import { computeStats } from "./stats";
import { statsToPdf, statsToXlsx } from "./stats-export";

describe("Révélateur statistics export (v2.0 §8)", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  before(async () => {
    t = await createTestDb();
    for (const v of [4, 2]) {
      const { session } = await createSession(t.db);
      let cur = await move(t.db, session, { to: "start" });
      for (let i = 0; i < 30; i++) {
        cur = await saveAnswer(t.db, cur, QUESTION_IDS[i], v);
        cur = await move(t.db, cur, { to: "next" });
      }
      await move(t.db, cur, { to: "next" });
      await confirmSession(t.db, session.id);
    }
  });
  after(() => t.close());

  it("aggregates without any personal data, and exports XLSX and PDF", async () => {
    const s = await computeStats(t.db, "Depuis le lancement");
    assert.equal(s.counters.tests, 2);
    assert.equal(s.configurations.reduce((n, c) => n + c.n, 0), 2);
    assert.equal(s.dimensions.length, 5);
    assert.ok(s.dimensions.every((d) => d.average !== null && d.levels.reduce((n, l) => n + l.n, 0) === 2));
    assert.ok(!JSON.stringify(s).includes("@"), "no e-mail address");
    const xlsx = await statsToXlsx(s);
    assert.equal(xlsx.subarray(0, 2).toString(), "PK");
    const pdf = await statsToPdf(s);
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  });
});
