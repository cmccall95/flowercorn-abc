import { LOOKALIKES } from '../content/sets';

export type Level = 1 | 2 | 3 | 4;

export interface LevelConfig {
  order: 'sequence' | 'random';
  /** Show the alphabet strip with the current item glowing. */
  strip: boolean;
  /** Show the big letter card (Level 4 is listen-only). */
  showCard: boolean;
  choices: number;
  lookalikes: boolean;
}

export const LEVELS: Record<Level, LevelConfig> = {
  1: { order: 'sequence', strip: true, showCard: true, choices: 3, lookalikes: false },
  2: { order: 'sequence', strip: false, showCard: true, choices: 4, lookalikes: false },
  3: { order: 'random', strip: false, showCard: true, choices: 6, lookalikes: true },
  4: { order: 'random', strip: false, showCard: false, choices: 6, lookalikes: true },
};

export const MAX_LEVEL: Level = 4;
export const HINT_AFTER_MISSES = 3;

export type Rng = () => number;

const shuffle = <T>(xs: T[], rng: Rng): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * The next item to ask for. In sequence levels it's simply items[step]. In random levels, items listed in
 * `extraWeight` (her trouble letters) come up about twice as often, and the previous item is never repeated.
 */
export function pickTarget(
  items: string[], level: Level, step: number, rng: Rng, previous?: string, extraWeight: string[] = [],
): string {
  if (LEVELS[level].order === 'sequence') return items[step % items.length];
  const pool = items.flatMap((x) => (extraWeight.includes(x) ? [x, x] : [x])).filter((x) => x !== previous);
  return pool[Math.floor(rng() * pool.length)] ?? items[0];
}

/**
 * Answer bubbles: always includes the target, never duplicates. At lookalike levels, her usual mix-up and
 * letters that look like the target are preferred so she practices telling them apart.
 */
export function makeChoices(
  items: string[], target: string, level: Level, rng: Rng, usualMixup?: string,
): string[] {
  const n = Math.min(LEVELS[level].choices, items.length);
  const picked = new Set([target]);
  if (LEVELS[level].lookalikes) {
    const near = [usualMixup, ...shuffle(LOOKALIKES[target] ?? [], rng)].filter((x): x is string => !!x && items.includes(x));
    for (const x of near) if (picked.size < Math.min(n, 3)) picked.add(x);
  }
  for (const x of shuffle(items, rng)) if (picked.size < n) picked.add(x);
  return shuffle([...picked], rng);
}

export type KeyResult =
  | { kind: 'ignore' }
  | { kind: 'partial'; buffer: string }
  | { kind: 'correct' }
  | { kind: 'wrong'; pressed: string };

/**
 * Match a keyboard key against the target. Case never matters. On an English keyboard N counts for Ñ.
 * "10" is typed as 1 then 0: the 1 is held in `buffer` as a partial answer.
 */
export function matchKey(key: string, target: string, buffer = ''): KeyResult {
  if (!/^[a-zA-ZñÑ0-9]$/.test(key)) return { kind: 'ignore' };
  const k = key.toUpperCase();
  const t = target.toUpperCase();
  if (t.length > 1) {
    const typed = buffer + k;
    if (typed === t) return { kind: 'correct' };
    if (t.startsWith(typed)) return { kind: 'partial', buffer: typed };
    return { kind: 'wrong', pressed: typed };
  }
  if (k === t || (t === 'Ñ' && k === 'N')) return { kind: 'correct' };
  return { kind: 'wrong', pressed: /[A-ZÑ]/.test(k) && target !== t ? k.toLowerCase() : k };
}

/** Finishing every item in the set moves her up a level (in Auto mode). */
export const nextLevel = (level: Level): Level => (Math.min(level + 1, MAX_LEVEL) as Level);

/** Steps in a full round: sequence levels walk the whole set; random levels ask as many as the set has. */
export const roundLength = (items: string[]) => items.length;
