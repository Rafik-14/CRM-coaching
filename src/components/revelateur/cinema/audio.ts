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

  /** Gentle chord when the answers are confirmed. */
  playReveal() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    [130.81, 196, 261.63, 329.63, 392, 493.88].forEach((f, i) => this.tone(ctx, i < 2 ? "sine" : "triangle", f, now + i * 0.06, 0.024, 3.2, [1400, 420]));
  }
}

export const cinemaAudio = new CinemaAudio();
