import { describe, it } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { orderCorners, scanPage } from "./core";
import { buildScanPdf } from "./pdf";

describe("orderCorners", () => {
  it("returns top-left, top-right, bottom-right, bottom-left whatever the input order", () => {
    const [tl, tr, br, bl] = orderCorners([
      { x: 900, y: 1200 },
      { x: 100, y: 80 },
      { x: 120, y: 1150 },
      { x: 950, y: 60 },
    ]);
    assert.deepEqual([tl, tr, br, bl], [
      { x: 100, y: 80 },
      { x: 950, y: 60 },
      { x: 900, y: 1200 },
      { x: 120, y: 1150 },
    ]);
  });
});

/** A white « sheet » with dark strokes, tilted on a brown table, plus a shadow on one side. */
async function fakePhoto() {
  const sheet = await sharp({ create: { width: 700, height: 990, channels: 3, background: "#f6f4ee" } })
    .composite(
      Array.from({ length: 8 }, (_, i) => ({
        input: { create: { width: 420 - i * 20, height: 10, channels: 3 as const, background: "#1d3a8a" } },
        left: 70,
        top: 120 + i * 90,
      })),
    )
    .png()
    .toBuffer();
  const tilted = await sharp(sheet).rotate(8, { background: "#7a4f2e" }).toBuffer();
  const shadow = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1400"><defs><linearGradient id="s" x1="0" x2="1"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#s)"/></svg>`,
  );
  return sharp({ create: { width: 1600, height: 1400, channels: 3, background: "#7a4f2e" } })
    .composite([{ input: tilted, left: 380, top: 160 }, { input: shadow }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

describe("scanPage", () => {
  it("finds the sheet, straightens it and evens the paper to white", { timeout: 60_000 }, async () => {
    const page = await scanPage(await fakePhoto());
    assert.equal(page.sheetDetected, true);
    // Portrait sheet, roughly the original proportions (700 × 990).
    assert.ok(page.height > page.width, `expected portrait, got ${page.width}×${page.height}`);
    assert.ok(Math.abs(page.width / page.height - 700 / 990) < 0.08);
    // Mostly white paper (the shadow is gone), with dark ink still present.
    const { data } = await sharp(page.jpeg).raw().toBuffer({ resolveWithObject: true });
    let white = 0;
    let dark = 0;
    for (const v of data) {
      if (v > 235) white++;
      else if (v < 100) dark++;
    }
    assert.ok(white / data.length > 0.8, `white share ${white / data.length}`);
    assert.ok(dark / data.length > 0.01, `ink share ${dark / data.length}`);
  });

  it("builds a PDF with a cover and one page per photo", { timeout: 60_000 }, async () => {
    const photo = await fakePhoto();
    const pages = [await scanPage(photo), await scanPage(photo)];
    const pdf = await buildScanPdf(
      { title: "Séance 3 – posture", clientName: "Camille Martin", dateLabel: "14 octobre 2026", sessionLabel: null, keywords: ["posture"] },
      pages,
    );
    assert.equal(pdf.subarray(0, 5).toString("latin1"), "%PDF-");
    // Cover + one page per photo.
    assert.equal((await PDFDocument.load(pdf)).getPageCount(), 3);
  });
});
