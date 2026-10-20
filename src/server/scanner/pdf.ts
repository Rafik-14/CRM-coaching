import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { ScannedPage } from "./core";

/**
 * Branded PDF of scanned notes: a cover (JG® logo, title, client, date, session, keywords),
 * then one cleaned page per sheet, with a discreet footer. A4, portrait.
 */
const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 42;
const NAVY = rgb(23 / 255, 37 / 255, 54 / 255);
const GOLD = rgb(212 / 255, 168 / 255, 102 / 255);
const TEXT = rgb(52 / 255, 58 / 255, 63 / 255);

export type ScanPdfInfo = {
  title: string;
  clientName: string;
  /** « 14 octobre 2026 » */
  dateLabel: string;
  /** « Séance individuelle · 14 oct. 2026, 10:00 », if linked to a session. */
  sessionLabel: string | null;
  keywords: string[];
};

/** Standard PDF fonts only know Latin-1 (+ a few signs): drop any other character instead of failing. */
function safe(font: PDFFont, text: string) {
  return [...text]
    .map((ch) => {
      try {
        font.encodeText(ch);
        return ch;
      } catch {
        return "";
      }
    })
    .join("");
}

let logoPng: Buffer | null = null;
async function logo() {
  // Runtime file read (public/brand): not bundled.
  logoPng ??= await sharp(await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "public/brand/jg-logo.svg")))
    .resize({ width: 360 })
    .png()
    .toBuffer();
  return logoPng;
}

export async function buildScanPdf(info: ScanPdfInfo, pages: ScannedPage[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(info.title);
  pdf.setAuthor("Jérémy Galéa — Méthode JG®");
  pdf.setSubject(`Notes de séance · ${info.clientName}`);
  pdf.setKeywords(info.keywords);
  pdf.setCreator("CRM Méthode JG®");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // ---- cover
  const cover = pdf.addPage([A4.width, A4.height]);
  const logoImage = await pdf.embedPng(await logo());
  const logoW = 120;
  const logoH = (logoImage.height / logoImage.width) * logoW;
  let y = A4.height - MARGIN - logoH;
  cover.drawImage(logoImage, { x: MARGIN, y, width: logoW, height: logoH });
  y -= 56;
  cover.drawText(safe(regular, "NOTES DE SÉANCE"), { x: MARGIN, y, size: 10, font: bold, color: NAVY });
  y -= 14;
  cover.drawRectangle({ x: MARGIN, y, width: 36, height: 2, color: GOLD });
  y -= 34;
  for (const line of wrap(safe(bold, info.title), bold, 22, A4.width - 2 * MARGIN)) {
    cover.drawText(line, { x: MARGIN, y, size: 22, font: bold, color: NAVY });
    y -= 28;
  }
  y -= 14;
  const rows: [string, string][] = [
    ["Client", info.clientName],
    ["Date", info.dateLabel],
    ...(info.sessionLabel ? ([["Séance", info.sessionLabel]] as [string, string][]) : []),
    ...(info.keywords.length ? ([["Mots-clés", info.keywords.join(" · ")]] as [string, string][]) : []),
    ["Pages", String(pages.length)],
  ];
  for (const [label, value] of rows) {
    cover.drawText(safe(regular, label), { x: MARGIN, y, size: 10, font: regular, color: TEXT });
    const lines = wrap(safe(bold, value), bold, 12, A4.width - 2 * MARGIN - 110);
    lines.forEach((line, i) => cover.drawText(line, { x: MARGIN + 110, y: y - i * 16, size: 12, font: bold, color: NAVY }));
    y -= 16 * lines.length + 10;
  }
  cover.drawText(safe(regular, "Document confidentiel — Méthode JG® · Jérémy Galéa"), {
    x: MARGIN,
    y: MARGIN,
    size: 9,
    font: regular,
    color: TEXT,
  });

  // ---- scanned pages
  const footerH = 22;
  for (const [i, page] of pages.entries()) {
    const image = await pdf.embedJpg(page.jpeg);
    const p = pdf.addPage([A4.width, A4.height]);
    const boxW = A4.width - 2 * MARGIN;
    const boxH = A4.height - 2 * MARGIN - footerH;
    const k = Math.min(boxW / image.width, boxH / image.height);
    const w = image.width * k;
    const h = image.height * k;
    p.drawImage(image, { x: (A4.width - w) / 2, y: MARGIN + footerH + (boxH - h) / 2, width: w, height: h });
    const footer = safe(regular, `${info.clientName} · ${info.title} · page ${i + 1}/${pages.length}`);
    p.drawText(footer, { x: MARGIN, y: MARGIN, size: 8, font: regular, color: TEXT });
    p.drawRectangle({ x: A4.width - MARGIN - 24, y: MARGIN + 3, width: 24, height: 1.5, color: GOLD });
  }

  return Buffer.from(await pdf.save());
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
