// Simple synthesized cues via the Web Audio API — no audio files needed.

let audioCtx = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  return audioCtx;
}

// Browsers block audio until it's kicked off from a user gesture. Call this
// synchronously inside a click handler (e.g. "Start workout") so the
// context is already running by the time playTick/playBell get used.
export function unlockAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") ctx.resume();
}

function tone(ctx, { frequency, duration, type = "sine", gain = 0.2, startDelay = 0 }) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  const start = ctx.currentTime + startDelay;
  gainNode.gain.setValueAtTime(gain, start);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playTick() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, { frequency: 880, duration: 0.08, type: "square", gain: 0.15 });
}

export function playBell() {
  const ctx = getContext();
  if (!ctx) return;
  tone(ctx, { frequency: 1046.5, duration: 0.6, type: "sine", gain: 0.25 });
  tone(ctx, {
    frequency: 1568,
    duration: 0.45,
    type: "sine",
    gain: 0.12,
    startDelay: 0.01,
  });
}
