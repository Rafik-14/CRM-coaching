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
    if (!v) this.stopBed();
    else this.startBed();
    try {
      window.localStorage.setItem(KEY, v ? "on" : "off");
    } catch {}
  }

  private roomIR: AudioBuffer | null = null;

  /**
   * Builds the audio engine, the noise and the reverb ahead of time (allowed before any gesture: the
   * context simply stays suspended). Creating them on the tap froze the page for ~0.3 s.
   */
  prepare() {
    if (!this.on || typeof window === "undefined" || this.ctx) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    try {
      this.ctx = new Ctx();
    } catch {
      return;
    }
    this.makeNoise(this.ctx);
    this.roomIR = this.makeRoom(this.ctx);
  }

  private makeNoise(ctx: AudioContext) {
    if (this.noise) return;
    const len = ctx.sampleRate * 1.2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
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
    this.makeNoise(this.ctx);
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
  private room(ctx: AudioContext) {
    this.roomIR ??= this.makeRoom(ctx);
    const conv = ctx.createConvolver();
    conv.buffer = this.roomIR;
    return conv;
  }

  private makeRoom(ctx: AudioContext, seconds = 3.2) {
    const len = Math.floor(ctx.sampleRate * seconds), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return ir;
  }

  /**
   * The overture under the logo reveal (≈5 s), timed on the drawing: a deep swell and rising air while
   * the letters draw, a soft low impact when the gold mark lands (~2.3 s), then a warm chord that opens
   * as the curtain lifts (~3.6 s) and fades out.
   */
  playOverture(now = false) {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state !== "running" && !now) {
      // Sound not allowed yet: it opens on the first touch instead (see wake()).
      this.overturePending = true;
      ctx.resume().then(() => {
        if (this.overturePending && ctx.state === "running") {
          this.overturePending = false;
          this.playOverture(true);
          this.startBed();
        }
      }).catch(() => {});
      return;
    }
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
    this.startBed();
  }

  private overturePending = false;
  private bed: { gain: GainNode; stop: () => void } | null = null;

  /** True once the browser lets this page play sound. */
  get audible() {
    return this.ctx?.state === "running";
  }

  /**
   * First click / tap / key on the page. If the browser held the overture back, it plays now (so the
   * immersion still opens with its sound), then the quiet ambient bed starts.
   */
  wake() {
    if (!this.on) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const go = () => {
      if (this.overturePending) {
        this.overturePending = false;
        this.playOverture(true);
      }
      this.startBed();
    };
    if (ctx.state === "running") go();
    else ctx.resume().then(go).catch(() => {});
  }

  /** A very quiet, slowly breathing pad under the whole experience (two low voices + soft air). */
  startBed() {
    if (this.bed || !this.on) return;
    const ctx = this.ensure();
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime, gain = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.022, t + 6);
    lp.connect(gain).connect(ctx.destination);
    const voices = [65.41, 98.0, 130.81].map((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f * (1 + (i - 1) * 0.0015);
      g.gain.value = i === 0 ? 0.9 : 0.45;
      lfo.frequency.value = 0.05 + i * 0.03;
      lg.gain.value = 0.35;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(lp);
      o.start(t);
      lfo.start(t);
      return [o, lfo];
    });
    this.bed = {
      gain,
      stop: () => {
        const n = ctx.currentTime;
        gain.gain.cancelScheduledValues(n);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), n);
        gain.gain.exponentialRampToValueAtTime(0.0001, n + 1.2);
        voices.flat().forEach((o) => o.stop(n + 1.3));
      },
    };
  }

  stopBed() {
    this.bed?.stop();
    this.bed = null;
  }

  /** After the reveal: if the browser never let the overture start, drop it so it cannot play late. */
  dropIfSilent() {
    this.overturePending = false; // later touches only start the ambient bed
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
