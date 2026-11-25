import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { QUESTION_DIMENSIONS, QUESTION_IDS, REVERSED_QUESTIONS, scoreAnswers, type Dimension, type QuestionId, type RawAnswers } from "@/lib/revelateur/scoring";
import { interpret } from "./interpretation";

/** Builds raw answers from CORRECTED values (the reversal is undone), dimension by dimension or per question. */
function answers(byDim: Partial<Record<Dimension, number>>, per: Partial<Record<QuestionId, number>> = {}, fallback = 3): RawAnswers {
  const out = {} as RawAnswers;
  for (const q of QUESTION_IDS) {
    const corrected = per[q] ?? byDim[QUESTION_DIMENSIONS[q]] ?? fallback;
    out[q] = REVERSED_QUESTIONS.has(q) ? 6 - corrected : corrected;
  }
  return out;
}
const run = (a: RawAnswers, open: string | null = null) => interpret(a, scoreAnswers(a), open);

describe("Révélateur interpretation engine (annexe 03, rules PROPOSÉES)", () => {
  it("is deterministic and never changes the configuration (COM02, COM09)", () => {
    const a = answers({ D1: 4, D2: 2, D3: 4, D4: 3, D5: 5 });
    const r1 = run(a, "Je voudrais mieux prendre ma place");
    const r2 = run(a, "Je voudrais mieux prendre ma place");
    assert.deepEqual(r1, r2);
    assert.deepEqual(r1.configuration, scoreAnswers(a).configuration);
    assert.deepEqual(run(a, null).configuration, r1.configuration, "the open answer never changes it");
  });

  it("INT-03: may keep nothing at all, without error", () => {
    const r = run(answers({}, {}, 3)); // every answer « cela dépend »
    assert.equal(r.resources.length, 0);
    assert.equal(r.axes.length, 0);
    assert.equal(r.crossings.length, 0);
    assert.equal(r.qualityControl.status, "ok");
  });

  it("INT-01: an isolated favourable answer gives no resource (F14 relies on Q13 alone)", () => {
    const r = run(answers({}, { Q13: 5 }));
    assert.ok(!r.resources.some((x) => x.facet === "F14"));
    assert.ok(r.qualityControl.excluded.some((e) => e.code === "F14" && /une seule réponse directe/.test(e.reason)));
  });

  it("INT-02 / INT-04: supported resources are kept, two at most, one per dimension, each traced", () => {
    const r = run(answers({}, {}, 5));
    assert.equal(r.resources.length, 2);
    assert.notEqual(r.resources[0].dimension, r.resources[1].dimension);
    for (const x of r.resources) {
      assert.equal(x.resourceCode, "RESOURCE_01");
      assert.ok(x.evidence.length >= 2, "INT-16: several statements cited");
      assert.ok(["SUFFISANT", "NUANCE"].includes(x.proofLevel));
    }
  });

  it("RESOURCE_02: recognition explicit + variation shown by two answers (never a single 3)", () => {
    // F1: Q01 direct (recognition) high; Q04 direct at 3, Q03 corroborating at 3.
    const r = run(answers({}, { Q01: 5, Q04: 3, Q03: 3, Q25: 3 }, 3));
    const f1 = r.resources.find((x) => x.facet === "F1");
    assert.equal(f1?.resourceCode, "RESOURCE_02");
    // Only one answer at 3 next to it: not enough to establish variation.
    const r2 = run(answers({}, { Q01: 5, Q04: 3, Q03: 5, Q25: 5, Q21: 5, Q22: 5, Q02: 5 }, 5));
    assert.notEqual(r2.resources.find((x) => x.facet === "F1")?.resourceCode, "RESOURCE_02");
  });

  it("INT-05: RESOURCE_02 and RESOURCE_04 are never both given to one facet", () => {
    const r = run(answers({}, { Q01: 5, Q04: 5, Q03: 2, Q25: 1 }, 3));
    const f1 = r.resources.filter((x) => x.facet === "F1");
    assert.ok(f1.length <= 1);
  });

  it("INT-06: a low score without converging answers gives no axis", () => {
    // D3.02 rests on Q10 alone: Q10 low but its complementary answers are high → contradiction, no axis.
    const r = run(answers({ D3: 3 }, { Q10: 1, Q02: 5, Q25: 5, Q09: 5 }));
    assert.ok(!r.axes.some((a) => a.axisCode === "D3.02"));
  });

  it("INT-07: an axis with a single central question needs an independent confirmation", () => {
    // D4.01: Q13 low, only one complementary answer supports it.
    const r = run(answers({}, { Q13: 1, Q14: 2, Q12: 5, Q27: 5 }, 4));
    assert.ok(!r.axes.some((a) => a.axisCode === "D4.01"));
    assert.ok(r.qualityControl.excluded.some((e) => e.code === "D4.01"));
  });

  it("INT-08: one primary and one complementary axis at most, never two close axes", () => {
    const r = run(answers({ D1: 1, D2: 1, D3: 1, D4: 1, D5: 1 }));
    assert.ok(r.axes.length <= 2);
    assert.equal(r.axes.filter((a) => a.priority === "primary").length, 1);
    const codes = r.axes.map((a) => a.axisCode);
    assert.ok(!(codes.includes("D1.02") && codes.includes("D1.03")));
  });

  it("INT-09: the open answer only breaks ties, it never creates an axis", () => {
    const r = run(answers({}, {}, 4), "Je voudrais mieux m'exprimer en entretien");
    assert.equal(r.axes.length, 0);
    assert.deepEqual(r.openNeed.tags.includes("D3"), true);
  });

  it("INT-10: Profil 06 — no weakness and no axis forced", () => {
    const a = answers({}, { Q05: 3, Q13: 3 }, 4);
    assert.equal(scoreAnswers(a).configuration.code, "VALUE_EMBODIED");
    assert.equal(run(a).axes.length, 0);
  });

  it("INT-11: configuration développée — no D1 axis from D1 = 3,3,3,4,4,4", () => {
    const a = answers({ D2: 5, D3: 5, D4: 5, D5: 5 }, { Q01: 3, Q02: 3, Q03: 3, Q04: 4, Q21: 4, Q22: 4 });
    assert.equal(scoreAnswers(a).configuration.code, "DEVELOPED");
    assert.ok(!run(a).axes.some((x) => x.dimension === "D1"));
  });

  it("INT-12: a marked gap alone gives no crossing", () => {
    const r = run(answers({ D1: 5, D3: 3 }, {}, 4)); // gap 50 points, but D3 has no low answer
    assert.ok(!r.crossings.some((c) => c.crossingCode === "C01"));
    assert.ok(r.qualityControl.excluded.some((e) => e.code === "C01"));
  });

  it("INT-13: a marked gap confirmed by both dimensions gives a traced crossing", () => {
    const r = run(answers({ D1: 5, D3: 2 }, {}, 4));
    const c01 = r.crossings.find((c) => c.crossingCode === "C01");
    assert.ok(c01);
    assert.equal(c01.direction, "positive");
    assert.equal(c01.proofLevel, "SUFFISANT");
    assert.ok(c01.absoluteGap >= 20);
    assert.ok(c01.evidence.length >= 6);
  });

  it("INT-14: two crossings at most, not sharing their lower dimension", () => {
    const r = run(answers({ D1: 5, D2: 5, D3: 1, D4: 1, D5: 1 }));
    assert.ok(r.crossings.length <= 2);
    const lower = r.crossings.map((c) => (c.direction === "positive" ? c.dimensions[1] : c.dimensions[0]));
    assert.equal(new Set(lower).size, lower.length);
  });

  it("gaps under 10 points are never a contrast (exact totals)", () => {
    const r = run(answers({ D1: 4, D3: 4 }, { Q01: 5, Q02: 5 }, 4)); // gap ≈ 8.3 points
    assert.ok(!r.crossings.some((c) => c.crossingCode === "C01"));
  });

  it("COM01: invalid answers give an explicit incomplete state, nothing attributed", () => {
    const a = answers({}, {}, 4);
    (a as Record<string, number>).Q30 = 9;
    const r = interpret(a, scoreAnswers(answers({}, {}, 4)), null);
    assert.equal(r.qualityControl.status, "incomplete");
    assert.equal(r.resources.length + r.axes.length + r.crossings.length, 0);
  });

  it("heterogeneous dimension: nothing above « nuancé » there", () => {
    const r = run(answers({}, { Q05: 5, Q07: 5, Q06: 1, Q08: 1, Q23: 5, Q24: 2 }, 4));
    for (const x of [...r.resources, ...r.axes].filter((e) => e.dimension === "D2")) assert.equal(x.proofLevel, "NUANCE");
  });
});
