import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_QUESTIONNAIRE, formatAnswer, normalizeQuestionnaire, questionnaireSchema, readAnswers, type Question } from "./questionnaire";

const questions: Question[] = [
  { id: "motivation", label: "Ce qui vous amène", type: "long", options: [], required: true },
  { id: "clarte", label: "Clarté", type: "scale", options: [], required: false },
  { id: "connu", label: "Connu par", type: "single", options: ["LinkedIn", "Autre"], required: false },
  { id: "dispo", label: "Moments", type: "multiple", options: ["Matin", "Soir"], required: false },
  { id: "date", label: "Date clé", type: "date", options: [], required: false },
];

describe("questionnaire answers", () => {
  it("keeps a copy of each question with the answer", () => {
    const r = readAnswers(questions, { q_motivation: " Changer de poste ", q_clarte: "7", q_connu: "LinkedIn", q_dispo: ["Soir", "Matin"], consent: "on" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(
      r.answers.map((a) => [a.label, a.value]),
      [
        ["Ce qui vous amène", "Changer de poste"],
        ["Clarté", "7"],
        ["Connu par", "LinkedIn"],
        ["Moments", ["Matin", "Soir"]],
        ["Date clé", ""],
      ],
    );
  });

  it("asks for required answers and the consent", () => {
    const r = readAnswers(questions, { q_motivation: "  " });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.errors.motivation);
    assert.ok(r.errors.consent);
  });

  it("refuses values that are not offered (tampered form)", () => {
    const r = readAnswers(questions, { q_motivation: "x", q_clarte: "11", q_connu: "Facebook", q_dispo: ["Nuit"], q_date: "demain", consent: "on" });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.deepEqual(Object.keys(r.errors).sort(), ["clarte", "connu", "date", "dispo"]);
  });

  it("formats answers for the client file", () => {
    assert.equal(formatAnswer({ id: "a", label: "", type: "scale", value: "7" }), "7 / 10");
    assert.equal(formatAnswer({ id: "a", label: "", type: "date", value: "2026-11-03" }), "03/11/2026");
    assert.equal(formatAnswer({ id: "a", label: "", type: "multiple", value: [] }), "—");
  });
});

describe("questionnaire settings", () => {
  it("the default questionnaire is valid", () => {
    assert.equal(questionnaireSchema.safeParse(DEFAULT_QUESTIONNAIRE).success, true);
  });

  it("a choice question needs two choices, and ids must be unique", () => {
    const one = { intro: "", questions: [{ id: "a", label: "Q", type: "single", options: ["Seul"], required: false }] };
    assert.equal(questionnaireSchema.safeParse(one).success, false);
    const twice = { intro: "", questions: [questions[0], { ...questions[0] }] };
    assert.equal(questionnaireSchema.safeParse(twice).success, false);
  });

  it("falls back to the default when the stored value is broken", () => {
    assert.deepEqual(normalizeQuestionnaire({ questions: "?" }), DEFAULT_QUESTIONNAIRE);
  });
});
