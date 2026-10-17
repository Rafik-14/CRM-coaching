import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_INVOICING, computeTotals, formatCents, invoicingSettingsSchema, legalMentions, parseAmount, vatFor } from "./invoices";

describe("invoice amounts", () => {
  it("adds the lines and rounds the VAT once, to the cent", () => {
    assert.deepEqual(computeTotals([{ description: "Séance", quantity: 3, unitCents: 3333 }], 2000), {
      subtotalCents: 9999,
      vatCents: 2000,
      totalCents: 11999,
    });
  });

  it("no VAT under the franchise", () => {
    assert.deepEqual(vatFor({ vatMode: "franchise", vatRate: 20 }), { vatRateBps: 0, vatExempt: true });
    assert.deepEqual(vatFor({ vatMode: "vat", vatRate: 20 }), { vatRateBps: 2000, vatExempt: false });
  });

  it("formats and reads amounts the French way", () => {
    assert.equal(formatCents(125050, "EUR"), "1 250,50 €");
    assert.equal(parseAmount("1 250,5"), 125050);
    assert.equal(parseAmount("12,345"), null);
  });

  it("prints the right mentions", () => {
    const m = legalMentions(DEFAULT_INVOICING, { vatExempt: true, kind: "invoice" });
    assert.ok(m[0].includes("293 B"));
    assert.ok(m.some((l) => l.includes("40 €")));
    assert.equal(legalMentions(DEFAULT_INVOICING, { vatExempt: false, kind: "credit_note" }).length, 0);
  });
});

describe("invoicing settings", () => {
  const base = {
    legalName: "Jérémy Galéa",
    legalForm: "EI",
    siret: "12345678900012",
    address: "Paris",
    email: "contact@exemple.fr",
    vatMode: "franchise",
    vatRate: "20",
    iban: "fr7630006000011234567890189",
    paymentTermsDays: "15",
    latePenaltyText: "Pénalités…",
    reminderDays: "10, 3",
    firstNumber: "1",
  };

  it("formats SIRET and IBAN, sorts reminder days, and clears the sample flag", () => {
    const r = invoicingSettingsSchema.parse(base);
    assert.equal(r.siret, "123 456 789 00012");
    assert.equal(r.iban, "FR76 3000 6000 0112 3456 7890 189");
    assert.deepEqual(r.reminderDays, [3, 10]);
    assert.equal(r.isSample, false);
  });

  it("refuses a wrong SIRET, and VAT without a VAT number", () => {
    assert.equal(invoicingSettingsSchema.safeParse({ ...base, siret: "123" }).success, false);
    assert.equal(invoicingSettingsSchema.safeParse({ ...base, vatMode: "vat", vatNumber: "" }).success, false);
  });
});
