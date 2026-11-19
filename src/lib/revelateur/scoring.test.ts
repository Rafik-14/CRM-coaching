import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSIONS,
  QUESTION_DIMENSIONS,
  QUESTION_IDS,
  REVERSED_QUESTIONS,
  configurationFromTotals,
  correctedValue,
  formatScore,
  isHeterogeneous,
  scoreAnswers,
  validateAnswers,
  type Dimension,
  type QuestionId,
  type RawAnswers,
} from "./scoring";

// Reference cases from annexe 02 §13–§14 and annexe 06 (UT, CFG, CALC).

/** Builds 30 raw answers whose corrected totals are exactly the given D1–D5 totals. */
function answersForTotals(totals: [number, number, number, number, number]): RawAnswers {
  const byDim = new Map<Dimension, number[]>();
  DIMENSIONS.forEach((d, i) => {
    const t = totals[i];
    const base = Math.floor(t / 6);
    const rem = t % 6;
    byDim.set(d, Array.from({ length: 6 }, (_, k) => base + (k < rem ? 1 : 0)));
  });
  const out = {} as RawAnswers;
  for (const id of QUESTION_IDS) {
    const corrected = byDim.get(QUESTION_DIMENSIONS[id])!.shift()!;
    out[id] = REVERSED_QUESTIONS.has(id) ? 6 - corrected : corrected;
  }
  return out;
}
const totalsOf = (t: [number, number, number, number, number]) =>
  Object.fromEntries(DIMENSIONS.map((d, i) => [d, t[i]])) as Record<Dimension, number>;
const config = (t: [number, number, number, number, number]) => scoreAnswers(answersForTotals(t)).configuration;

describe("questionnaire structure", () => {
  it("has 30 questions Q01→Q30, six per dimension", () => {
    assert.equal(QUESTION_IDS.length, 30);
    assert.deepEqual(QUESTION_IDS, Array.from({ length: 30 }, (_, i) => `Q${String(i + 1).padStart(2, "0")}`));
    for (const d of DIMENSIONS) assert.equal(QUESTION_IDS.filter((id) => QUESTION_DIMENSIONS[id] === d).length, 6);
  });
  it("only Q03, Q07, Q11, Q19 are reversed", () => {
    assert.deepEqual([...REVERSED_QUESTIONS].sort(), ["Q03", "Q07", "Q11", "Q19"]);
  });
});

describe("validation (UT-04, UT-05, UT-06, SESSION01)", () => {
  const full = answersForTotals([18, 18, 18, 18, 18]);
  it("accepts 30 integer answers 1–5", () => assert.equal(validateAnswers(full).status, "COMPLETE"));
  it("29 answers → INCOMPLETE, never filled in", () => {
    const rest: Record<string, number> = { ...full };
    delete rest.Q30;
    const r = validateAnswers(rest);
    assert.equal(r.status, "INCOMPLETE");
    assert.deepEqual(r.status === "INCOMPLETE" && r.missing, ["Q30"]);
  });
  for (const bad of [0, 6, 2.5, "4", null]) {
    it(`rejects value ${JSON.stringify(bad)} → INVALID`, () => {
      assert.equal(validateAnswers({ ...full, Q12: bad }).status, "INVALID");
    });
  }
  it("rejects a duplicated question id", () => {
    const rows = [...QUESTION_IDS.map((id) => ({ questionId: id, value: full[id] })), { questionId: "Q05", value: 3 }];
    assert.equal(validateAnswers(rows).status, "INVALID");
  });
  it("rejects an unknown id", () => assert.equal(validateAnswers({ ...full, Q31: 3 }).status, "INVALID"));
});

describe("reversed items (UT-07, UT-08, REV01, REV02, §14.1)", () => {
  it("raw 1 → 5 and raw 5 → 1 on each reversed item; direct items unchanged", () => {
    for (const id of REVERSED_QUESTIONS) {
      assert.equal(correctedValue(id, 1), 5);
      assert.equal(correctedValue(id, 5), 1);
    }
    assert.equal(correctedValue("Q01", 1), 1);
    assert.equal(correctedValue("Q01", 5), 5);
  });
  for (const id of REVERSED_QUESTIONS) {
    it(`${id}: raw 1 with five other answers at 3 → total 20, score 58,3; raw 5 → total 16, score 41,7`, () => {
      const base = Object.fromEntries(QUESTION_IDS.map((q) => [q, 3])) as RawAnswers;
      const dim = QUESTION_DIMENSIONS[id as QuestionId];
      const r1 = scoreAnswers({ ...base, [id]: 1 }).dimensions.find((x) => x.dimension === dim)!;
      assert.equal(r1.correctedTotal, 20);
      assert.equal(formatScore(r1.score), "58,3");
      const r5 = scoreAnswers({ ...base, [id]: 5 }).dimensions.find((x) => x.dimension === dim)!;
      assert.equal(r5.correctedTotal, 16);
      assert.equal(formatScore(r5.score), "41,7");
    });
  }
});

describe("scores and levels (UT-09, UT-10, UT-11, UT-12)", () => {
  it("all corrected answers at 1 → 0, all at 5 → 100", () => {
    assert.ok(scoreAnswers(answersForTotals([6, 6, 6, 6, 6])).dimensions.every((d) => d.score === 0));
    assert.ok(scoreAnswers(answersForTotals([30, 30, 30, 30, 30])).dimensions.every((d) => d.score === 100));
  });
  it("normalisation table of §7.2", () => {
    const table: [number, string][] = [[6, "0,0"], [12, "25,0"], [15, "37,5"], [16, "41,7"], [20, "58,3"], [21, "62,5"], [25, "79,2"], [26, "83,3"], [30, "100,0"]];
    for (const [t, shown] of table) {
      const d = scoreAnswers(answersForTotals([t, 18, 18, 18, 18])).dimensions[0];
      assert.equal(formatScore(d.score), shown, `total ${t}`);
    }
  });
  it("levels use exact bounds 40 / 60 / 80", () => {
    const lvl = (t: number) => scoreAnswers(answersForTotals([t, 18, 18, 18, 18])).dimensions[0].level;
    assert.equal(lvl(15), 0); // 37,5
    assert.equal(lvl(16), 1); // 41,7
    assert.equal(lvl(20), 1); // 58,3
    assert.equal(lvl(21), 2); // 62,5
    assert.equal(lvl(25), 2); // 79,2
    assert.equal(lvl(26), 3); // 83,3
  });
  it("produces no global score", () => {
    const r = scoreAnswers(answersForTotals([18, 18, 18, 18, 18])) as unknown as Record<string, unknown>;
    for (const k of ["globalScore", "average", "mean", "total"]) assert.equal(k in r, false);
  });
});

describe("heterogeneity (§9, UT-13 → UT-15)", () => {
  it("matches the reference examples", () => {
    assert.equal(isHeterogeneous([1, 2, 4, 5, 3, 3]), true);
    assert.equal(isHeterogeneous([1, 2, 3, 3, 3, 5]), false);
    assert.equal(isHeterogeneous([2, 2, 4, 4, 1, 3]), true);
    assert.equal(isHeterogeneous([3, 3, 3, 4, 4, 5]), false);
  });
  it("never changes scores or configuration", () => {
    // Same corrected total 18 for D1, once homogeneous, once heterogeneous.
    const a = answersForTotals([18, 24, 24, 24, 24]);
    const b = { ...a, Q01: 1, Q02: 1, Q04: 5, Q21: 5, Q22: 3, Q03: 3 } as RawAnswers; // D1 corrected 1,1,3,5,5,3 = 18
    const ra = scoreAnswers(a);
    const rb = scoreAnswers(b);
    assert.equal(rb.dimensions[0].heterogeneous, true);
    assert.equal(ra.dimensions[0].score, rb.dimensions[0].score);
    assert.deepEqual(ra.configuration, rb.configuration);
  });
});

describe("configurations — reference cases T01–T08 (annexe 02 §13 / CALC01–08)", () => {
  it("T01 18/18/18/18/18 → plural", () => assert.equal(config([18, 18, 18, 18, 18]).code, "PLURAL"));
  it("T02 12/24/24/24/24 → profile 01, no secondary", () => {
    assert.deepEqual(config([12, 24, 24, 24, 24]), { code: "SINGLE_PROFILE", profile: "P01", secondaryProfile: null, dimensions: ["D1"] });
  });
  it("T03 12/13/24/24/24 → joint D1–D2", () => {
    assert.deepEqual(config([12, 13, 24, 24, 24]), { code: "JOINT", profile: null, secondaryProfile: null, dimensions: ["D1", "D2"] });
  });
  it("T04 12/13/13/24/24 → plural D1–D3", () => {
    assert.deepEqual(config([12, 13, 13, 24, 24]).dimensions, ["D1", "D2", "D3"]);
    assert.equal(config([12, 13, 13, 24, 24]).code, "PLURAL");
  });
  it("T05 21/24/22/23/24 → profile 06", () => {
    const r = scoreAnswers(answersForTotals([21, 24, 22, 23, 24]));
    assert.deepEqual(r.dimensions.map((d) => formatScore(d.score)), ["62,5", "75,0", "66,7", "70,8", "75,0"]);
    assert.equal(r.configuration.code, "VALUE_EMBODIED");
    assert.equal(r.configuration.profile, "P06");
  });
  it("T06 21/26/24/25/26 → developed (never reclassified as profile 06)", () => {
    const r = scoreAnswers(answersForTotals([21, 26, 24, 25, 26]));
    assert.deepEqual(r.dimensions.map((d) => formatScore(d.score)), ["62,5", "83,3", "75,0", "79,2", "83,3"]);
    assert.equal(r.configuration.code, "DEVELOPED");
    assert.equal(r.configuration.profile, null);
  });
  it("T07 12/16/21/24/25 → profile 01 + secondary 02", () => {
    const c = config([12, 16, 21, 24, 25]);
    assert.equal(c.profile, "P01");
    assert.equal(c.secondaryProfile, "P02");
  });
  it("T08 12/16/18/24/24 → profile 01, no secondary", () => {
    const c = config([12, 16, 18, 24, 24]);
    assert.equal(c.profile, "P01");
    assert.equal(c.secondaryProfile, null);
  });
});

describe("threshold cases (annexe 02 §14.2 – §14.4, CFG-09 → CFG-16)", () => {
  const cases: [[number, number, number, number, number], string, string | null, string | null][] = [
    [[12, 12, 24, 24, 24], "JOINT", null, null],
    [[12, 13, 24, 24, 24], "JOINT", null, null], // gap 4,17
    // gap 8,33 → single profile. §14.2 is silent on the secondary; §11.3 gives P02
    // (two dimensions < 60, gap 2nd/3rd = 41,67 ≥ 10).
    [[12, 14, 24, 24, 24], "SINGLE_PROFILE", "P01", "P02"],
    [[12, 13, 13, 24, 24], "PLURAL", null, null],
    [[12, 12, 12, 24, 24], "PLURAL", null, null],
    [[12, 16, 18, 24, 25], "SINGLE_PROFILE", "P01", null], // 2nd/3rd gap 8,33
    [[12, 16, 19, 24, 25], "SINGLE_PROFILE", "P01", "P02"], // gap 12,5
    [[12, 16, 21, 24, 25], "SINGLE_PROFILE", "P01", "P02"], // gap 20,83
    [[12, 16, 24, 24, 25], "SINGLE_PROFILE", "P01", "P02"], // gap 33,33
    [[12, 21, 24, 24, 25], "SINGLE_PROFILE", "P01", null], // only one dimension < 60
    [[12, 13, 24, 24, 25], "JOINT", null, null],
    [[21, 25, 24, 23, 22], "VALUE_EMBODIED", "P06", null], // amplitude 16,67
    [[21, 26, 24, 23, 22], "DEVELOPED", null, null], // amplitude 20,83
    [[21, 30, 25, 26, 24], "DEVELOPED", null, null],
    [[21, 25, 25, 25, 25], "VALUE_EMBODIED", "P06", null],
    [[21, 21, 25, 25, 25], "VALUE_EMBODIED", "P06", null],
  ];
  for (const [t, code, profile, secondary] of cases) {
    it(`${t.join("/")} → ${code}${profile ? " " + profile : ""}${secondary ? " + " + secondary : ""}`, () => {
      const c = configurationFromTotals(totalsOf(t));
      assert.equal(c.code, code);
      assert.equal(c.profile, profile);
      assert.equal(c.secondaryProfile, secondary);
    });
  }
  it("no secondary profile outside a single profile", () => {
    for (const t of [[12, 13, 24, 24, 25], [12, 12, 12, 24, 24], [21, 26, 24, 25, 26], [21, 24, 22, 23, 24]] as const) {
      assert.equal(configurationFromTotals(totalsOf([...t] as [number, number, number, number, number])).secondaryProfile, null);
    }
  });
});

describe("determinism (UT-16)", () => {
  it("same answers → identical result every time", () => {
    const a = answersForTotals([17, 22, 19, 25, 14]);
    const first = JSON.stringify(scoreAnswers(a));
    for (let i = 0; i < 20; i++) assert.equal(JSON.stringify(scoreAnswers(a)), first);
  });
});
