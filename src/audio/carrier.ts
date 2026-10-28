// "Say it twice, keep the second": voices often garble the start of a very short utterance, so a letter is made as
// "A. A." and only the second copy is kept. The copies are split at the longest quiet gap in the middle of the clip.

const WINDOW = 240; // 10 ms at 24 kHz

function levels(audio: Float32Array, win: number): number[] {
  const out: number[] = [];
  for (let i = 0; i + win <= audio.length; i += win) {
    let sum = 0;
    for (let j = i; j < i + win; j++) sum += audio[j] * audio[j];
    out.push(Math.sqrt(sum / win));
  }
  return out;
}

/** Cut quiet from both ends (keeping a little breath), then fade in so the clip doesn't start with a click. */
export function trimSilence(audio: Float32Array, rate: number, threshold?: number): Float32Array {
  const win = Math.round((WINDOW * rate) / 24000);
  const rms = levels(audio, win);
  if (!rms.length) return audio;
  const thr = threshold ?? 0.02 * Math.max(...rms);
  const first = rms.findIndex((v) => v > thr);
  let last = rms.length - 1;
  while (last > 0 && rms[last] <= thr) last--;
  if (first < 0) return audio;
  const pad = Math.round(0.03 * rate);
  const clip = audio.slice(Math.max(0, first * win - pad), Math.min(audio.length, (last + 1) * win + pad));
  const fade = Math.min(win, clip.length);
  for (let i = 0; i < fade; i++) clip[i] *= i / fade;
  return clip;
}

/**
 * Keep the second copy of "X. X.": find the longest run of quiet windows in the middle 20–80% of the clip and keep
 * what follows it. Returns null if there's no clear gap (then the caller should use the whole clip or another source).
 */
export function secondCopy(audio: Float32Array, rate: number): Float32Array | null {
  const win = Math.round((WINDOW * rate) / 24000);
  const rms = levels(audio, win);
  if (rms.length < 10) return null;
  const thr = 0.02 * Math.max(...rms);
  const from = Math.floor(rms.length * 0.2);
  const to = Math.ceil(rms.length * 0.8);
  let best = { start: -1, end: -1 };
  let runStart = -1;
  // Only a run that ends in sound (inside the window) counts: trailing quiet is not a gap between two copies.
  for (let i = from; i < to; i++) {
    const quiet = rms[i] <= thr;
    if (quiet && runStart < 0) runStart = i;
    if (!quiet && runStart >= 0) {
      if (i - runStart > best.end - best.start) best = { start: runStart, end: i };
      runStart = -1;
    }
  }
  // A real pause between the copies is at least ~60 ms, and a real second copy has at least ~100 ms of sound.
  if (best.start < 0 || best.end - best.start < 6) return null;
  if (rms.slice(best.end).filter((v) => v > thr).length < 10) return null;
  return trimSilence(audio.subarray(best.end * win), rate, thr);
}

/** Speech-level loudness every clip is matched to (RMS of the voiced parts, about −17 dBFS), so pieces join evenly. */
export const TARGET_RMS = 0.14;

/** Scale a clip so its voiced parts sit at TARGET_RMS, without letting peaks clip. */
export function normalize(audio: Float32Array, rate: number): Float32Array {
  const win = Math.round((WINDOW * rate) / 24000);
  const rms = levels(audio, win);
  if (!rms.length) return audio;
  const thr = 0.1 * Math.max(...rms);
  const voiced = rms.filter((v) => v > thr);
  const level = Math.sqrt(voiced.reduce((n, v) => n + v * v, 0) / voiced.length);
  let peak = 0;
  for (const v of audio) peak = Math.max(peak, Math.abs(v));
  if (!level || !peak) return audio;
  const gain = Math.min(TARGET_RMS / level, 0.98 / peak);
  return audio.map((v) => v * gain);
}
