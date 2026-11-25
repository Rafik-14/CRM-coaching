import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { DIMENSIONS, QUESTION_DIMENSIONS, QUESTION_IDS, REVERSED_QUESTIONS, scoreAnswers, type Dimension, type RawAnswers } from "@/lib/revelateur/scoring";
import { interpret } from "./interpretation";
import { renderReportPdf } from "./report-render";

function fromTotals(totals: number[], twist: (d: Dimension, i: number) => number | null = () => null): RawAnswers {
  const out = {} as RawAnswers;
  DIMENSIONS.forEach((d, di) => {
    const qs = QUESTION_IDS.filter((q) => QUESTION_DIMENSIONS[q] === d);
    const base = Math.floor(totals[di] / 6), extra = totals[di] - base * 6;
    qs.forEach((q, i) => {
      const c = twist(d, i) ?? base + (i >= 6 - extra ? 1 : 0);
      out[q] = REVERSED_QUESTIONS.has(q) ? 6 - c : c;
    });
  });
  return out;
}
async function render(a: RawAnswers, open: string | null, firstName: string | null) {
  const result = scoreAnswers(a);
  return renderReportPdf({ result, interpretation: interpret(a, result, open), firstName, openAnswer: open, confirmedAt: new Date("2026-11-25T10:00:00Z"), ownership: "© Jérémy Galéa – Méthode JG® · Outil propriétaire." });
}
const OUT = process.env.REPORT_SAMPLES; // optional folder to keep the samples for a visual check

describe("Révélateur PDF report (annexe 05)", () => {
  const cases: [string, RawAnswers, string | null, string | null][] = [
    ["court-profil06", fromTotals([21, 24, 22, 23, 24]), null, null],
    ["profil01-secondaire", fromTotals([12, 16, 21, 24, 25]), "Préparer un entretien important", "Camille"],
    ["dense", fromTotals([30, 8, 30, 8, 18], (d, i) => (d === "D5" ? [5, 5, 1, 1, 3, 3][i] : null)), "Mieux m'exprimer en réunion et prendre ma place", "Jean"],
  ];
  for (const [name, a, open, first] of cases) {
    it(`${name}: a valid A4 PDF of a reasonable length`, async () => {
      const { pdf, content } = await render(a, open, first);
      assert.ok(pdf, content.qc.issues.join(" | "));
      const doc = await PDFDocument.load(pdf);
      const pages = doc.getPageCount();
      assert.ok(pages >= 3 && pages <= 9, `${pages} pages`);
      const { width, height } = doc.getPage(0).getSize();
      assert.equal(Math.round(width), 595);
      assert.equal(Math.round(height), 842);
      if (OUT) writeFileSync(`${OUT}/${name}.pdf`, pdf);
    });
  }
});
