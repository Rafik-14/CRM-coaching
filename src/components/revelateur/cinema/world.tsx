"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The living background of the Révélateur: a slow "liquid silk" in JG® navy, five soft light columns
 * while a statement is on screen, and a gentle light veil rising when an answer is chosen.
 * Ported from the approved prototype; palette moved to Jérémy's navy / gold / ivory / teal, and every
 * flash toned down. Everything is driven through the `world` object (no React re-render per frame).
 */
export type WorldStage = "landing" | "interlude" | "question" | "open" | "review" | "confirmed";

export const world = {
  stage: "landing" as WorldStage,
  index: 0, // current statement 0..29
  hovered: null as number | null, // 1..5
  passing: null as number | null, // 1..5, the column just chosen
  surge: 0, // incremented on each choice / confirmation
  gravityX: 0, // -1..1, pointer lean on the question screen
  gravityActive: false,
};

/** Writes to the shared background state (kept outside React on purpose: read every frame). */
export function setWorld(patch: Partial<typeof world>) {
  Object.assign(world, patch);
}
export function surgeWorld() {
  world.surge += 1;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime, uProgress, uBias, uPulse, uTilt, uBeamVis;
  uniform float uColGlow[5];
  uniform float uColPass[5];
  uniform vec2 uClickOrigin;
  uniform vec3 uClickColor;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float silkFbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 3; i++) { v += a * noise(p); p = m * p * 1.95 + vec2(1.4, 2.7); a *= 0.5; }
    return v;
  }
  // I teal-grey -> V JG gold
  vec3 columnTint(int idx) {
    if (idx == 0) return vec3(0.56, 0.71, 0.69);
    if (idx == 1) return vec3(0.76, 0.79, 0.78);
    if (idx == 2) return vec3(0.87, 0.81, 0.71);
    if (idx == 3) return vec3(0.88, 0.75, 0.54);
    return vec3(0.91, 0.80, 0.58);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    float c = cos(uTilt), s = sin(uTilt);
    vec2 pr = mat2(c, -s, s, c) * p;

    // 1. Liquid silk in JG navy
    vec3 base = vec3(0.055, 0.090, 0.140);
    vec3 actCool = vec3(0.082, 0.125, 0.180);
    vec3 actWarm = vec3(0.150, 0.125, 0.090);
    vec3 gold = vec3(0.83, 0.66, 0.40);
    vec3 ambient = mix(actCool, actWarm, smoothstep(0.05, 0.90, uProgress));

    vec2 q = vec2(
      silkFbm(pr * 1.12 + vec2(uTime * 0.024 - uBias * 0.20, uTime * 0.014)),
      silkFbm(pr * 1.12 + vec2(-uTime * 0.018, uTime * 0.022 + 3.1))
    );
    float fold = silkFbm(pr * 1.4 + q * 1.3 - vec2(uBias * 0.22, uTime * 0.016));
    float sheen = smoothstep(0.36, 0.86, fold);
    float crest = pow(smoothstep(0.52, 0.92, fold), 2.2);

    vec3 col = mix(base, ambient, sheen * (0.46 + uProgress * 0.24));
    float lowerGlow = exp(-pow((uv.y - 0.15) * 2.5, 2.0)) * (0.06 + uProgress * 0.12);
    float centerFocus = exp(-pow((pr.x - uBias * 0.35) * 1.35, 2.0));
    col += gold * lowerGlow * (0.45 + 0.55 * centerFocus);
    vec3 crestColor = mix(vec3(0.30, 0.50, 0.52), gold, 0.38 + uProgress * 0.62);
    col += crestColor * crest * (0.07 + uProgress * 0.09) * (1.0 - smoothstep(0.45, 0.98, uv.y) * 0.55);

    // 2. Five soft light columns (landscape) or five rising strata (portrait)
    if (uBeamVis > 0.005) {
      float dust = 0.0;
      {
        vec2 m1 = uv * vec2(38.0 * aspect, 38.0) + vec2(uTime * 0.18, -uTime * 0.42);
        vec2 id1 = floor(m1), f1 = fract(m1) - 0.5;
        float r1 = hash(id1);
        if (r1 > 0.88) {
          vec2 j = vec2(sin(uTime * 0.7 + r1 * 25.0), cos(uTime * 0.6 + r1 * 19.0)) * 0.28;
          dust += smoothstep(0.18, 0.0, length(f1 - j)) * (0.5 + 0.5 * sin(uTime * 2.4 + r1 * 40.0));
        }
      }
      float verticalEnv = smoothstep(1.02, 0.62, uv.y) * smoothstep(0.02, 0.18, uv.y);
      float bottomFade = smoothstep(0.02, 0.18, uv.y);
      float isPortrait = 1.0 - smoothstep(0.76, 0.94, aspect);
      float isLandscape = 1.0 - isPortrait;
      vec3 acc = vec3(0.0);
      float energy = 0.0;

      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float glow = uColGlow[i];
        float pass = uColPass[i];
        vec3 tint = columnTint(i);
        vec3 hot = mix(tint, vec3(0.97, 0.95, 0.90), 0.55);

        if (isLandscape > 0.01) {
          float colX = (fi + 0.5) * 0.20;
          float dx = (uv.x - colX) + (uv.y - 0.22) * uTilt * 0.28;
          float sigma = (0.024 + fi * 0.0045 + glow * 0.030 + pass * 0.040) * (0.42 + (1.0 - uv.y) * 0.95);
          float shaft = exp(-(dx * dx) / max(2.0 * sigma * sigma, 0.00005));
          float rn = silkFbm(vec2(dx * 34.0 + fi * 3.7, uv.y * 2.6 - uTime * 0.14));
          float stri = 0.72 + 0.52 * smoothstep(0.28, 0.82, rn);
          float coreSigma = 0.0032 + glow * 0.006 + pass * 0.010;
          float core = exp(-(dx * dx) / max(2.0 * coreSigma * coreSigma, 0.000004));
          float filament = exp(-abs(dx) * (620.0 - glow * 260.0 - pass * 200.0)) * smoothstep(0.76, 0.22, uv.y);
          vec2 pv = vec2((uv.x - colX) / (0.068 + glow * 0.045 + pass * 0.04), (uv.y - 0.135) / 0.036);
          float pool = exp(-dot(pv, pv) * 1.45) * (0.84 + 0.28 * sin(pv.x * 7.5 + uTime * 1.4 + fi) * cos(pv.y * 6.0 - uTime * 1.1));

          vec3 sc = tint * shaft * stri * verticalEnv * (0.055 + glow * 0.24 + pass * 0.26);
          sc += hot * core * verticalEnv * (0.03 + glow * 0.17 + pass * 0.20);
          sc += hot * filament * bottomFade * (0.06 + glow * 0.30 + pass * 0.28);
          sc += mix(tint, hot, 0.35) * pool * (0.05 + glow * 0.30 + pass * 0.28);
          acc += sc * isLandscape;
          energy += (shaft * verticalEnv + pool * 0.6) * (0.15 + glow * 0.85 + pass) * isLandscape;
        }

        if (isPortrait > 0.01) {
          float bandY = 0.118 + fi * 0.105;
          float dy = uv.y - bandY;
          float sy = 0.024 + glow * 0.024 + pass * 0.03;
          float sheet = exp(-(dy * dy) / max(2.0 * sy * sy, 0.00005));
          float hn = silkFbm(vec2(uv.x * 2.8 - uTime * 0.16, dy * 28.0 + fi * 2.9));
          float hs = 0.76 + 0.45 * smoothstep(0.28, 0.82, hn);
          float rb = 0.32 + 0.68 * smoothstep(0.02, 0.94, uv.x);
          float hf = exp(-abs(dy) * (420.0 - glow * 190.0 - pass * 140.0)) * smoothstep(0.0, 0.85, uv.x);
          vec2 tp = vec2((uv.x - 0.89) / (0.14 + glow * 0.08), dy / (0.042 + glow * 0.028));
          float tg = exp(-dot(tp, tp) * 1.4);
          vec3 bc = tint * sheet * hs * rb * (0.05 + glow * 0.24 + pass * 0.26);
          bc += hot * hf * (0.04 + glow * 0.24 + pass * 0.28);
          bc += mix(tint, hot, 0.4) * tg * (0.04 + glow * 0.28 + pass * 0.28);
          acc += bc * isPortrait;
          energy += (sheet * rb + tg * 0.7) * (0.15 + glow * 0.85 + pass) * isPortrait;
        }
      }
      col += (acc + vec3(0.97, 0.93, 0.82) * dust * clamp(energy, 0.0, 1.4) * 0.30) * uBeamVis;
    }

    // 3. A soft veil of light rising after a choice (kept faint: no flash)
    if (uPulse > 0.001 && uPulse < 0.999) {
      float sweepY = mix(0.06, 1.18, pow(uPulse, 0.82));
      float dy = uv.y - sweepY;
      float env = sin(uPulse * 3.14159265);
      float lead = exp(-pow(dy * 26.0, 2.0));
      float trail = smoothstep(-0.34, 0.0, dy) * (1.0 - smoothstep(0.0, 0.09, dy));
      float cd = abs(uv.x - uClickOrigin.x);
      float focus = 0.42 + 0.58 * exp(-(cd * cd) / 0.055);
      vec3 veil = mix(uClickColor, vec3(0.97, 0.95, 0.90), 0.5);
      col += veil * lead * focus * env * 0.13;
      col += uClickColor * trail * focus * env * 0.05;
      float mask = exp(-(cd * cd) / 0.0085);
      vec2 eu = vec2(uv.x * 46.0 * aspect, (uv.y - uPulse * 0.95) * 34.0);
      vec2 eid = floor(eu), ef = fract(eu) - 0.5;
      if (hash(eid + 9.4) > 0.78) {
        float ember = smoothstep(0.24, 0.0, length(vec2(ef.x * 1.9, ef.y * 0.65)));
        col += vec3(0.97, 0.93, 0.82) * ember * mask * env * 0.22;
      }
    }

    float vig = smoothstep(1.46, 0.24, length(p));
    col *= mix(0.70, 1.0, vig);
    col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.005;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const CLICK_COLORS: Record<number, [number, number, number]> = {
  1: [0.56, 0.71, 0.69],
  2: [0.76, 0.79, 0.78],
  3: [0.87, 0.81, 0.71],
  4: [0.88, 0.75, 0.54],
  5: [0.91, 0.8, 0.58],
};

const TARGETS: Record<WorldStage, (i: number) => { progress: number; beam: number }> = {
  landing: () => ({ progress: 0.16, beam: 0 }),
  interlude: (i) => ({ progress: 0.1 + (i / 29) * 0.74, beam: 0.25 }),
  question: (i) => ({ progress: 0.1 + (i / 29) * 0.74, beam: 1 }),
  open: () => ({ progress: 0.78, beam: 0 }),
  review: () => ({ progress: 0.78, beam: 0 }),
  confirmed: () => ({ progress: 0.56, beam: 0 }),
};

export function CinemaWorld() {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = mount.current;
    if (!box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "default" });
    } catch {
      return; // no WebGL: the navy background of the page stays
    }
    // The field is soft: rendering it at reduced resolution is invisible and cuts the GPU work 2–4×.
    const dpr = () => (coarse ? 0.5 : 0.7) * Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr());
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    box.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const glow = [0.24, 0.24, 0.24, 0.24, 0.24];
    const pass = [0, 0, 0, 0, 0];
    const u = {
      uTime: { value: 0 },
      uProgress: { value: 0.16 },
      uBias: { value: 0 },
      uPulse: { value: 0 },
      uTilt: { value: 0 },
      uBeamVis: { value: 0 },
      uColGlow: { value: glow },
      uColPass: { value: pass },
      uClickOrigin: { value: new THREE.Vector2(0.5, 0.275) },
      uClickColor: { value: new THREE.Vector3(0.88, 0.75, 0.54) },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, depthWrite: false, depthTest: false });
    scene.add(new THREE.Mesh(geo, mat));

    const onResize = () => {
      renderer.setPixelRatio(dpr());
      renderer.setSize(window.innerWidth, Math.max(window.innerHeight, 1));
      u.uResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0, last = performance.now(), acc = 0, lastSurge = world.surge, pulseT = -1, bias = 0, grav = 0;
    const minFrame = coarse ? 1000 / 32 : 0; // phones: about 30 fps is plenty for a slow background
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dtMs = now - last;
      acc += dtMs;
      last = now;
      if (document.hidden || acc < minFrame) return;
      const dt = Math.min(acc / 1000, 0.05);
      acc = 0;
      const k = (rate: number) => 1 - Math.exp(-dt * rate);

      const t = TARGETS[world.stage](world.index);
      u.uProgress.value += (t.progress - u.uProgress.value) * k(2.2);
      u.uBeamVis.value += (t.beam - u.uBeamVis.value) * k(2.2);

      grav += ((world.gravityActive ? world.gravityX : 0) - grav) * k(6);
      const hb = world.hovered ? (world.hovered - 3) / 2 : 0;
      bias += (hb * 0.45 - bias) * k(6);
      u.uBias.value = bias + grav * 0.65;
      u.uTilt.value = -grav * 0.065;

      for (let i = 0; i < 5; i++) {
        const n = i + 1;
        let tg = 0.26;
        if (world.passing !== null) tg = world.passing === n ? 1 : 0.03;
        else if (world.hovered !== null) tg = world.hovered === n ? 1 : 0.07;
        glow[i] += (tg - glow[i]) * k(7.5);
        pass[i] += ((world.passing === n ? 1 : 0) - pass[i]) * k(9);
      }

      if (world.surge !== lastSurge) {
        lastSurge = world.surge;
        pulseT = 0;
        const c = CLICK_COLORS[world.passing ?? 4];
        u.uClickColor.value.set(c[0], c[1], c[2]);
        u.uClickOrigin.value.set(((world.passing ?? 3) - 0.5) * 0.2, 0.275);
      }
      if (pulseT >= 0) {
        pulseT += dt / 1.15;
        u.uPulse.value = pulseT >= 1 ? 0 : 1 - Math.pow(1 - pulseT, 2);
        if (pulseT >= 1) pulseT = -1;
      }
      if (!reduce) u.uTime.value += dt;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mount} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
