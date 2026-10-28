export type Pt = [number, number];
export type Stroke = Pt[];

/** A straight run through the given points. */
export const line = (...pts: Pt[]): Pt[] => pts;

/**
 * Points along an ellipse arc. Angles are in degrees with 0 = 3 o'clock; because screen y points down,
 * increasing angles go clockwise. Going from a larger to a smaller angle draws counter-clockwise.
 */
export function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number): Pt[] {
  const steps = Math.max(4, Math.round(Math.abs(to - from) / 12));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return [+(cx + rx * Math.cos(a)).toFixed(2), +(cy + ry * Math.sin(a)).toFixed(2)] as Pt;
  });
}

/** Join pieces into one stroke, dropping a duplicate point where pieces meet. */
export function join(...parts: Pt[][]): Stroke {
  const out: Pt[] = [];
  for (const part of parts) {
    for (const p of part) {
      const last = out[out.length - 1];
      if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > 0.5) out.push(p);
    }
  }
  return out;
}

export const strokeLength = (s: Stroke) =>
  s.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - s[i][0], p[1] - s[i][1]), 0);

/** Evenly spaced points along a stroke, about every `spacing` units. */
export function resample(s: Stroke, spacing = 4): Pt[] {
  if (s.length < 2) return [...s];
  const out: Pt[] = [s[0]];
  let carry = 0;
  for (let i = 1; i < s.length; i++) {
    const [ax, ay] = s[i - 1];
    const [bx, by] = s[i];
    const len = Math.hypot(bx - ax, by - ay);
    let d = spacing - carry;
    while (d <= len) {
      out.push([ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len]);
      d += spacing;
    }
    carry = len - (d - spacing);
  }
  const end = s[s.length - 1];
  const last = out[out.length - 1];
  if (Math.hypot(end[0] - last[0], end[1] - last[1]) > spacing / 3) out.push(end);
  return out;
}

export const toPath = (s: Stroke) => 'M' + s.map(([x, y]) => `${x} ${y}`).join(' L');
