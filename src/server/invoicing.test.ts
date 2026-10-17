import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { createTestDb } from "./db/test-db";
import { clientPackages, clients, contacts, invoices, packages } from "./db/schema";
import { claimDueReminders, createCreditNote, createDraft, deleteDraft, issueInvoice, recordPayment, releaseReminder, updateDraft } from "./invoicing";
import { DEFAULT_INVOICING } from "@/lib/invoices";

const NOW = new Date("2026-10-17T09:00:00Z");
const settings = { ...DEFAULT_INVOICING, paymentTermsDays: 15 };

describe("invoicing", () => {
  let t: Awaited<ReturnType<typeof createTestDb>>;
  let contactId: string;
  let clientPackageId: string;

  before(async () => {
    t = await createTestDb();
    [{ id: contactId }] = await t.db.insert(contacts).values({ firstName: "Claire", lastName: "Dupont" }).returning({ id: contacts.id });
    const [client] = await t.db.insert(clients).values({ contactId }).returning({ id: clients.id });
    const [pkg] = await t.db.insert(packages).values({ name: "Parcours Signature JG®", sessionsCount: 5, price: "1500" }).returning({ id: packages.id });
    [{ id: clientPackageId }] = await t.db.insert(clientPackages).values({ clientId: client.id, packageId: pkg.id }).returning({ id: clientPackages.id });
  });
  after(() => t.close());

  const draft = (lines = [{ description: "Parcours Signature JG®", quantity: 1, unitCents: 150_000 }]) =>
    createDraft(t.db, {
      contactId,
      clientPackageId,
      currency: "EUR",
      billTo: { name: "Claire Dupont" },
      lines,
      vatRateBps: 0,
      vatExempt: true,
    });

  it("a draft has no number; issuing gives consecutive numbers of the year", async () => {
    const a = await draft();
    assert.equal(a.number, null);
    const ia = await issueInvoice(t.db, a.id, settings, NOW);
    const ib = await issueInvoice(t.db, (await draft()).id, settings, NOW);
    assert.equal("invoice" in ia && ia.invoice?.number, "2026-0001");
    assert.equal("invoice" in ib && ib.invoice?.number, "2026-0002");
    assert.equal("invoice" in ia && ia.invoice?.dueAt?.toISOString(), "2026-11-01T09:00:00.000Z");
  });

  it("issuing at the same time never gives the same number or skips one", async () => {
    const drafts = await Promise.all([draft(), draft(), draft(), draft()]);
    const issued = await Promise.all(drafts.map((d) => issueInvoice(t.db, d.id, settings, NOW)));
    const numbers = issued.map((r) => ("invoice" in r ? r.invoice?.number : null)).sort();
    assert.deepEqual(numbers, ["2026-0003", "2026-0004", "2026-0005", "2026-0006"]);
  });

  it("an invoice is issued only once, and cannot be edited or deleted afterwards", async () => {
    const d = await draft();
    await issueInvoice(t.db, d.id, settings, NOW);
    assert.ok("error" in (await issueInvoice(t.db, d.id, settings, NOW)));
    assert.equal(await updateDraft(t.db, d.id, { currency: "EUR", billTo: { name: "X" }, lines: [], vatRateBps: 0, vatExempt: true }), null);
    assert.equal(await deleteDraft(t.db, d.id), false);
  });

  it("continues an existing sequence from the « first number » setting", async () => {
    const r = await issueInvoice(t.db, (await draft()).id, { ...settings, firstNumber: 42 }, new Date("2027-01-05T09:00:00Z"));
    assert.equal("invoice" in r && r.invoice?.number, "2027-0042");
    const next = await issueInvoice(t.db, (await draft()).id, { ...settings, firstNumber: 42 }, new Date("2027-01-06T09:00:00Z"));
    assert.equal("invoice" in next && next.invoice?.number, "2027-0043");
  });

  it("partial then full payment: invoice paid, package partiel then payé", async () => {
    const d = await draft();
    await issueInvoice(t.db, d.id, settings, NOW);
    await recordPayment(t.db, { invoiceId: d.id, amountCents: 50_000, method: "virement", paidAt: NOW });
    let [inv] = await t.db.select().from(invoices).where(eq(invoices.id, d.id));
    let [cp] = await t.db.select().from(clientPackages).where(eq(clientPackages.id, clientPackageId));
    assert.equal(inv.status, "issued");
    assert.equal(cp.paymentStatus, "partial");
    await recordPayment(t.db, { invoiceId: d.id, amountCents: 100_000, method: "carte", paidAt: NOW });
    [inv] = await t.db.select().from(invoices).where(eq(invoices.id, d.id));
    [cp] = await t.db.select().from(clientPackages).where(eq(clientPackages.id, clientPackageId));
    assert.equal(inv.status, "paid");
    assert.equal(cp.paymentStatus, "paid");
  });

  it("a Stripe payment notified twice is recorded once", async () => {
    const d = await draft();
    await issueInvoice(t.db, d.id, settings, NOW);
    const first = await recordPayment(t.db, { invoiceId: d.id, amountCents: 150_000, method: "carte", paidAt: NOW, stripePaymentId: "pi_123" });
    const second = await recordPayment(t.db, { invoiceId: d.id, amountCents: 150_000, method: "carte", paidAt: NOW, stripePaymentId: "pi_123" });
    assert.equal(first, true);
    assert.equal(second, false);
  });

  it("a full credit note cancels the invoice, with its own number", async () => {
    const d = await draft();
    await issueInvoice(t.db, d.id, settings, NOW);
    const credit = await createCreditNote(t.db, d.id);
    assert.ok(credit);
    const r = await issueInvoice(t.db, credit.id, settings, NOW);
    assert.ok("invoice" in r && r.invoice?.number);
    const [original] = await t.db.select().from(invoices).where(eq(invoices.id, d.id));
    assert.equal(original.status, "cancelled");
  });

  it("no credit note on a draft", async () => {
    assert.equal(await createCreditNote(t.db, (await draft()).id), null);
  });

  it("payment reminders: each one once, at its day, never on a paid invoice", async () => {
    await t.db.update(invoices).set({ status: "paid" }).where(eq(invoices.status, "issued")); // clear earlier tests
    const d = await draft();
    await issueInvoice(t.db, d.id, settings, NOW); // due 1 Nov
    const day = (n: number) => new Date(Date.UTC(2026, 10, 1 + n, 10));
    assert.equal((await claimDueReminders(t.db, day(2), [3, 10])).length, 0);
    assert.deepEqual((await claimDueReminders(t.db, day(4), [3, 10])).map((c) => c.step), [0]);
    assert.equal((await claimDueReminders(t.db, day(5), [3, 10])).length, 0);
    const second = await claimDueReminders(t.db, day(11), [3, 10]);
    assert.deepEqual(second.map((c) => c.step), [1]);
    await releaseReminder(t.db, d.id, 1); // sending failed
    assert.equal((await claimDueReminders(t.db, day(12), [3, 10])).length, 1);
    await recordPayment(t.db, { invoiceId: d.id, amountCents: 150_000, method: "virement", paidAt: day(12) });
    assert.equal((await claimDueReminders(t.db, day(30), [3, 10, 20])).length, 0);
  });
});
