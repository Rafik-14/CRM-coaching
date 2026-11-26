"use client";

import { useEffect, useRef } from "react";
import { DIMENSION_NAMES, DIMENSIONS } from "@/lib/revelateur/scoring";
import { MONOGRAM_LETTERS, MONOGRAM_MARK, MONOGRAM_VIEWBOX } from "../monogram";
import { gsap, useGSAP } from "./gsap";
import { FILM } from "./film-timing";

/**
 * Le Révélateur — the motion-design opening that plays after « Touchez l’écran » (20 s, skippable).
 * Eight beats built from the validated intro lines: the giant « Vous », an aurora field that condenses
 * into a pill, a dot burst, the five dimensions, the 30 questions, a giant « révéler », a typed title, then the JG® monogram.
 * Transforms and opacity only (plus one small canvas), so it stays fluid on phones. The sound score in
 * audio.ts is timed on the same constants (film-timing.ts).
 */
const BARS = 9;
const STAT_BARS = 14;
const TITLE = "Le Révélateur";

export function IntroFilm({
  playing,
  lines,
  onDone,
}: {
  playing: boolean;
  lines: { presents: string; youHave: string; unique: string; dims: string; facts: string; lead: string };
  onDone: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const film = useRef<gsap.core.Timeline | null>(null);
  const done = useRef(false);
  const finish = useRef(onDone);
  useEffect(() => {
    finish.current = onDone;
  }, [onDone]);
  // Load the heavy weights used by the film while « Touchez l’écran » is shown, so no beat waits for a
  // font (the first use of a weight froze the page for up to 0.4 s), and rasterise the dot canvas once.
  useEffect(() => {
    const fam = getComputedStyle(root.current ?? document.body).getPropertyValue("--font-montserrat").trim();
    if (fam) for (const w of [500, 600, 700, 800]) document.fonts?.load(`${w} 40px ${fam}`, "Vous révéler 0123456789 ?").catch(() => {});
    drawDots(canvas.current, 0);
  }, []);
  const end = () => {
    if (done.current) return;
    done.current = true;
    finish.current();
  };

  // « Savez-vous ce qui vous rend unique ? » → the question above, the last word in the pill.
  const q = lines.unique.replace(/\s*\?$/, "");
  const cut = q.lastIndexOf(" ");
  const question = q.slice(0, cut);
  const pillWord = `${q.slice(cut + 1)} ?`;
  const [dimsKicker] = lines.dims.split(". ");
  const [factQuestions, ...factRest] = lines.facts.split(" · ");
  const statNumber = parseInt(factQuestions, 10) || 30;
  const statLabel = factQuestions.replace(/^\d+\s*/, "");
  // « Une expérience pour révéler ce qui vous distingue. » → small · GIANT · small
  const leadAt = lines.lead.search(/r[ée]v[ée]ler/i);
  const leadBefore = leadAt > 0 ? lines.lead.slice(0, leadAt).trim() : lines.lead;
  const leadWord = leadAt > 0 ? lines.lead.slice(leadAt).split(" ")[0] : "";
  const leadAfter = leadAt > 0 ? lines.lead.slice(leadAt + leadWord.length).trim() : "";
  const words = (t: string) =>
    t.split(" ").map((w, i) => (
      <span key={i} className="ivf-wd">
        {w}
      </span>
    ));

  useGSAP(
    () => {
      // Built (paused) as soon as the page is ready, so the tap only presses play: creating ~150 tweens
      // and their first style reads on the tap itself froze the first frame.
      if (!root.current) return;
      const r = root.current;
      const $ = (s: string) => r.querySelector(s) as HTMLElement;
      const $$ = (s: string) => Array.from(r.querySelectorAll(s)) as HTMLElement[];
      const tl = gsap.timeline({ paused: true, defaults: { ease: "dr.cinema" }, onComplete: end });
      film.current = tl;
      // Dev only: lets the preview video be rendered frame by frame (scratch script), never in production.
      if (process.env.NODE_ENV !== "production") (window as unknown as { __ivf?: gsap.core.Timeline }).__ivf = tl;
      const T = FILM;

      // ── 1 · « Vous » — giant gradient letters sweeping in, the camera drifting ─────────────
      tl.set(".ivf-s1", { autoAlpha: 1 }, 0)
        .fromTo(".ivf-word", { xPercent: 16 }, { xPercent: -8, duration: T.aurora, ease: "none" }, 0)
        .fromTo(
          ".ivf-giant",
          { yPercent: 115, scaleY: 1.7, skewX: -14, autoAlpha: 0 },
          { yPercent: 0, scaleY: 1, skewX: 0, autoAlpha: 1, duration: 0.8, stagger: T.vousStep },
          T.vous,
        )
        .to(".ivf-giant", { yPercent: -40, scaleY: 0.6, autoAlpha: 0, duration: 0.34, stagger: 0.04, ease: "dr.exit" }, T.aurora - 0.12)
        .set(".ivf-s1", { autoAlpha: 0 });

      // ── 2 · the aurora field, then it condenses into a pill ───────────────────────────────
      tl.set(".ivf-s2", { autoAlpha: 1 }, T.aurora)
        .fromTo(".ivf-field", { scale: 0.72 }, { scale: 1, duration: 2 }, T.aurora)
        .fromTo(".ivf-bar", { scaleY: 0 }, { scaleY: 1, duration: 0.85, stagger: { amount: 0.36, from: "center" } }, T.aurora);
      $$(".ivf-bar").forEach((b, i) =>
        tl.to(b, { scaleY: 0.78 + ((i * 37) % 23) / 100, yPercent: ((i * 13) % 9) - 4, duration: 0.72, repeat: 3, yoyo: true, ease: "sine.inOut" }, T.aurora + 0.85),
      );
      tl.fromTo(".ivf-a1 .ivf-ch", { autoAlpha: 0, yPercent: 60 }, { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: 0.022 }, T.aurora + 0.25)
        .to(".ivf-a1", { autoAlpha: 0, y: -16, duration: 0.3, ease: "dr.exit" }, T.question - 0.1)
        .fromTo(".ivf-a2 .ivf-wd", { autoAlpha: 0, yPercent: 70 }, { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: 0.06 }, T.question)
        .to(".ivf-field", { scaleX: 0.36, scaleY: 0.13, autoAlpha: 0, duration: 0.62, ease: "power3.in" }, T.condense)
        .to(".ivf-a2", { y: () => -$(".ivf-pill").offsetHeight * 0.95, duration: 0.6 }, T.condense)
        .fromTo(".ivf-pill", { scaleX: 1.35, scaleY: 1.9, autoAlpha: 0 }, { scaleX: 1, scaleY: 1, autoAlpha: 1, duration: 0.6 }, T.condense + 0.22)
        .fromTo(".ivf-pill-t .ivf-ch", { autoAlpha: 0, yPercent: 80 }, { autoAlpha: 1, yPercent: 0, duration: 0.42, stagger: 0.03 }, T.condense + 0.42)
        // the pill collapses to a gold dot…
        .to(".ivf-a2", { autoAlpha: 0, duration: 0.25 }, T.dot - 0.3)
        .to(".ivf-pill-t", { autoAlpha: 0, duration: 0.16 }, T.dot - 0.3)
        .to(".ivf-pill", { width: () => $(".ivf-pill").offsetHeight, duration: 0.3, ease: "power2.in" }, T.dot - 0.3)
        .to(".ivf-pill", { scale: 0.16, backgroundColor: "#E2C08A", backgroundImage: "none", duration: 0.22, ease: "power2.in" }, T.dot);

      // ── 3 · … which bursts into a field of dots ─────────────────────────────────────────
      const burst = { p: 0 };
      tl.set(".ivf-pill", { autoAlpha: 0 }, T.burst + 0.03)
        .set(".ivf-s2", { autoAlpha: 0 }, T.burst + 0.05)
        .set(".ivf-dots", { autoAlpha: 1 }, T.burst)
        .to(burst, { p: 1, duration: 1, ease: "none", onUpdate: () => drawDots(canvas.current, burst.p) }, T.burst)
        .set(".ivf-dots", { autoAlpha: 0 }, T.burst + 1.02);

      // ── 4 · the five dimensions, one after the other ─────────────────────────────────────
      const items = $$(".ivf-item");
      tl.set(".ivf-s4", { autoAlpha: 1 }, T.dims)
        .fromTo(".ivf-kicker", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5 }, T.dims)
        .fromTo(items, { x: 90, autoAlpha: 0 }, { x: 0, autoAlpha: (i: number) => (i === 0 ? 1 : 0.16), duration: 0.62, stagger: 0.05 }, T.dims + 0.05)
        .fromTo(".ivf-dot", { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(2.4)" }, T.dims + 0.3)
        .fromTo(".ivf-count", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, T.dims + 0.3);
      for (let i = 1; i < items.length; i++) {
        const at = T.dims + 0.62 + (i - 1) * T.dimStep;
        tl.to(".ivf-rail", { y: () => -items[0].offsetHeight * i, duration: 0.42 }, at)
          .to(items[i - 1], { autoAlpha: 0.16, duration: 0.3 }, at)
          .to(items[i], { autoAlpha: 1, duration: 0.3 }, at + 0.08)
          .fromTo(".ivf-dot", { scale: 0.55 }, { scale: 1, duration: 0.36, ease: "back.out(3)" }, at + 0.06)
          .set(".ivf-count-n", { textContent: String(i + 1).padStart(2, "0") }, at + 0.1);
      }
      tl.to(".ivf-s4", { autoAlpha: 0, y: -26, duration: 0.36, ease: "dr.exit" }, T.stat - 0.3);

      // ── 5 · 30 questions — count-up over rising bars ────────────────────────────────────
      const count = { n: 0 };
      tl.set(".ivf-s5", { autoAlpha: 1 }, T.stat)
        .fromTo(".ivf-sbar", { scaleY: 0 }, { scaleY: 1, duration: 0.95, stagger: 0.035 }, T.stat)
        .fromTo(".ivf-num", { autoAlpha: 0, scale: 0.86 }, { autoAlpha: 1, scale: 1, duration: 0.6 }, T.stat + 0.05)
        .to(count, { n: statNumber, duration: 0.95, ease: "power2.out", onUpdate: () => void ($(".ivf-num").textContent = String(Math.round(count.n))) }, T.stat + 0.05)
        .fromTo(".ivf-stat-l", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12 }, T.stat + 0.72)
        .to([".ivf-num", ".ivf-stat-l"], { autoAlpha: 0, y: -20, duration: 0.32, ease: "dr.exit" }, T.lead - 0.3)
        .to(".ivf-sbar", { yPercent: 100, duration: 0.4, stagger: 0.015, ease: "dr.exit" }, T.lead - 0.32)
        .set(".ivf-s5", { autoAlpha: 0 }, T.lead + 0.1);

      // ── 6 · « Une expérience pour » · giant « révéler » · « ce qui vous distingue. » ───────
      tl.set(".ivf-s6l", { autoAlpha: 1 }, T.lead)
        .fromTo(".ivf-l1 .ivf-wd", { autoAlpha: 0, yPercent: 70 }, { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: 0.07 }, T.lead)
        .fromTo(".ivf-big", { yPercent: 105, scaleY: 1.8, skewX: -12, autoAlpha: 0 }, { yPercent: 0, scaleY: 1, skewX: 0, autoAlpha: 1, duration: 0.75, stagger: 0.05 }, T.leadWord)
        .fromTo(".ivf-bigword", { scale: 1.06 }, { scale: 0.98, duration: T.type - T.leadWord, ease: "none" }, T.leadWord)
        .fromTo(".ivf-l2 .ivf-wd", { autoAlpha: 0, yPercent: 70 }, { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: 0.07 }, T.leadWord + 0.45)
        .to(".ivf-s6l", { autoAlpha: 0, scale: 0.94, duration: 0.35, ease: "dr.exit" }, T.type - 0.3)
        .set(".ivf-s6l", { autoAlpha: 0 }, T.type + 0.1);

      // ── 7 · the title typed into a glass pill, then « sent » ─────────────────────────────
      tl.set(".ivf-s6", { autoAlpha: 1 }, T.type)
        .fromTo(".ivf-glow", { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.8 }, T.type)
        .fromTo(".ivf-box", { scaleX: 0.25, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: 0.55 }, T.type + 0.05);
      $$(".ivf-key").forEach((k, i) => tl.set(k, { display: "inline" }, T.typing + i * T.keyStep));
      tl.fromTo(".ivf-send", { scale: 0.3, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(2.6)" }, T.send - 0.3)
        .to(".ivf-send", { scale: 0.8, duration: 0.09, ease: "power2.in" }, T.send)
        .to(".ivf-send", { scale: 1, duration: 0.3, ease: "back.out(3)" }, T.send + 0.09)
        .to(".ivf-box", { scale: 1.14, autoAlpha: 0, duration: 0.3, ease: "dr.exit" }, T.send + 0.12)
        .to(".ivf-glow", { scale: 2.2, autoAlpha: 0, duration: 0.6, ease: "dr.exit" }, T.send + 0.12)
        .set(".ivf-s6", { autoAlpha: 0 }, T.logo + 0.4);

      // ── 8 · the JG® monogram and « présente » ───────────────────────────────────────────
      tl.set(".ivf-s7", { autoAlpha: 1 }, T.logo)
        .fromTo(".ivf-mono", { scale: 1.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.15 }, T.logo)
        .fromTo(".ivf-mark", { x: -34, y: 34, autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, duration: 0.9 }, T.logo + 0.3)
        .fromTo("#ivf-sheen", { attr: { gradientTransform: "translate(-1.2 0)" } }, { attr: { gradientTransform: "translate(1.2 0)" }, duration: 1.3, ease: "power2.inOut" }, T.logo + 0.45)
        .fromTo(".ivf-presents", { autoAlpha: 0, letterSpacing: "0.7em" }, { autoAlpha: 1, letterSpacing: "0.26em", duration: 1.2 }, T.logo + 0.55)
        .to({}, { duration: T.end - T.logo - 1.75 }, T.logo + 1.75);

      tl.fromTo(".ivf-skip", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.8);
      return () => {
        tl.kill();
        film.current = null;
      };
    },
    { scope: root },
  );
  // Warm-up while « Touchez l’écran » waits: every scene is shown once, almost transparent, so the GPU
  // rasterises its layers before the tap (the first appearance of each scene otherwise cost a stutter).
  const warming = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    (async () => {
      await document.fonts?.ready;
      await wait(700);
      const tl = film.current, el = root.current;
      if (cancelled || !tl || !el || tl.isActive() || done.current) return;
      warming.current = true;
      el.style.opacity = "0.004";
      const F = FILM;
      for (const at of [0.9, F.aurora + 1, F.condense + 0.7, F.burst + 0.4, F.dims + 1, F.stat + 1.2, F.leadWord + 0.6, F.send - 0.3, F.logo + 1.5]) {
        if (cancelled || !warming.current) break;
        tl.seek(at, true);
        await frame();
      }
      if (warming.current) {
        tl.pause(0, true);
        el.style.opacity = "";
        warming.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    warming.current = false;
    if (root.current) root.current.style.opacity = "";
    film.current?.play(0);
  }, [playing]);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && end();
    window.addEventListener("keydown", onKey);
    const safety = window.setTimeout(() => {
      if (!(window as unknown as { __ivfRender?: boolean }).__ivfRender) end(); // the dev video render seeks slowly
    }, (FILM.end + 3) * 1000); // never trapped behind the film
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(safety);
    };
  }, [playing]);

  const chars = (s: string) =>
    [...s].map((c, i) => (
      <span key={i} className="ivf-ch">
        {c === " " ? " " : c}
      </span>
    ));

  return (
    <div ref={root} className="ivf" aria-hidden={!playing}>
      <div className="ivf-scene ivf-s1">
        <div className="ivf-word">
          {[..."Vous"].map((c, i) => (
            <span key={i} className="ivf-giant" style={{ backgroundPosition: `${12 + i * 26}% ${i * 30}%` }}>
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="ivf-scene ivf-s2">
        <div className="ivf-field">
          {Array.from({ length: BARS }, (_, i) => (
            <i key={i} className="ivf-bar" />
          ))}
        </div>
        <p className="ivf-line ivf-a1">{chars(lines.youHave)}</p>
        <p className="ivf-line ivf-a2">
          {question.split(" ").map((w, i) => (
            <span key={i} className="ivf-wd">
              {w}
            </span>
          ))}
        </p>
        <div className="ivf-pill">
          <span className="ivf-pill-t">{chars(pillWord)}</span>
        </div>
      </div>

      <canvas ref={canvas} className="ivf-dots" />

      <div className="ivf-scene ivf-s4">
        <p className="ivf-kicker">{dimsKicker}</p>
        <div className="ivf-list">
          <span className="ivf-dot" />
          <div className="ivf-window">
            <div className="ivf-rail">
              {DIMENSIONS.map((d) => (
                <p key={d} className="ivf-item">
                  {DIMENSION_NAMES[d]}
                </p>
              ))}
            </div>
          </div>
        </div>
        <p className="ivf-count">
          <span className="ivf-count-n">01</span> / 05
        </p>
      </div>

      <div className="ivf-scene ivf-s5">
        <div className="ivf-chart">
          {Array.from({ length: STAT_BARS }, (_, i) => (
            <i key={i} className="ivf-sbar" style={{ height: `${18 + Math.round(((i + 1) / STAT_BARS) ** 1.6 * 62) + ((i * 7) % 3) * 4}%` }} />
          ))}
        </div>
        <div className="ivf-stat">
          <p className="ivf-num">0</p>
          <p className="ivf-stat-l ivf-stat-label">{statLabel}</p>
          <p className="ivf-stat-l ivf-stat-sub">{factRest.join(" · ")}</p>
        </div>
      </div>

      <div className="ivf-scene ivf-s6l">
        <p className="ivf-line ivf-l1">{words(leadBefore)}</p>
        <p className="ivf-bigword">
          {[...leadWord].map((c, i) => (
            <span key={i} className="ivf-big" style={{ backgroundPosition: `${8 + i * 14}% ${i * 16}%` }}>
              {c}
            </span>
          ))}
        </p>
        <p className="ivf-line ivf-l2">{words(leadAfter)}</p>
      </div>

      <div className="ivf-scene ivf-s6">
        <div className="ivf-glow" />
        <div className="ivf-box">
          <span className="ivf-typed">
            {[...TITLE].map((c, i) => (
              <span key={i} className="ivf-key">
                {c === " " ? " " : c}
              </span>
            ))}
            <i className="ivf-caret" />
          </span>
          <span className="ivf-send">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </span>
        </div>
      </div>

      <div className="ivf-scene ivf-s7">
        <svg className="ivf-mono" viewBox={MONOGRAM_VIEWBOX}>
          <defs>
            <linearGradient id="ivf-sheen" x1="0" y1="0" x2="1" y2="0.35" gradientUnits="objectBoundingBox">
              <stop offset="0.3" stopColor="#F8F6F2" />
              <stop offset="0.5" stopColor="#FFF6E2" />
              <stop offset="0.56" stopColor="#E2C08A" />
              <stop offset="0.7" stopColor="#F8F6F2" />
            </linearGradient>
          </defs>
          <path d={MONOGRAM_LETTERS} fill="url(#ivf-sheen)" fillRule="evenodd" />
          <path className="ivf-mark" d={MONOGRAM_MARK} fill="#D4A866" fillRule="evenodd" />
        </svg>
        <p className="ivf-presents">{lines.presents}</p>
      </div>

      <button type="button" className="ivf-skip" onClick={end} tabIndex={playing ? 0 : -1} style={{ pointerEvents: playing ? "auto" : "none" }}>
        Passer
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Dot burst: a grid of dots ignites in a ring travelling out from the centre, then goes out.
// ---------------------------------------------------------------------------------------------
const DOT_COLOURS = ["#E2C08A", "#D4A866", "#86A9CF", "#F4E6C8", "#CF8E45", "#5E84B5"];
let grid: { x: number; y: number; d: number; c: string; j: number }[] | null = null;
let gridKey = "";

function drawDots(cv: HTMLCanvasElement | null, p: number) {
  if (!cv) return;
  const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const key = `${w}x${h}@${dpr}`;
  if (gridKey !== key) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const gap = w < 640 ? 17 : 22, cx = w / 2, cy = h / 2, max = Math.hypot(cx, cy);
    grid = [];
    let k = 0;
    for (let y = gap / 2; y < h; y += gap)
      for (let x = gap / 2; x < w; x += gap) {
        k++;
        grid.push({ x, y, d: Math.hypot(x - cx, y - cy) / max, c: DOT_COLOURS[(k * 7 + Math.floor(y)) % DOT_COLOURS.length], j: ((k * 9301 + 49297) % 233280) / 233280 });
      }
    gridKey = key;
  }
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const front = p * 1.45; // the ring's position (0 = centre, 1 = corners)
  for (const g of grid!) {
    const t = (front - g.d - g.j * 0.12) / 0.38; // 0 → 1 while the ring passes this dot
    if (t <= 0 || t >= 1) continue;
    const s = Math.sin(Math.PI * t); // grows then fades
    ctx.globalAlpha = s * (1 - g.d * 0.45);
    ctx.fillStyle = g.c;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 0.6 + s * (w < 640 ? 2.1 : 2.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
