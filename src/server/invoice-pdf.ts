import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Invoice } from "@/server/invoicing";
import { formatCents, legalMentions, type InvoicingSettings } from "@/lib/invoices";
import { APP_TIME_ZONE } from "@/lib/format";

/**
 * Invoice / credit note PDF (A4), JG® style, with the mentions required in France.
 * Generated once when the invoice is issued and stored; drafts are rendered on the fly with « BROUILLON ».
 */
const A4 = { width: 595.28, height: 841.89 };
const M = 48;
const NAVY = rgb(23 / 255, 37 / 255, 54 / 255);
const GOLD = rgb(212 / 255, 168 / 255, 102 / 255);
const TEXT = rgb(52 / 255, 58 / 255, 63 / 255);
const MUTED = rgb(110 / 255, 116 / 255, 122 / 255);
const LINE = rgb(226 / 255, 228 / 255, 230 / 255);
const IVORY = rgb(248 / 255, 246 / 255, 242 / 255);
const RED = rgb(180 / 255, 35 / 255, 24 / 255);

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });

/** Standard PDF fonts only know Latin-1 (+ €, ’…): drop any other character instead of failing. */
function safe(font: PDFFont, text: string) {
  return [...text]
    .map((ch) => {
      try {
        font.encodeText(ch);
        return ch;
      } catch {
        return ch === " " || ch === " " ? " " : "";
      }
    })
    .join("");
}

function wrap(font: PDFFont, text: string, size: number, width: number) {
  const out: string[] = [];
  for (const para of safe(font, text).split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

let logoPng: Buffer | null = null;
async function logo() {
  logoPng ??= await sharp(await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public/brand/jg-logo.svg")))
    .resize({ width: 300 })
    .png()
    .toBuffer();
  return logoPng;
}

export type InvoicePdfOptions = {
  /** /paiement/<token>, printed when online payment is available. */
  paymentUrl?: string | null;
  /** Number of the invoice a credit note refers to. */
  creditForNumber?: string | null;
};

export async function buildInvoicePdf(inv: Invoice, settings: InvoicingSettings, opts: InvoicePdfOptions = {}): Promise<Buffer> {
  const seller = { ...settings, ...((inv.seller ?? {}) as Partial<InvoicingSettings>) };
  const isCredit = inv.kind === "credit_note";
  const draft = inv.status === "draft";
  const pdf = await PDFDocument.create();
  const title = `${isCredit ? "Avoir" : "Facture"} ${inv.number ?? "(brouillon)"}`;
  pdf.setTitle(title);
  pdf.setAuthor(seller.legalName);
  pdf.setCreator("CRM Méthode JG®");
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([A4.width, A4.height]);
  const W = A4.width - 2 * M;
  const t = (p: PDFPage, s: string, x: number, y: number, size = 9.5, font = reg, color = TEXT) =>
    p.drawText(safe(font, s), { x, y, size, font, color });
  const right = (s: string, xRight: number, y: number, size = 9.5, font = reg, color = TEXT) =>
    t(page, s, xRight - font.widthOfTextAtSize(safe(font, s), size), y, size, font, color);

  let y = A4.height - M;

  // Header: logo left, document title right.
  const img = await pdf.embedPng(await logo());
  const lw = 96;
  page.drawImage(img, { x: M, y: y - lw * (img.height / img.width), width: lw, height: lw * (img.height / img.width) });
  right(isCredit ? "AVOIR" : "FACTURE", A4.width - M, y - 18, 20, bold, NAVY);
  right(inv.number ? `N° ${inv.number}` : "Brouillon, sans numéro", A4.width - M, y - 36, 10.5, bold, TEXT);
  if (inv.issuedAt) right(`Date : ${dateFmt.format(inv.issuedAt)}`, A4.width - M, y - 51, 9.5);
  if (inv.dueAt && !isCredit) right(`Échéance : ${dateFmt.format(inv.dueAt)}`, A4.width - M, y - 64, 9.5);
  if (isCredit && opts.creditForNumber) right(`Sur la facture n° ${opts.creditForNumber}`, A4.width - M, y - 64, 9.5);
  y -= 96;
  page.drawRectangle({ x: M, y, width: 40, height: 2, color: GOLD });

  if (seller.isSample || draft) {
    y -= 26;
    const msg = draft ? "BROUILLON — non valable comme facture" : "Données d’exemple — à remplacer dans Paramètres › Facturation";
    page.drawRectangle({ x: M, y: y - 6, width: W, height: 20, color: rgb(1, 0.95, 0.94) });
    t(page, msg, M + 8, y, 9.5, bold, RED);
  }

  // Seller and client.
  y -= 34;
  const top = y;
  t(page, "ÉMETTEUR", M, y, 7.5, bold, MUTED);
  y -= 14;
  t(page, seller.legalName, M, y, 10.5, bold, NAVY);
  const sellerLines = [
    seller.tradeName,
    seller.legalForm,
    ...seller.address.split("\n"),
    `SIRET : ${seller.siret}`,
    seller.vatMode === "vat" && seller.vatNumber ? `N° TVA : ${seller.vatNumber}` : "",
    [seller.email, seller.phone].filter(Boolean).join(" · "),
  ].filter(Boolean);
  for (const l of sellerLines) {
    y -= 12.5;
    t(page, l, M, y, 9);
  }
  const sellerBottom = y;

  let cy = top;
  const cx = M + W / 2 + 10;
  page.drawRectangle({ x: cx - 12, y: top - 112, width: W / 2 + 2, height: 126, color: IVORY });
  t(page, "FACTURÉ À", cx, cy, 7.5, bold, MUTED);
  cy -= 14;
  t(page, inv.billTo.company || inv.billTo.name, cx, cy, 10.5, bold, NAVY);
  const clientLines = [
    inv.billTo.company ? inv.billTo.name : "",
    ...(inv.billTo.address ?? "").split("\n"),
    inv.billTo.vatNumber ? `N° TVA : ${inv.billTo.vatNumber}` : "",
    inv.billTo.email ?? "",
    inv.billTo.reference ? `Votre référence : ${inv.billTo.reference}` : "",
  ].filter(Boolean);
  for (const l of clientLines.slice(0, 7)) {
    cy -= 12.5;
    t(page, l, cx, cy, 9);
  }
  y = Math.min(sellerBottom, top - 112) - 30;

  // Lines.
  const col = { qty: M + W * 0.62, unit: M + W * 0.8, total: M + W };
  page.drawRectangle({ x: M, y: y - 6, width: W, height: 22, color: NAVY });
  t(page, "Désignation", M + 8, y, 9, bold, rgb(1, 1, 1));
  right("Qté", col.qty, y, 9, bold, rgb(1, 1, 1));
  right("Prix unitaire", col.unit, y, 9, bold, rgb(1, 1, 1));
  right("Total", col.total - 8, y, 9, bold, rgb(1, 1, 1));
  y -= 24;
  for (const l of inv.lines) {
    const desc = wrap(reg, l.description, 9.5, W * 0.55);
    desc.forEach((d, i) => t(page, d, M + 8, y - i * 12, 9.5));
    right(String(l.quantity).replace(".", ","), col.qty, y);
    right(formatCents(l.unitCents, inv.currency), col.unit, y);
    right(formatCents(Math.round(l.quantity * l.unitCents), inv.currency), col.total - 8, y);
    y -= Math.max(1, desc.length) * 12 + 10;
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: M + W, y: y + 4 }, thickness: 0.6, color: LINE });
  }

  // Totals.
  y -= 10;
  const tl = M + W * 0.55;
  const totalRow = (label: string, value: string, strong = false) => {
    t(page, label, tl, y, strong ? 11 : 9.5, strong ? bold : reg, strong ? NAVY : TEXT);
    right(value, col.total - 8, y, strong ? 11 : 9.5, strong ? bold : reg, strong ? NAVY : TEXT);
    y -= strong ? 20 : 15;
  };
  if (inv.vatExempt) {
    totalRow(isCredit ? "Total de l’avoir" : "Total à payer", formatCents(inv.totalCents, inv.currency), true);
  } else {
    totalRow("Total HT", formatCents(inv.subtotalCents, inv.currency));
    totalRow(`TVA ${(inv.vatRateBps / 100).toString().replace(".", ",")} %`, formatCents(inv.vatCents, inv.currency));
    totalRow(isCredit ? "Total de l’avoir TTC" : "Total TTC à payer", formatCents(inv.totalCents, inv.currency), true);
  }

  // Payment.
  if (!isCredit) {
    y -= 12;
    t(page, "RÈGLEMENT", M, y, 7.5, bold, MUTED);
    y -= 14;
    if (inv.dueAt) {
      t(page, `À régler avant le ${dateFmt.format(inv.dueAt)}.`, M, y, 9.5, bold);
      y -= 13;
    }
    t(page, `Par virement : IBAN ${seller.iban}${seller.bic ? ` · BIC ${seller.bic}` : ""}`, M, y, 9);
    y -= 12.5;
    t(page, `Merci d’indiquer le n° ${inv.number ?? "de facture"} en référence.`, M, y, 9);
    if (opts.paymentUrl) {
      y -= 12.5;
      t(page, "En ligne (carte, TWINT pour les paiements en CHF) :", M, y, 9);
      y -= 12.5;
      for (const l of wrap(reg, opts.paymentUrl, 8.5, W)) {
        t(page, l, M, y, 8.5, reg, NAVY);
        y -= 11;
      }
    }
  }

  if (inv.notes) {
    y -= 14;
    for (const l of wrap(reg, inv.notes, 9, W)) {
      t(page, l, M, y, 9);
      y -= 12;
    }
  }

  // Legal mentions at the bottom.
  const mentions = legalMentions(seller, inv).flatMap((m) => wrap(reg, m, 7.8, W));
  let my = M + 22 + mentions.length * 10;
  page.drawLine({ start: { x: M, y: my + 8 }, end: { x: M + W, y: my + 8 }, thickness: 0.6, color: LINE });
  for (const l of mentions) {
    t(page, l, M, my, 7.8, reg, MUTED);
    my -= 10;
  }
  t(page, `${seller.legalName} · ${seller.legalForm} · SIRET ${seller.siret}`, M, M, 7.5, reg, MUTED);

  return Buffer.from(await pdf.save());
}
