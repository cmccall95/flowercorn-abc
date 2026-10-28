import { describe, expect, it } from 'vitest';
import { type Attempt, countsAsActive, itemStats, prune, summarize, toCsv } from './analyze';

let clock = 1_700_000_000_000;
const attempt = (target: string, ms: number, wrongInputs: string[] = []): Attempt => {
  clock += 60_000;
  return { profileId: 'p1', activity: 'lower', lang: 'en', level: 1, target, shownAt: clock, answeredAt: clock + ms, wrongInputs, hintShown: false, replays: 0 };
};

const quickRight = (t: string, n: number) => Array.from({ length: n }, () => attempt(t, 2000));

describe('itemStats', () => {
  it('flags a letter she gets wrong 40%+ of the time and names her usual mix-up', () => {
    const xs = [...quickRight('a', 5), attempt('d', 2500, ['b']), attempt('d', 2000), attempt('d', 3000, ['b', 'p']), attempt('d', 2100, ['b'])];
    const d = itemStats(xs).get('d')!;
    expect(d.tries).toBe(4);
    expect(d.wrongFirstTry).toBe(3);
    expect(d.needsPractice).toBe(true);
    expect(d.usualMixup).toBe('b');
    expect(d.mastered).toBe(false);
  });

  it('needs at least 3 tries before flagging', () => {
    const xs = [...quickRight('a', 5), attempt('q', 2000, ['o']), attempt('q', 2000, ['o'])];
    expect(itemStats(xs).get('q')!.needsPractice).toBe(false);
  });

  it('just under 40% wrong is not flagged', () => {
    const xs = [...quickRight('c', 3), attempt('c', 2000, ['x']), attempt('c', 2000, ['x']), ...quickRight('c', 1)];
    // 2 of 6 = 33%
    expect(itemStats(xs).get('c')!.needsPractice).toBe(false);
  });

  it('flags letters that take twice her usual time', () => {
    const xs = [...quickRight('a', 6), ...quickRight('b', 6), attempt('q', 9000), attempt('q', 8000), attempt('q', 10000)];
    const q = itemStats(xs).get('q')!;
    expect(q.slow).toBe(true);
    expect(q.needsPractice).toBe(true);
  });

  it('only looks at the last 10 tries, so old trouble fades', () => {
    const xs = [...Array.from({ length: 5 }, () => attempt('d', 2000, ['b'])), ...quickRight('d', 10)];
    const d = itemStats(xs).get('d')!;
    expect(d.tries).toBe(10);
    expect(d.needsPractice).toBe(false);
    expect(d.mastered).toBe(true);
  });

  it('marks quick first-try letters as mastered', () => {
    expect(itemStats(quickRight('m', 5)).get('m')!.mastered).toBe(true);
    expect(itemStats([attempt('m', 6000), attempt('m', 6000), attempt('m', 6000)]).get('m')!.mastered).toBe(false);
  });

  it('leaves the mix-up empty when no one letter dominates', () => {
    const xs = [attempt('d', 2000, ['b']), attempt('d', 2000, ['p']), attempt('d', 2000, ['q'])];
    expect(itemStats(xs).get('d')!.usualMixup).toBe(null);
  });
});

describe('summarize', () => {
  it('totals answers, first-try rate and active time', () => {
    const xs = [...quickRight('a', 3), attempt('d', 2000, ['b'])];
    const s = summarize(xs, [{ profileId: 'p1', start: 0, end: 1, activeMs: 90_000 }, { profileId: 'p1', start: 2, end: 3, activeMs: 30_000 }, { profileId: 'p1', start: 4, end: 4, activeMs: 0 }]);
    expect(s.answers).toBe(4);
    expect(s.firstTryPct).toBe(75);
    expect(s.activeMs).toBe(120_000);
    expect(s.sessions).toBe(2);
  });
});

describe('active time', () => {
  it('stops counting after a minute idle or when hidden', () => {
    expect(countsAsActive(100_000, 50_000, false)).toBe(true);
    expect(countsAsActive(200_000, 50_000, false)).toBe(false);
    expect(countsAsActive(100_000, 99_000, true)).toBe(false);
  });
});

describe('prune', () => {
  it('drops attempts older than 90 days', () => {
    const now = Date.now();
    const old = { ...attempt('a', 1000), shownAt: now - 91 * 86_400_000 };
    const fresh = { ...attempt('a', 1000), shownAt: now - 89 * 86_400_000 };
    expect(prune([old, fresh], now)).toEqual([fresh]);
  });
});

describe('toCsv', () => {
  it('writes one row per attempt with a header', () => {
    const csv = toCsv([attempt('d', 2500, ['b']), attempt('a', 1000)], { p1: 'Lily' });
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^date,time,child,activity/);
    expect(lines[1]).toContain(',Lily,lower,en,1,d,2.5,false,b,false,0');
  });
});
