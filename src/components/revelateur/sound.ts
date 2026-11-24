/**
 * Very light, synthesised sound cues for the Révélateur (no audio files). Three soft moments only:
 * an answer is chosen, a new part opens, the answers are confirmed. Off with one tap; the choice is kept.
 */
const KEY = "rv-sound";
let ctx: AudioContext | null = null;

export const soundOn = () => typeof window !== "undefined" && window.localStorage.getItem(KEY) !== "off";
export const setSoundOn = (on: boolean) => {
  window.localStorage.setItem(KEY, on ? "on" : "off");
  if (on) cue("select");
};

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** One soft note: sine with a slow attack and a long release. */
function note(c: AudioContext, freq: number, start: number, dur: number, peak: number) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.12, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

export function cue(kind: "select" | "part" | "done") {
  if (!soundOn()) return;
  const c = audio();
  if (!c || c.state !== "running") return;
  const t = c.currentTime + 0.02;
  if (kind === "select") {
    note(c, 392, t, 0.5, 0.025); // G4, a quiet wooden tick
  } else if (kind === "part") {
    note(c, 261.63, t, 2.4, 0.03); // C4 + G4 open fifth, slow bloom
    note(c, 392, t + 0.18, 2.2, 0.022);
  } else {
    note(c, 261.63, t, 3, 0.03); // C–E–G, gently resolved
    note(c, 329.63, t + 0.25, 2.8, 0.025);
    note(c, 392, t + 0.5, 2.6, 0.022);
  }
}

/** Browsers keep audio locked until the first tap or key press on the page. */
export function unlockOnFirstGesture() {
  const go = () => { audio(); window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
  window.addEventListener("pointerdown", go, { once: true });
  window.addEventListener("keydown", go, { once: true });
  return () => { window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); };
}
