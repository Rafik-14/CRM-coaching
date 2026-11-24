/**
 * « Votre valeur prend forme. » — the preparation animation (dossier maître v2.0 §3, 5–7 s).
 *
 * The person's own summary (Q01 → Q30 with their answers) gathers, row by row, into a single point at
 * the end of each of the five axes; the points join into the outline, a web appears inside it and a
 * light gold shape glides from one point to the next. The shape is the same for everyone: no score is
 * shown here — results only come with the report.
 *
 * Ported from the preview validated on 22 Nov 2026 (« récapitulatif → cinq points »).
 */

const SVG_NS = "http://www.w3.org/2000/svg";
const NAVY = "#172536";
const GOLD = "#d4a866";
const TEAL = "#0f6b6b";
const AXES = [0, 1, 2, 3, 4];

/**
 * Plays inside `box` (an empty, positioned element). `answers[i]` is the label chosen for statement i,
 * `axes[i]` the axis (0–4) its row flies to. Returns the clean-up.
 */
export function playPreparation(box: HTMLElement, answers: readonly string[], axes: readonly number[]): () => void {
  box.innerHTML = "";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Reduced motion: everything lands in its final state at once.
  const timing = (o: KeyframeAnimationOptions): KeyframeAnimationOptions => (reduce ? { ...o, duration: 1, delay: 0 } : o);

  const W = box.clientWidth;
  const H = box.clientHeight;
  const narrow = W < 640;
  const rows = Math.ceil(answers.length / 2);
  // Narrow screens: list on top, shape centred below, title at the bottom. Wide: list left, shape right.
  const rowH = narrow ? 7 : Math.min(20, (H - 28) / rows);
  const listBottom = 12 + rows * rowH;
  let cx: number, cy: number, R: number;
  if (narrow) {
    const top = listBottom + 28;
    const bottom = H - 64;
    R = Math.min(W * 0.32, (bottom - top) / 1.81); // the pentagon spans 1.81 R vertically
    cx = W / 2;
    cy = top + R + 6;
  } else {
    R = Math.min(W * 0.17, H * 0.36);
    cx = W * 0.74;
    cy = H * 0.54;
  }
  const tip = (d: number, k = 1): [number, number] => {
    const a = ((-90 + d * 72) * Math.PI) / 180;
    return [cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k];
  };

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));
  svg.style.cssText = "position:absolute;inset:0";
  box.appendChild(svg);
  const mk = (tag: string, attrs: Record<string, string | number>) => {
    const e = document.createElementNS(SVG_NS, tag) as SVGElement;
    for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    svg.appendChild(e);
    return e;
  };
  const fadeIn = (e: HTMLElement | SVGElement, delay: number, duration = 600) => {
    e.style.opacity = "0";
    e.animate([{ opacity: 0 }, { opacity: 1 }], timing({ duration, delay, fill: "forwards" }));
  };

  // The five axes.
  AXES.forEach((d) => {
    const [x, y] = tip(d);
    fadeIn(mk("line", { x1: cx, y1: cy, x2: x, y2: y, stroke: "#d3cbba", "stroke-width": 1 }), 1200);
  });

  // The summary rows fly to the point of their axis.
  const gap = 8;
  const colW = narrow ? (W - 32 - gap) / 2 : Math.min(230, (cx - R - 60 - gap) / 2);
  const fs = narrow ? 0 : Math.max(11, Math.min(13, rowH - 5));
  const dot = 8;
  answers.forEach((label, i) => {
    const x0 = 16 + (i % 2) * (colW + gap);
    const y0 = 12 + Math.floor(i / 2) * rowH;
    const h = Math.max(rowH - 2, 5);
    const row = document.createElement("div");
    row.style.cssText = `position:absolute;left:${x0}px;top:${y0}px;width:${colW}px;height:${h}px;font-size:${fs}px;line-height:${h}px;color:${NAVY};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid #e3ddd0`;
    if (!narrow) row.textContent = `Q${String(i + 1).padStart(2, "0")}  ${label}`;
    box.appendChild(row);
    const [tx, ty] = tip(axes[i] ?? 0);
    const tr = `translate(${tx - dot / 2 - x0}px,${ty - dot / 2 - y0}px)`;
    const start = { transform: "translate(0,0)", width: `${colW}px`, height: `${h}px`, borderRadius: "0", background: "rgba(0,0,0,0)", color: NAVY };
    const end = { transform: tr, width: `${dot}px`, height: `${dot}px`, borderRadius: "50%", background: NAVY, color: "rgba(0,0,0,0)", borderBottomColor: "rgba(0,0,0,0)" };
    row.animate(
      [start, { ...start, offset: 0.25 }, { ...end, opacity: 1, offset: 0.95 }, { ...end, opacity: 0 }],
      timing({ duration: 2000, delay: 300 + i * 35, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }),
    );
  });

  // One point at the end of each axis.
  AXES.forEach((d) => {
    const [x, y] = tip(d);
    fadeIn(mk("circle", { cx: x, cy: y, r: narrow ? 9 : 11, fill: "none", stroke: GOLD, "stroke-width": 1 }), 2700, 500);
    const c = mk("circle", { cx: x, cy: y, r: narrow ? 5 : 6, fill: NAVY, stroke: GOLD, "stroke-width": 2 });
    c.style.opacity = "0";
    c.style.transformBox = "fill-box";
    c.style.transformOrigin = "center";
    c.animate(
      [{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1.25)", offset: 0.6 }, { opacity: 1, transform: "scale(1)" }],
      timing({ duration: 500, delay: 2250 + d * 40, fill: "forwards" }),
    );
  });

  // The outline draws itself between the five points, then the inner web appears.
  const outlinePts = AXES.map((d) => tip(d).join(",")).join(" ");
  const L = 5 * 2 * R * Math.sin(Math.PI / 5);
  const outline = mk("polygon", { points: outlinePts, fill: TEAL, "fill-opacity": 0, stroke: TEAL, "stroke-width": 1.6, "stroke-linejoin": "round", "stroke-dasharray": L, "stroke-dashoffset": L });
  outline.animate(
    [{ strokeDashoffset: L, fillOpacity: 0 }, { strokeDashoffset: 0, fillOpacity: 0, offset: 0.7 }, { strokeDashoffset: 0, fillOpacity: 0.06 }],
    timing({ duration: 1300, delay: 2800, fill: "forwards" }),
  );
  [0.2, 0.4, 0.6, 0.8].forEach((k) => {
    fadeIn(mk("polygon", { points: AXES.map((d) => tip(d, k).join(",")).join(" "), fill: "none", stroke: "#cfc7b4", "stroke-width": 1 }), 3300, 800);
  });

  // A light gold shape whose high point glides from one axis to the next (same for everyone).
  const live = mk("polygon", { points: outlinePts, fill: GOLD, "fill-opacity": 0.28, stroke: GOLD, "stroke-width": 2, "stroke-linejoin": "round" });
  const liveDots = AXES.map(() => mk("circle", { r: narrow ? 4 : 5, fill: "#fff", stroke: GOLD, "stroke-width": 2 }));
  const frame = (f: number) => {
    const pts: string[] = [];
    AXES.forEach((d) => {
      let dist = Math.abs(d - f) % 5;
      dist = Math.min(dist, 5 - dist);
      const bump = Math.exp((-dist * dist) / 0.55); // 1 on the focused point, fading on its neighbours
      const [x, y] = tip(d, 0.12 + 0.75 * (0.42 + 0.46 * bump));
      pts.push(`${x},${y}`);
      liveDots[d].setAttribute("cx", String(x));
      liveDots[d].setAttribute("cy", String(y));
    });
    live.setAttribute("points", pts.join(" "));
  };
  frame(0);
  [live, ...liveDots].forEach((e) => fadeIn(e, 3600, 700));
  let raf = 0;
  if (!reduce) {
    const startAt = performance.now() + 3600;
    const SEG = 1800; // ms to move to the next point
    const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const tick = (now: number) => {
      const el = Math.max(0, now - startAt);
      frame(Math.floor(el / SEG) + ease((el % SEG) / SEG));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  const title = document.createElement("p");
  title.style.cssText = narrow
    ? `position:absolute;left:16px;right:16px;bottom:18px;margin:0;text-align:center;font:500 18px/1.3 var(--font-heading),Montserrat,sans-serif;color:${NAVY}`
    : `position:absolute;left:32px;top:${cy}px;margin:0;transform:translateY(-50%);width:${Math.max(160, cx - R - 80)}px;font:500 clamp(20px,2.4vw,26px)/1.3 var(--font-heading),Montserrat,sans-serif;color:${NAVY}`;
  title.textContent = "Votre valeur prend forme.";
  box.appendChild(title);
  fadeIn(title, 3800, 700);

  return () => {
    cancelAnimationFrame(raf);
    box.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    box.innerHTML = "";
  };
}
