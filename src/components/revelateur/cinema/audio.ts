"use client";

/**
 * Synthesised sound design of the Révélateur (Web Audio, no files), ported from the approved prototype.
 * Kept quiet. The person can switch it off; the choice is remembered on this device.
 */
const KEY = "jg_rv_sound";

class CinemaAudio {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private on = true;

  constructor() {
    try {
      if (typeof window !== "undefined") this.on = window.localStorage.getItem(KEY) !== "off";
    } catch {}
  }

  get enabled() {
    return this.on;
  }

  setEnabled(v: boolean) {
    this.on = v;
    try {
      window.localStorage.setItem(KEY, v ? "on" : "off");
    } catch {}
  }

  private ensure(): AudioContext | null {
    if (!this.on || typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      try {
        this.ctx = new Ctx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    if (!this.noise) {
      const len = this.ctx.sampleRate * 1.2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    return this.ctx;
  }

  private tone(ctx: AudioContext, type: OscillatorType, f: number, start: number, peak: number, dur: number, lp?: [number, number]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(peak, start + Math.min(0.12, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    if (lp) {
      const fl = ctx.createBiquadFilter();
      fl.type = "lowpass";
      fl.frequency.setValueAtTime(lp[0], start);
      fl.frequency.exponentialRampToValueAtTime(lp[1], start + dur);
      o.connect(fl).connect(g);
    } else o.connect(g);
    g.connect(ctx.destination);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  /** Dry click for small controls. */
  playTick() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(320, now);
    o.frequency.exponentialRampToValueAtTime(180, now + 0.06);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.03, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    o.connect(g).connect(ctx.destination);
    o.start(now);
    o.stop(now + 0.08);
  }

  /** Fine detent while moving across the five positions. */
  playDialTick(stop: number) {
    const ctx = this.ensure();
    if (!ctx || !this.noise) return;
    const now = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise;
    f.type = "bandpass";
    f.frequency.setValueAtTime(2400 + stop * 260, now);
    f.Q.setValueAtTime(6.5, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(now, Math.random() * 0.3, 0.025);
  }

  /** A soft air pass and a warm note when an answer is chosen. */
  playBeamPass(col: number) {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.noise) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = this.noise;
      f.type = "bandpass";
      f.frequency.setValueAtTime(220 + col * 60, now);
      f.frequency.exponentialRampToValueAtTime(980 + col * 140, now + 0.24);
      f.frequency.exponentialRampToValueAtTime(240, now + 0.62);
      f.Q.setValueAtTime(1.8, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.05, now + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.66);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(now, 0, 0.7);
    }
    const root = ({ 1: 220, 2: 261.63, 3: 293.66, 4: 329.63, 5: 392 } as Record<number, number>)[col] ?? 293.66;
    this.tone(ctx, "sine", root, now + 0.02, 0.04, 0.95, [920, 300]);
    this.tone(ctx, "triangle", root * 1.5, now + 0.02, 0.016, 0.95, [920, 300]);
  }

  /** Low swell between two series. */
  playActInterlude() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(65.41, now);
    o.frequency.linearRampToValueAtTime(73.42, now + 1.2);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.08, now + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);
    o.connect(g).connect(ctx.destination);
    o.start(now);
    o.stop(now + 1.6);
  }

  /** A short reverb tail (generated, no file) so the overture sounds like a room, not a synth. */
  private room(ctx: AudioContext, seconds = 3.2) {
    const len = Math.floor(ctx.sampleRate * seconds), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    return conv;
  }

  /**
   * The overture under the logo reveal (≈5 s), timed on the drawing: a deep swell and rising air while
   * the letters draw, a soft low impact when the gold mark lands (~2.3 s), then a warm chord that opens
   * as the curtain lifts (~3.6 s) and fades out.
   */
  playOverture() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    const master = ctx.createGain(), wet = ctx.createGain(), verb = this.room(ctx);
    master.gain.value = 0.9;
    wet.gain.value = 0.55;
    master.connect(ctx.destination);
    master.connect(verb).connect(wet).connect(ctx.destination);
    const out = master;

    // 1. Deep swell (C1 → C2 octave rising slowly), the floor of the room.
    const sub = ctx.createOscillator(), subG = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(32.7, t);
    sub.frequency.exponentialRampToValueAtTime(65.4, t + 3.4);
    subG.gain.setValueAtTime(0.0001, t);
    subG.gain.exponentialRampToValueAtTime(0.16, t + 2.2);
    subG.gain.exponentialRampToValueAtTime(0.0001, t + 5.2);
    sub.connect(subG).connect(out);
    sub.start(t);
    sub.stop(t + 5.3);

    // 2. Rising air (filtered noise) while the monogram draws itself.
    if (this.noise) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = this.noise;
      src.loop = true;
      f.type = "bandpass";
      f.Q.value = 0.9;
      f.frequency.setValueAtTime(180, t);
      f.frequency.exponentialRampToValueAtTime(2400, t + 2.25);
      f.frequency.exponentialRampToValueAtTime(500, t + 3.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 2.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      src.connect(f).connect(g).connect(out);
      src.start(t);
      src.stop(t + 2.7);
    }

    // 3. The gold mark lands: a soft, low impact.
    const hit = t + 2.3, boom = ctx.createOscillator(), bg = ctx.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(90, hit);
    boom.frequency.exponentialRampToValueAtTime(38, hit + 0.5);
    bg.gain.setValueAtTime(0.0001, hit);
    bg.gain.linearRampToValueAtTime(0.22, hit + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.0001, hit + 1.4);
    boom.connect(bg).connect(out);
    boom.start(hit);
    boom.stop(hit + 1.5);

    // 4. The curtain lifts: a warm, slowly opening chord with a faint glassy shimmer on top.
    const open = t + 3.3;
    [65.41, 130.81, 196, 261.63, 329.63, 392, 493.88].forEach((f, i) =>
      this.tone(ctx, i < 2 ? "sine" : "triangle", f, open + i * 0.05, i < 2 ? 0.05 : 0.02, 4.2, [600, 2400]),
    );
    [1046.5, 1318.5, 1568].forEach((f, i) => this.tone(ctx, "sine", f, open + 0.25 + i * 0.12, 0.006, 3.2));
  }

  /** A first touch during the reveal lets the queued overture play. */
  wake() {
    if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {});
  }

  /** After the reveal: if the browser never let the overture start, drop it so it cannot play late. */
  dropIfSilent() {
    if (this.ctx && this.ctx.state !== "running") {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.noise = null;
    }
  }

  /** Gentle chord when the answers are confirmed. */
  playReveal() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    [130.81, 196, 261.63, 329.63, 392, 493.88].forEach((f, i) => this.tone(ctx, i < 2 ? "sine" : "triangle", f, now + i * 0.06, 0.024, 3.2, [1400, 420]));
  }
}

export const cinemaAudio = new CinemaAudio();
