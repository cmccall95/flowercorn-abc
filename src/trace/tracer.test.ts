import { describe, expect, it } from 'vitest';
import { resample, type Pt } from './geometry';
import { GLYPHS } from './glyphs';
import { isDone, startTrace, traceSegment, type TraceState } from './tracer';

/** Drag along a path, jittered by `wobble` units, and report the final state. */
function drag(t: TraceState, path: Pt[], wobble = 0): TraceState {
  let state = t;
  const pts = resample(path, 5).map(([x, y], i) => [x + (i % 2 ? wobble : -wobble), y] as Pt);
  for (let i = 1; i < pts.length; i++) state = traceSegment(state, pts[i - 1], pts[i]).state;
  return state;
}

describe('tracer', () => {
  it('finishes every glyph when each stroke is traced exactly', () => {
    for (const [ch, strokes] of Object.entries(GLYPHS)) {
      let t = startTrace(strokes);
      for (const s of strokes) t = drag(t, s);
      expect(isDone(t), ch).toBe(true);
    }
  });

  it('forgives a wobbly finger', () => {
    let t = startTrace(GLYPHS.A);
    for (const s of GLYPHS.A) t = drag(t, s, 9);
    expect(isDone(t)).toBe(true);
  });

  it('does not count a stroke traced backwards', () => {
    const t = drag(startTrace(GLYPHS.L), [...GLYPHS.L[0]].reverse());
    expect(t.stroke).toBe(0);
  });

  it('does not count scribbles far from the letter', () => {
    const t = drag(startTrace(GLYPHS.T), [[90, 130], [95, 60], [88, 135]]);
    expect(t.stroke).toBe(0);
    expect(t.covered[0].some(Boolean)).toBe(false);
  });

  it('keeps progress when she lifts her finger mid-stroke', () => {
    const [stroke] = GLYPHS['1'];
    const pts = resample(stroke, 5);
    const half = Math.floor(pts.length / 2);
    let t = drag(startTrace(GLYPHS['1']), pts.slice(0, half + 1));
    expect(isDone(t)).toBe(false);
    t = drag(t, pts.slice(half));
    expect(isDone(t)).toBe(true);
  });

  it('has stroke data for the whole alphabet in both cases, Ñ, and digits', () => {
    for (const ch of 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyz0123456789') {
      expect(GLYPHS[ch], ch).toBeDefined();
      for (const s of GLYPHS[ch]) for (const [x, y] of s) {
        expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(140);
      }
    }
  });
});
