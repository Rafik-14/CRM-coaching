import { z } from "zod";

/**
 * Invoicing rules for a business registered in France (Phase 2 · M6).
 * Amounts are integers in cents; VAT in basis points (2000 = 20 %).
 */

export const INVOICING_KEY = "invoicing";

export type InvoicingSettings = {
  /** true until the coach saves his real details: invoices then show a « données d'exemple » warning. */
  isSample: boolean;
  legalName: string;
  tradeName: string;
  legalForm: string;
  siret: string;
  address: string;
  email: string;
  phone: string;
  /** franchise = « TVA non applicable, art. 293 B du CGI » · vat = VAT charged at `vatRate`. */
  vatMode: "franchise" | "vat";
  vatNumber: string;
  vatRate: number;
  iban: string;
  bic: string;
  /** Days between issue and due date. */
  paymentTermsDays: number;
  /** Printed on every invoice (French law: late-payment penalties; €40 fee for business clients). */
  latePenaltyText: string;
  /** Payment reminders, in days after the due date. */
  reminderDays: number[];
  /** To continue an existing sequence: the first number used this year (e.g. 42). */
  firstNumber: number;
};

/** Sample details (clearly fictional) until Jérémy's real ones are entered. */
export const DEFAULT_INVOICING: InvoicingSettings = {
  isSample: true,
  legalName: "Jérémy Galéa",
  tradeName: "Méthode JG®",
  legalForm: "Entrepreneur individuel (EI)",
  siret: "123 456 789 00012",
  address: "12 rue de l’Exemple\n75011 Paris\nFrance",
  email: "contact@exemple.fr",
  phone: "06 00 00 00 00",
  vatMode: "franchise",
  vatNumber: "",
  vatRate: 20,
  iban: "FR76 3000 6000 0112 3456 7890 189",
  bic: "AGRIFRPPXXX",
  paymentTermsDays: 15,
  latePenaltyText:
    "En cas de retard de paiement : pénalités au taux de trois fois le taux d’intérêt légal, et, pour les clients professionnels, indemnité forfaitaire pour frais de recouvrement de 40 €.",
  reminderDays: [3, 10],
  firstNumber: 1,
};

export const PAYMENT_METHODS = {
  virement: "Virement",
  carte: "Carte bancaire",
  twint: "TWINT",
  prelevement: "Prélèvement SEPA",
  especes: "Espèces",
  cheque: "Chèque",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const INVOICE_STATUS = {
  draft: "Brouillon",
  issued: "Émise",
  paid: "Payée",
  cancelled: "Annulée",
} as const;

// ------------------------------------------------------------------ settings form

const text = (max: number, label: string, required = true) =>
  required ? z.string().trim().min(1, `${label} : obligatoire.`).max(max) : z.string().trim().max(max).default("");

export const invoicingSettingsSchema = z
  .object({
    legalName: text(120, "Nom"),
    tradeName: text(120, "Nom commercial", false),
    legalForm: text(120, "Statut"),
    siret: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, ""))
      .refine((v) => /^\d{14}$/.test(v), "Le SIRET compte 14 chiffres.")
      .transform((v) => `${v.slice(0, 3)} ${v.slice(3, 6)} ${v.slice(6, 9)} ${v.slice(9)}`),
    address: text(400, "Adresse"),
    email: z.email("Adresse e-mail invalide.").trim(),
    phone: text(40, "Téléphone", false),
    vatMode: z.enum(["franchise", "vat"]),
    vatNumber: text(40, "N° de TVA", false),
    vatRate: z.coerce.number().min(0).max(30),
    iban: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, "").toUpperCase())
      .refine((v) => /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v), "IBAN invalide.")
      .transform((v) => v.replace(/(.{4})/g, "$1 ").trim()),
    bic: text(11, "BIC", false),
    paymentTermsDays: z.coerce.number().int().min(0, "0 jour minimum").max(90, "90 jours maximum"),
    latePenaltyText: text(600, "Mention de retard"),
    reminderDays: z
      .string()
      .trim()
      .transform((v, ctx) => {
        const days = v
          .split(/[,; ]+/)
          .filter(Boolean)
          .map(Number);
        if (days.some((d) => !Number.isInteger(d) || d < 1 || d > 90)) {
          ctx.addIssue({ code: "custom", message: "Des nombres de jours, par exemple : 3, 10" });
          return z.NEVER;
        }
        return [...new Set(days)].sort((a, b) => a - b).slice(0, 5);
      }),
    firstNumber: z.coerce.number().int().min(1).max(99999),
  })
  .refine((v) => v.vatMode === "franchise" || v.vatNumber.length > 0, { message: "Indiquez votre n° de TVA.", path: ["vatNumber"] })
  .transform((v) => ({ ...v, isSample: false }));

export function normalizeInvoicing(value: unknown): InvoicingSettings {
  const v = (value ?? {}) as Partial<InvoicingSettings>;
  return { ...DEFAULT_INVOICING, ...v, reminderDays: Array.isArray(v.reminderDays) ? v.reminderDays : DEFAULT_INVOICING.reminderDays };
}

// ------------------------------------------------------------------ amounts

export type Line = { description: string; quantity: number; unitCents: number };

/** Totals with VAT rounded once on the subtotal (to the cent). */
export function computeTotals(lines: Line[], vatRateBps: number) {
  const subtotalCents = lines.reduce((sum, l) => sum + Math.round(l.quantity * l.unitCents), 0);
  const vatCents = Math.round((subtotalCents * vatRateBps) / 10_000);
  return { subtotalCents, vatCents, totalCents: subtotalCents + vatCents };
}

/** VAT of new invoices from the settings. */
export function vatFor(s: Pick<InvoicingSettings, "vatMode" | "vatRate">) {
  return s.vatMode === "franchise" ? { vatRateBps: 0, vatExempt: true } : { vatRateBps: Math.round(s.vatRate * 100), vatExempt: false };
}

/** « 1 250,00 € » / « 490,00 CHF » (regular spaces: the PDF fonts have no narrow no-break space). */
export function formatCents(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, minimumFractionDigits: 2 })
    .format(cents / 100)
    .replace(/[  ]/g, " ");
}

/** « 1 250,50 » or « 1250.5 » typed in a form → cents. */
export function parseAmount(value: string): number | null {
  const v = value.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v) * 100);
}

// ------------------------------------------------------------------ invoice form (draft)

export const invoiceFormSchema = z.object({
  currency: z.enum(["EUR", "CHF"]),
  billName: text(160, "Nom du client"),
  billCompany: text(160, "Société", false),
  billAddress: text(400, "Adresse", false),
  billEmail: z.union([z.literal(""), z.email("Adresse e-mail invalide.")]).default(""),
  billVatNumber: text(40, "N° de TVA", false),
  billReference: text(80, "Référence", false),
  notes: text(600, "Mention", false),
  lines: z
    .string()
    .transform((v, ctx) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(v);
      } catch {
        ctx.addIssue({ code: "custom", message: "Lignes illisibles." });
        return z.NEVER;
      }
      const r = z
        .array(
          z.object({
            description: z.string().trim().min(1, "Chaque ligne a besoin d’une désignation.").max(300),
            quantity: z.number().positive("Quantité invalide.").max(1000),
            unitCents: z.number().int().min(0, "Prix invalide.").max(100_000_000),
          }),
        )
        .min(1, "Ajoutez au moins une ligne.")
        .max(30)
        .safeParse(parsed);
      if (!r.success) {
        ctx.addIssue({ code: "custom", message: r.error.issues[0].message });
        return z.NEVER;
      }
      return r.data;
    }),
});

// ------------------------------------------------------------------ legal mentions

/** Mentions printed at the bottom of an invoice (France). */
export function legalMentions(s: InvoicingSettings, invoice: { vatExempt: boolean; kind: string }) {
  const lines: string[] = [];
  if (invoice.vatExempt) lines.push("TVA non applicable, art. 293 B du CGI.");
  if (invoice.kind === "invoice") {
    lines.push("Pas d’escompte pour paiement anticipé.");
    lines.push(s.latePenaltyText);
  }
  return lines;
}

/** Next number of the year: after the last one, never below the « first number » setting. */
export function formatInvoiceNumber(year: number, n: number) {
  return `${year}-${String(n).padStart(4, "0")}`;
}
