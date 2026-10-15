import { createRequire } from "node:module";
import path from "node:path";
import sharp from "sharp";

/**
 * Handwritten notes scanner: photo of a sheet → straightened, cleaned page (like a real scan).
 * OpenCV (WebAssembly build, no native compilation) finds the sheet and corrects the perspective;
 * the background is evened out to white so the ink stays sharp. Runs entirely on our server.
 * (No "server-only" import here so unit tests can load it; only server code imports this module.)
 */

// ------------------------------------------------------------------ OpenCV loading (once per process)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CV = any;
let cvPromise: Promise<CV> | null = null;

export function loadCv(): Promise<CV> {
  cvPromise ??= (async () => {
    // Synchronous require on purpose: the module object is a self-resolving « thenable », and a dynamic
    // import() would try to await it (forever). Resolved from the project's node_modules at runtime.
    const require = createRequire(path.join(/*turbopackIgnore: true*/ process.cwd(), "package.json"));
    const mod = require("@techstark/opencv-js") as CV;
    const cv = mod.default ?? mod;
    if (!cv.Mat) {
      // The Emscripten module is a « thenable » that resolves to itself: awaiting it directly never ends.
      await new Promise<void>((resolve) => {
        if (typeof cv.then === "function") cv.then(() => resolve());
        else cv.onRuntimeInitialized = () => resolve();
      });
    }
    // Remove `then` so the module can be returned from async functions without being re-awaited.
    delete cv.then;
    return cv;
  })();
  return cvPromise;
}

// ------------------------------------------------------------------ geometry helpers

export type Point = { x: number; y: number };

/** Corners in reading order: top-left, top-right, bottom-right, bottom-left. */
export function orderCorners(points: Point[]): [Point, Point, Point, Point] {
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDiff = [...points].sort((a, b) => a.y - a.x - (b.y - b.x));
  return [bySum[0], byDiff[0], bySum[3], byDiff[3]];
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Largest convex 4-sided contour covering at least `minShare` of the image, or null. */
function findSheet(cv: CV, gray: CV, minShare: number): Point[] | null {
  const area = gray.rows * gray.cols;
  const candidates: { points: Point[]; area: number }[] = [];
  const tryEdges = (edges: CV) => {
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const a = cv.contourArea(c);
      if (a >= area * minShare) {
        const approx = new cv.Mat();
        cv.approxPolyDP(c, approx, 0.02 * cv.arcLength(c, true), true);
        if (approx.rows === 4 && cv.isContourConvex(approx)) {
          const points: Point[] = [];
          for (let j = 0; j < 4; j++) points.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] });
          candidates.push({ points, area: a });
        }
        approx.delete();
      }
      c.delete();
    }
    contours.delete();
    hierarchy.delete();
  };

  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  // 1) Edges (works when the sheet contrasts with the table).
  const edges = new cv.Mat();
  cv.Canny(blurred, edges, 50, 150);
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
  cv.dilate(edges, edges, kernel);
  tryEdges(edges);
  // 2) Brightness (white sheet on a darker surface).
  const bright = new cv.Mat();
  cv.threshold(blurred, bright, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
  cv.morphologyEx(bright, bright, cv.MORPH_CLOSE, kernel);
  tryEdges(bright);
  [blurred, edges, kernel, bright].forEach((m) => m.delete());

  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.area - a.area)[0].points;
}

// ------------------------------------------------------------------ page processing

export type ScannedPage = { jpeg: Buffer; width: number; height: number; sheetDetected: boolean };

const WORK_MAX = 2000; // px, long side, for the output page
const DETECT_MAX = 900; // px, long side, for finding the sheet (faster)

/**
 * One photo → one clean page (grayscale JPEG).
 * If no sheet outline is found (close-up photo, sheet filling the frame), the whole photo is cleaned as is.
 */
export async function scanPage(photo: Buffer): Promise<ScannedPage> {
  const cv = await loadCv();

  // Upright (EXIF), limited size, grayscale.
  const { data, info } = await sharp(photo)
    .rotate()
    .resize({ width: WORK_MAX, height: WORK_MAX, fit: "inside", withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const full = cv.matFromArray(info.height, info.width, cv.CV_8UC1, data);

  // Find the sheet on a smaller copy, then scale the corners back.
  const scale = Math.min(1, DETECT_MAX / Math.max(info.width, info.height));
  const small = new cv.Mat();
  cv.resize(full, small, new cv.Size(Math.round(info.width * scale), Math.round(info.height * scale)), 0, 0, cv.INTER_AREA);
  const found = findSheet(cv, small, 0.2);
  small.delete();

  let page = full;
  if (found) {
    const [tl, tr, br, bl] = orderCorners(found.map((p) => ({ x: p.x / scale, y: p.y / scale })));
    const width = Math.round(Math.max(dist(tl, tr), dist(bl, br)));
    const height = Math.round(Math.max(dist(tl, bl), dist(tr, br)));
    const src = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
    const dst = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
    const matrix = cv.getPerspectiveTransform(src, dst);
    const warped = new cv.Mat();
    cv.warpPerspective(full, warped, matrix, new cv.Size(width, height), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
    // Trim a thin margin: the detected outline sits on the sheet's edge, which leaves a sliver of table.
    const inset = Math.round(Math.min(width, height) * 0.012);
    page = warped.roi(new cv.Rect(inset, inset, width - 2 * inset, height - 2 * inset)).clone();
    [src, dst, matrix, full, warped].forEach((m) => m.delete());
  }

  // Shadows / uneven light: estimate the paper's brightness (ink removed by dilation + median),
  // then divide by it so the paper becomes uniformly white and the ink keeps its contrast.
  const background = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(9, 9));
  cv.dilate(page, background, kernel);
  cv.medianBlur(background, background, 31);
  const pageF = new cv.Mat();
  const backF = new cv.Mat();
  page.convertTo(pageF, cv.CV_32F);
  background.convertTo(backF, cv.CV_32F);
  const ratio = new cv.Mat();
  cv.divide(pageF, backF, ratio, 255);
  const flat = new cv.Mat();
  ratio.convertTo(flat, cv.CV_8U);
  const width = flat.cols;
  const height = flat.rows;
  const flatData = Buffer.from(flat.data);
  [background, kernel, pageF, backF, ratio, flat, page].forEach((m) => m.delete());

  // Levels: light grey → pure white, ink a bit darker; then compress.
  const black = 70;
  const white = 215;
  const a = 255 / (white - black);
  const jpeg = await sharp(flatData, { raw: { width, height, channels: 1 } })
    .linear(a, -black * a)
    .resize({ width: 1700, withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
  const meta = await sharp(jpeg).metadata();
  return { jpeg, width: meta.width ?? width, height: meta.height ?? height, sheetDetected: !!found };
}
