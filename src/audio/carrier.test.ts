import { describe, expect, it } from 'vitest';
import { normalize, secondCopy, trimSilence } from './carrier';

const RATE = 24000;
const tone = (ms: number, freq: number, amp = 0.5) =>
  Float32Array.from({ length: (RATE * ms) / 1000 }, (_, i) => amp * Math.sin((2 * Math.PI * freq * i) / RATE));
const quiet = (ms: number) => new Float32Array((RATE * ms) / 1000);
const join = (...parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

describe('secondCopy', () => {
  it('keeps the copy after the pause', () => {
    // garbled first copy (with a lead-in blip) ... pause ... clean second copy
    const audio = join(quiet(80), tone(60, 900, 0.3), tone(300, 220), quiet(250), tone(300, 440), quiet(80));
    const clip = secondCopy(audio, RATE)!;
    expect(clip).not.toBeNull();
    // About the length of the second copy (300 ms) plus a little padding.
    expect(clip.length / RATE).toBeGreaterThan(0.28);
    expect(clip.length / RATE).toBeLessThan(0.4);
    // It is the 440 Hz copy: count zero crossings over its middle.
    const mid = clip.subarray(Math.floor(clip.length * 0.3), Math.floor(clip.length * 0.7));
    let crossings = 0;
    for (let i = 1; i < mid.length; i++) if (Math.sign(mid[i]) !== Math.sign(mid[i - 1])) crossings++;
    const freq = crossings / 2 / (mid.length / RATE);
    expect(freq).toBeGreaterThan(400);
    expect(freq).toBeLessThan(480);
  });

  it('gives up when there is no real gap', () => {
    expect(secondCopy(join(quiet(50), tone(600, 300), quiet(50)), RATE)).toBeNull();
  });

  it('ignores gaps near the very start or end', () => {
    expect(secondCopy(join(tone(500, 300), quiet(40), tone(40, 300), quiet(400)), RATE)).toBeNull();
  });
});

describe('trimSilence', () => {
  it('cuts quiet ends and fades in', () => {
    const clip = trimSilence(join(quiet(300), tone(200, 300), quiet(300)), RATE);
    expect(clip.length / RATE).toBeLessThan(0.3);
    expect(Math.abs(clip[0])).toBeLessThan(0.01);
  });
});

describe('normalize', () => {
  it('brings quiet and loud clips to the same level without clipping', () => {
    const level = (a: Float32Array) => Math.sqrt(a.reduce((n, v) => n + v * v, 0) / a.length);
    const quietClip = normalize(tone(300, 300, 0.05), RATE);
    const loudClip = normalize(tone(300, 300, 0.9), RATE);
    expect(Math.abs(level(quietClip) - level(loudClip))).toBeLessThan(0.01);
    expect(Math.max(...loudClip.map(Math.abs))).toBeLessThanOrEqual(0.98);
  });
});
