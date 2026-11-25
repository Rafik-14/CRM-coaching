import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DIMENSIONS, QUESTION_DIMENSIONS, QUESTION_IDS, REVERSED_QUESTIONS, scoreAnswers, type Dimension, type RawAnswers } from "@/lib/revelateur/scoring";
import { composeReport, SECTION_TITLES, type ReportContent } from "./editorial";
import { interpret } from "./interpretation";
import { LIBRARY } from "./library";

/** Raw answers giving the corrected totals per dimension (reference data sets T01–T08, annexe 02 §13). */
function fromTotals(totals: number[], twist: (d: Dimension, i: number) => number | null = () => null): RawAnswers {
  const out = {} as RawAnswers;
  DIMENSIONS.forEach((d, di) => {
    const qs = QUESTION_IDS.filter((q) => QUESTION_DIMENSIONS[q] === d);
    const base = Math.floor(totals[di] / 6), extra = totals[di] - base * 6;
    qs.forEach((q, i) => {
      const corrected = twist(d, i) ?? base + (i >= 6 - extra ? 1 : 0);
      out[q] = REVERSED_QUESTIONS.has(q) ? 6 - corrected : corrected;
    });
  });
  return out;
}
const T = {
  T01: [18, 18, 18, 18, 18], T02: [12, 24, 24, 24, 24], T03: [12, 13, 24, 24, 24], T04: [12, 13, 13, 24, 24],
  T05: [21, 24, 22, 23, 24], T06: [21, 26, 24, 25, 26], T07: [12, 16, 21, 24, 25], T08: [12, 16, 18, 24, 24],
};
function report(a: RawAnswers, open: string | null = null, firstName: string | null = null): ReportContent {
  const result = scoreAnswers(a);
  return composeReport({ result, interpretation: interpret(a, result, open), firstName, openAnswer: open, bookingUrl: "https://example.test/reserver?source=test-signature-jg" });
}
const allText = (r: ReportContent) => JSON.stringify(r.sections) + JSON.stringify(r.opening);

describe("Révélateur editorial engine (annexe 04 → 05)", () => {
  for (const [name, totals] of Object.entries(T)) {
    it(`${name}: eight sections in order, none empty, editorial control passes`, () => {
      const r = report(fromTotals(totals));
      assert.deepEqual(r.sections.map((s) => [s.code, s.title]), SECTION_TITLES.map(([c, t]) => [c, t]));
      assert.ok(r.sections.every((s) => s.blocks.length > 0));
      assert.ok(r.qc.ok, r.qc.issues.join(" | "));
    });
  }

  it("RPT-01: profile 01 with its complementary profile 02, wording from the library", () => {
    const r = report(fromTotals(T.T07));
    const s01 = JSON.stringify(r.sections[0]);
    assert.ok(s01.includes(LIBRARY.profiles.P01.title));
    assert.ok(s01.includes("Le positionnement à affirmer"));
  });

  it("RPT-02: plural configuration shown without hierarchy; the need chooses the offer, never an axis", () => {
    const open = "Mieux faire reconnaître ma contribution en entretien";
    const r = report(fromTotals(T.T04), open);
    assert.ok(JSON.stringify(r.sections[0]).includes("Configuration plurielle"));
    assert.equal(r.recommendation, "DECISIF");
    assert.deepEqual(report(fromTotals(T.T04), null).sections[3], r.sections[3], "the open answer does not change the axes");
  });

  it("RPT-03 / RPT-12: Profil 06 without a need — no offer, no forced axis", () => {
    const r = report(fromTotals(T.T05));
    assert.equal(r.recommendation, null);
    assert.ok(JSON.stringify(r.sections[0]).includes(LIBRARY.profiles.P06.title));
    assert.ok(!JSON.stringify(r.sections[3]).includes("Axe prioritaire"));
    assert.ok(!allText(r).includes("Prendre rendez-vous"));
  });

  it("RPT-04: developed configuration, no single fictitious profile", () => {
    const r = report(fromTotals(T.T06));
    const s01 = JSON.stringify(r.sections[0]);
    assert.ok(s01.includes("Configuration développée"));
    assert.ok(!Object.values(LIBRARY.profiles).some((p) => s01.includes(p.title)));
  });

  it("RPT-05: no open answer — no offer imposed, report still complete", () => {
    const r = report(fromTotals(T.T07));
    assert.equal(r.recommendation, null);
    assert.equal(r.sections.length, 8);
  });

  it("RPT-07: same scores, different answers — identical cartography", () => {
    const a = fromTotals(T.T07);
    const b = fromTotals(T.T07, (d, i) => (d === "D4" ? [5, 5, 5, 3, 3, 3][i] : null));
    assert.deepEqual(report(a).sections[1], report(b).sections[1]);
  });

  it("RPT-15: skills assessment named exactly, never « coaching »", () => {
    const r = report(fromTotals(T.T02), "J'aimerais faire un bilan pour construire un projet professionnel");
    assert.equal(r.recommendation, "BILAN");
    assert.ok(allText(r).includes("Bilan de compétences via Ayrone"));
    assert.ok(!/coaching/i.test(allText(r)));
  });

  it("RPT-16: vague need — discovery call at most, no precise axis invented", () => {
    const r = report(fromTotals(T.T08), "Je ne sais pas trop, j'aimerais avancer.");
    assert.equal(r.recommendation, "ECHANGE");
  });

  it("one recommendation at most, never a price; first name never shown as a placeholder", () => {
    const r = report(fromTotals(T.T07), "Préparer une présentation devant un comité, et mieux comprendre ma valeur");
    assert.equal(r.sections[6].blocks.filter((b) => b.t === "card").length, 1);
    assert.ok(!/€|\{first_name\}/.test(allText(r)));
    assert.equal(report(fromTotals(T.T07), null, "  ").firstName, null);
  });

  it("dense case (RPT-22): resources, axes and crossings together still pass the control", () => {
    const a = fromTotals([30, 8, 30, 8, 18], (d, i) => (d === "D5" ? [5, 5, 1, 1, 3, 3][i] : null));
    const r = report(a, "Mieux m'exprimer en réunion");
    assert.ok(r.qc.ok, r.qc.issues.join(" | "));
  });

  it("signature: personal wording only with two supported elements; otherwise the open template", () => {
    assert.ok(JSON.stringify(report(fromTotals(T.T05)).sections[5]).includes("J’apporte"));
    const low = report(fromTotals(T.T01));
    assert.ok(JSON.stringify(low.sections[5]).includes("amorce"));
  });
});
