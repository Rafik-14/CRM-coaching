"use client";

/**
 * Synthesised sound design of the Révélateur (Web Audio, no files), ported from the approved prototype.
 * Kept quiet. The person can switch it off; the choice is remembered on this device.
 */
import { FILM } from "./film-timing";

const KEY = "jg_rv_sound";
/** 0.1 s of silence (8 kHz, 8-bit mono WAV): played in a loop to put iOS in « playback » mode. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

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
    this.room(this.ctx);
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
  private verb: ConvolverNode | null = null;
  /** One convolver, built ahead (assigning its impulse runs an FFT that froze the tap for ~0.3 s). */
  private room(ctx: AudioContext) {
    if (!this.verb) {
      this.roomIR ??= this.makeRoom(ctx);
      this.verb = ctx.createConvolver();
      this.verb.buffer = this.roomIR;
    }
    return this.verb;
  }

  private makeRoom(ctx: AudioContext, seconds = 3.2) {
    const len = Math.floor(ctx.sampleRate * seconds), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return ir;
  }

  /** The sound score of the opening film (20 s), started by the tap. See filmScore(). */
  /**
   * Called on every real gesture until sound runs. Browsers only allow sound after a gesture they count as
   * « user activation »: on phones that is the finger lifting (pointerup / touchend / click), not pointerdown,
   * so the tap screen calls this on all of them. On iPhone, Web Audio also follows the silent switch unless the
   * page is a « playback » audio session: a silent media element (and audioSession where supported) sets that.
   */
  unlock() {
    if (!this.on) return;
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {}
    if (!this.silent && typeof Audio !== "undefined") {
      try {
        this.silent = new Audio(SILENT_WAV);
        this.silent.loop = true;
        this.silent.setAttribute("playsinline", "");
        this.silent.volume = 0.01;
        this.silent.play().catch(() => {
          this.silent = null; // retried on the next gesture
        });
      } catch {}
    }
    if (ctx.state !== "running") ctx.resume().catch(() => {});
  }
  private silent: HTMLAudioElement | null = null;
  /** When the film started (performance.now), so a late unlock joins the score where the picture is. */
  private filmT0: number | null = null;

  playOverture(now = false) {
    const ctx = this.ensure();
    if (!ctx) return;
    this.filmT0 ??= performance.now();
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
    // If the sound was only allowed after the film had started, start the score at the film's current point.
    const elapsed = Math.max(0, (performance.now() - this.filmT0) / 1000 - 0.05);
    if (elapsed > FILM.end) return this.startBed();
    const t = ctx.currentTime + 0.05 - elapsed;
    const master = ctx.createGain(), wet = ctx.createGain(), verb = this.room(ctx);
    master.gain.value = 0.9;
    wet.gain.value = 0.55;
    master.connect(ctx.destination);
    master.connect(verb).connect(wet).connect(ctx.destination);
    const out = master;

    this.filmScore(ctx, out, t, elapsed);
    this.startBed();
  }

  /**
   * Score of the opening film, beat for beat on FILM (film-timing.ts): a deep swell and rising air,
   * four soft hits for « Vous », a warm pad under the aurora, a glassy pop when it condenses, sparkles
   * for the dot burst, one note per dimension, a ticking roll up to « 30 », keys for the typed title,
   * and a low impact with an opening chord for the monogram. Quiet throughout, no harsh transients.
   */
  private filmScore(ctx: AudioContext, out: AudioNode, t: number, elapsed = 0) {
    const F = FILM;
    const env = (g: GainNode, at: number, peak: number, attack: number, dur: number) => {
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(peak, at + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    };
    const osc = (type: OscillatorType, at: number, f0: number, f1: number, peak: number, dur: number, attack = 0.01) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, at);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + Math.min(dur, 0.6));
      env(g, at, peak, attack, dur);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + dur + 0.05);
    };
    const air = (at: number, dur: number, f0: number, f1: number, peak: number, q = 0.9) => {
      if (!this.noise) return;
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = this.noise;
      src.loop = true;
      f.type = "bandpass";
      f.Q.value = q;
      f.frequency.setValueAtTime(f0, at);
      f.frequency.exponentialRampToValueAtTime(f1, at + dur);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(f).connect(g).connect(out);
      src.start(at, Math.random() * 0.5);
      src.stop(at + dur + 0.05);
    };
    const click = (at: number, f: number, peak: number) => {
      if (!this.noise) return;
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = this.noise;
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = 4;
      env(g, at, peak, 0.002, 0.03);
      src.connect(bp).connect(g).connect(out);
      src.start(at, Math.random() * 0.8, 0.04);
    };
    const thump = (at: number, peak: number) => osc("sine", at, 120, 46, peak, 0.55, 0.008);
    const pad = (at: number, notes: number[], peak: number, dur: number) =>
      notes.forEach((f, i) => this.tone(ctx, i < 2 ? "sine" : "triangle", f, at + i * 0.04, peak, dur, [500, 2200]));

    // Nodes are created a beat before they sound, in small batches: creating ~150 at once on the tap
    // froze the first frame.
    const soon = (at: number, schedule: () => void) => {
      if (at < elapsed - 0.15) return; // this beat has already gone by
      if (at - elapsed < 1) return schedule();
      window.setTimeout(() => this.on && schedule(), (at - elapsed - 0.8) * 1000);
    };
    // Floor and rising air into the giant « Vous ».
    soon(0, () => {
      osc("sine", t, 32.7, 65.4, 0.13, F.aurora + 0.8, 1.2);
      air(t, F.aurora - 0.2, 160, 2600, 0.045);
      for (let k = 0; k < 4; k++) {
        const at = t + F.vous + 0.18 + k * F.vousStep;
        thump(at, 0.1 + k * 0.02);
        click(at, 2600, 0.03);
      }
    });
    // Aurora: a warm pad and high air.
    soon(F.aurora, () => {
      pad(t + F.aurora, [65.41, 98, 130.81, 164.81, 196], 0.022, F.condense - F.aurora + 1.4);
      air(t + F.aurora, F.dot - F.aurora, 2400, 4200, 0.012, 2.2);
      osc("sine", t + F.question, 329.63, 329.63, 0.014, 1.2, 0.05);
    });
    // Condensing into the pill, then the pop down to a dot.
    soon(F.condense, () => {
      air(t + F.condense, 0.62, 2600, 320, 0.05);
      osc("sine", t + F.condense + 0.3, 523.25, 523.25, 0.03, 0.7);
      osc("triangle", t + F.condense + 0.3, 784, 784, 0.01, 0.6);
      osc("sine", t + F.dot, 620, 1650, 0.026, 0.3);
    });
    // Burst: a soft low hit and scattered glass sparkles.
    soon(F.burst, () => {
      thump(t + F.burst, 0.12);
      air(t + F.burst, 0.9, 5200, 2600, 0.02, 1.4);
      const sparkle = [1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32, 2637.02];
      for (let k = 0; k < 22; k++) osc("sine", t + F.burst + 0.04 + ((k * 0.613) % 1) * 0.85, sparkle[(k * 5) % sparkle.length], sparkle[(k * 5) % sparkle.length], 0.0075, 0.32, 0.004);
    });
    // Five dimensions: one note each, rising (C D E G A).
    soon(F.dims, () => {
      const steps = [261.63, 293.66, 329.63, 392, 440];
      steps.forEach((f, i) => {
        const at = t + F.dims + (i === 0 ? 0.3 : 0.62 + (i - 1) * F.dimStep);
        click(at, 3000, 0.025);
        this.tone(ctx, "sine", f, at, 0.026, 1.1, [1400, 500]);
        this.tone(ctx, "triangle", f * 2, at, 0.006, 0.7, [2000, 800]);
      });
    });
    // 30 questions: an accelerating tick roll, then a low hit and a chord.
    soon(F.stat, () => {
      for (let k = 0; k < 20; k++) {
        const at = t + F.stat + 0.05 + 0.95 * (1 - Math.pow(1 - k / 20, 1.8));
        click(at, 1800 + k * 120, 0.018 + k * 0.0012);
      }
      thump(t + F.stat + 1.0, 0.16);
      pad(t + F.stat + 1.0, [130.81, 196, 261.63, 329.63], 0.018, 1.8);
    });
    // « révéler »: rising air into a hit and a shimmer.
    soon(F.lead, () => {
      air(t + F.lead, F.leadWord - F.lead + 0.1, 300, 3000, 0.04);
      thump(t + F.leadWord + 0.15, 0.14);
      [1567.98, 2093, 2637.02].forEach((f, i) => osc("sine", t + F.leadWord + 0.2 + i * 0.1, f, f, 0.006, 1.4, 0.03));
      pad(t + F.leadWord + 0.15, [87.31, 130.81, 174.61, 220, 261.63], 0.016, 1.6);
    });
    // Typed title: soft keys, then « send ».
    soon(F.type, () => {
      for (let k = 0; k < 13; k++) {
        const at = t + F.typing + k * F.keyStep;
        click(at, 3400 + ((k * 37) % 5) * 180, 0.02);
        osc("sine", at, 1900, 1900, 0.003, 0.04, 0.002);
      }
      osc("sine", t + F.send, 420, 200, 0.03, 0.08, 0.003);
      air(t + F.send + 0.05, 0.4, 600, 4200, 0.04);
    });
    // Monogram: low impact, then the warm chord opens with a glassy shimmer.
    soon(F.logo, () => {
      osc("sine", t + F.logo, 90, 38, 0.2, 1.4, 0.02);
      [65.41, 130.81, 196, 261.63, 329.63, 392, 493.88].forEach((f, i) =>
        this.tone(ctx, i < 2 ? "sine" : "triangle", f, t + F.logo + 0.1 + i * 0.05, i < 2 ? 0.05 : 0.02, 4.4, [600, 2400]),
      );
      [1046.5, 1318.5, 1568].forEach((f, i) => this.tone(ctx, "sine", f, t + F.logo + 0.4 + i * 0.12, 0.006, 3.2));
    });
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
    this.unlock();
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
