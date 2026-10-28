import { type Pt, resample, type Stroke } from './geometry';

/** How close her finger must pass to count, in box units (box is 140 tall, so about 12%). */
export const TOLERANCE = 17;
/** Share of a stroke's points she must cover before it counts as done. */
export const COVER_TO_FINISH = 0.75;
/** She can only cover points a little ahead of her furthest progress, so strokes go roughly forward. */
const LOOKAHEAD = 6;

export interface TraceState {
  samples: Pt[][];
  covered: boolean[][];
  /** Index of the stroke she's working on; equals samples.length when done. */
  stroke: number;
  /** Furthest sample reached on the current stroke. */
  front: number;
}

export type TraceEvent = 'none' | 'progress' | 'stroke-done' | 'glyph-done';

export function startTrace(strokes: Stroke[]): TraceState {
  const samples = strokes.map((s) => resample(s, 4));
  return { samples, covered: samples.map((s) => s.map(() => false)), stroke: 0, front: -1 };
}

export const isDone = (t: TraceState) => t.stroke >= t.samples.length;

export const strokeProgress = (t: TraceState, i = t.stroke) => {
  const c = t.covered[i];
  return c ? c.filter(Boolean).length / c.length : 1;
};

/** Feed one pointer position (in box units). Returns the new state and what happened. */
export function tracePoint(t: TraceState, [x, y]: Pt): { state: TraceState; event: TraceEvent } {
  if (isDone(t)) return { state: t, event: 'none' };
  const pts = t.samples[t.stroke];
  const cov = [...t.covered[t.stroke]];
  let front = t.front;
  let changed = false;
  const limit = Math.min(pts.length - 1, front + LOOKAHEAD);
  for (let i = 0; i <= limit; i++) {
    if (!cov[i] && Math.hypot(pts[i][0] - x, pts[i][1] - y) <= TOLERANCE) {
      cov[i] = true;
      changed = true;
      front = Math.max(front, i);
    }
  }
  if (!changed) return { state: t, event: 'none' };
  const covered = t.covered.map((c, i) => (i === t.stroke ? cov : c));
  const share = cov.filter(Boolean).length / cov.length;
  if (share >= COVER_TO_FINISH) {
    const next: TraceState = { ...t, covered, stroke: t.stroke + 1, front: -1 };
    return { state: next, event: isDone(next) ? 'glyph-done' : 'stroke-done' };
  }
  return { state: { ...t, covered, front }, event: 'progress' };
}

const RANK: Record<TraceEvent, number> = { none: 0, progress: 1, 'stroke-done': 2, 'glyph-done': 3 };

/** Feed a drag from one point to the next, filling in between so fast swipes still count. */
export function traceSegment(t: TraceState, from: Pt, to: Pt): { state: TraceState; event: TraceEvent } {
  const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 3));
  let state = t;
  let event: TraceEvent = 'none';
  for (let i = 1; i <= steps; i++) {
    const r = tracePoint(state, [from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps]);
    state = r.state;
    if (r.event === 'glyph-done') return r;
    if (RANK[r.event] > RANK[event]) event = r.event;
  }
  return { state, event };
}
