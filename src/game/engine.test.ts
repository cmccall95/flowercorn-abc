import { describe, expect, it } from 'vitest';
import { itemsFor } from '../content/sets';
import { makeChoices, matchKey, nextLevel, pickTarget } from './engine';

const seeded = (seed = 1) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const EN = itemsFor('upper', 'en');

describe('pickTarget', () => {
  it('walks the set in order at sequence levels', () => {
    expect([0, 1, 2, 26].map((s) => pickTarget(EN, 1, s, seeded()))).toEqual(['A', 'B', 'C', 'A']);
    expect(pickTarget(EN, 2, 3, seeded())).toBe('D');
  });

  it('never repeats the previous item at random levels', () => {
    const rng = seeded(3);
    let prev = 'A';
    for (let i = 0; i < 200; i++) {
      const t = pickTarget(EN, 3, i, rng, prev);
      expect(t).not.toBe(prev);
      prev = t;
    }
  });

  it('asks trouble letters about twice as often', () => {
    const rng = seeded(5);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const t = pickTarget(EN, 3, i, rng, undefined, ['D']);
      counts[t] = (counts[t] ?? 0) + 1;
    }
    const ratio = counts.D / ((counts.A + counts.B + counts.C) / 3);
    expect(ratio).toBeGreaterThan(1.6);
    expect(ratio).toBeLessThan(2.4);
  });
});

describe('makeChoices', () => {
  it('includes the target once, with the level’s bubble count', () => {
    for (const [level, n] of [[1, 3], [2, 4], [3, 6], [4, 6]] as const) {
      for (const t of EN) {
        const c = makeChoices(EN, t, level, seeded(t.charCodeAt(0)));
        expect(c).toHaveLength(n);
        expect(c.filter((x) => x === t)).toHaveLength(1);
        expect(new Set(c).size).toBe(n);
      }
    }
  });

  it('includes her usual mix-up at lookalike levels', () => {
    const lower = itemsFor('lower', 'en');
    expect(makeChoices(lower, 'd', 3, seeded(), 'b')).toContain('b');
    expect(makeChoices(EN, 'M', 3, seeded(9))).toEqual(expect.arrayContaining(['M']));
  });

  it('works for short sets like numbers', () => {
    const nums = itemsFor('numbers', 'en');
    expect(makeChoices(nums, '10', 3, seeded())).toContain('10');
  });
});

describe('matchKey', () => {
  it('ignores case and non-letter keys', () => {
    expect(matchKey('c', 'C')).toEqual({ kind: 'correct' });
    expect(matchKey('C', 'c')).toEqual({ kind: 'correct' });
    expect(matchKey('Shift', 'C')).toEqual({ kind: 'ignore' });
    expect(matchKey(' ', 'C')).toEqual({ kind: 'ignore' });
  });

  it('accepts N or Ñ for Ñ', () => {
    expect(matchKey('n', 'Ñ')).toEqual({ kind: 'correct' });
    expect(matchKey('ñ', 'ñ')).toEqual({ kind: 'correct' });
  });

  it('records what she pressed instead', () => {
    expect(matchKey('b', 'd')).toEqual({ kind: 'wrong', pressed: 'b' });
    expect(matchKey('b', 'D')).toEqual({ kind: 'wrong', pressed: 'B' });
  });

  it('takes 10 as 1 then 0', () => {
    const first = matchKey('1', '10');
    expect(first).toEqual({ kind: 'partial', buffer: '1' });
    expect(matchKey('0', '10', '1')).toEqual({ kind: 'correct' });
    expect(matchKey('5', '10', '1')).toEqual({ kind: 'wrong', pressed: '15' });
    expect(matchKey('1', '1')).toEqual({ kind: 'correct' });
  });
});

describe('levels', () => {
  it('moves up one level at a time and stops at 4', () => {
    expect(nextLevel(1)).toBe(2);
    expect(nextLevel(3)).toBe(4);
    expect(nextLevel(4)).toBe(4);
  });
});
