import type { ActivityId, Lang } from '../content/sets';

export type MetricActivity = ActivityId | 'trace';

export interface Attempt {
  profileId: string;
  activity: MetricActivity;
  lang: Lang;
  level: number;
  target: string;
  shownAt: number;
  answeredAt: number;
  /** What she chose before getting it right, e.g. ["b"] when the target was "d". */
  wrongInputs: string[];
  hintShown: boolean;
  /** Times she tapped to hear it again. */
  replays: number;
}

export interface Session {
  profileId: string;
  start: number;
  end: number;
  activeMs: number;
}

export interface ItemStats {
  item: string;
  tries: number;
  wrongFirstTry: number;
  medianMs: number;
  /** The letter she most often picks instead, if one letter is at least half of her misses. */
  usualMixup: string | null;
  slow: boolean;
  needsPractice: boolean;
  mastered: boolean;
}

export const RECENT_TRIES = 10;
export const RETENTION_DAYS = 90;
const DAY = 86_400_000;

export const timeToAnswer = (a: Attempt) => a.answeredAt - a.shownAt;

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Per-letter stats over her last 10 tries at each letter.
 * Needs practice: wrong on the first try at least 40% of the time (3+ tries), or typically takes 2× her usual time.
 * Mastered: right first try in at least 4 of the last 5 (3+ tries), typically under 4 seconds.
 */
export function itemStats(attempts: Attempt[]): Map<string, ItemStats> {
  const overall = median(attempts.map(timeToAnswer));
  const byItem = new Map<string, Attempt[]>();
  for (const a of [...attempts].sort((x, y) => x.shownAt - y.shownAt)) {
    byItem.set(a.target, [...(byItem.get(a.target) ?? []), a]);
  }
  const out = new Map<string, ItemStats>();
  for (const [item, all] of byItem) {
    const recent = all.slice(-RECENT_TRIES);
    const wrongFirstTry = recent.filter((a) => a.wrongInputs.length > 0).length;
    const medianMs = median(recent.map(timeToAnswer));
    const counts = new Map<string, number>();
    for (const w of recent.flatMap((a) => a.wrongInputs)) counts.set(w, (counts.get(w) ?? 0) + 1);
    const totalWrong = [...counts.values()].reduce((s, n) => s + n, 0);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const slow = recent.length >= 3 && overall > 0 && medianMs >= 2 * overall;
    const needsPractice = (recent.length >= 3 && wrongFirstTry / recent.length >= 0.4) || slow;
    const last5 = recent.slice(-5);
    const mastered =
      !needsPractice &&
      last5.length >= 3 &&
      last5.filter((a) => a.wrongInputs.length === 0).length >= Math.min(4, last5.length) &&
      median(last5.map(timeToAnswer)) < 4000;
    out.set(item, {
      item, tries: recent.length, wrongFirstTry, medianMs, slow, needsPractice, mastered,
      usualMixup: top && top[1] / totalWrong >= 0.5 ? top[0] : null,
    });
  }
  return out;
}

export interface Summary {
  answers: number;
  firstTryPct: number;
  medianMs: number;
  activeMs: number;
  sessions: number;
  needsPractice: ItemStats[];
  mastered: string[];
  stats: Map<string, ItemStats>;
}

export function summarize(attempts: Attempt[], sessions: Session[]): Summary {
  const stats = itemStats(attempts);
  const list = [...stats.values()];
  return {
    answers: attempts.length,
    firstTryPct: attempts.length ? Math.round((100 * attempts.filter((a) => !a.wrongInputs.length).length) / attempts.length) : 0,
    medianMs: median(attempts.map(timeToAnswer)),
    activeMs: sessions.reduce((s, x) => s + x.activeMs, 0),
    sessions: sessions.filter((s) => s.activeMs > 0).length,
    needsPractice: list.filter((x) => x.needsPractice).sort((a, b) => b.wrongFirstTry / b.tries - a.wrongFirstTry / a.tries || b.medianMs - a.medianMs),
    mastered: list.filter((x) => x.mastered).map((x) => x.item),
    stats,
  };
}

export type Range = 'today' | 'week' | 'all';

export function rangeStart(range: Range, now = Date.now()): number {
  if (range === 'all') return 0;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return range === 'today' ? d.getTime() : d.getTime() - 6 * DAY;
}

/** Drop anything older than the retention window. */
export const prune = <T extends { shownAt?: number; start?: number }>(xs: T[], now = Date.now()) =>
  xs.filter((x) => (x.shownAt ?? x.start ?? now) >= now - RETENTION_DAYS * DAY);

/** Active play time: a tick only counts if the page is visible and she did something in the last minute. */
export const IDLE_AFTER_MS = 60_000;
export const countsAsActive = (now: number, lastInput: number, hidden: boolean) => !hidden && now - lastInput < IDLE_AFTER_MS;

export function toCsv(attempts: Attempt[], names: Record<string, string>): string {
  const head = ['date', 'time', 'child', 'activity', 'language', 'level', 'target', 'seconds_to_answer', 'right_first_try', 'picked_instead', 'hint_shown', 'replays'];
  const esc = (v: string | number | boolean) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = attempts.map((a) => {
    const d = new Date(a.shownAt);
    return [
      d.toLocaleDateString('en-CA'), d.toLocaleTimeString('en-GB'), names[a.profileId] ?? a.profileId, a.activity, a.lang, a.level,
      a.target, (timeToAnswer(a) / 1000).toFixed(1), a.wrongInputs.length === 0, a.wrongInputs.join(' '), a.hintShown, a.replays,
    ].map(esc).join(',');
  });
  return [head.join(','), ...rows].join('\n');
}
