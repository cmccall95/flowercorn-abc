export type Lang = 'en' | 'es';
export type ActivityId = 'upper' | 'lower' | 'numbers';

const UPPER_EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const UPPER_ES = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

/** The items a child works through for an activity, in teaching order. */
export function itemsFor(activity: ActivityId, lang: Lang): string[] {
  const upper = lang === 'es' ? UPPER_ES : UPPER_EN;
  if (activity === 'upper') return upper;
  if (activity === 'lower') return upper.map((l) => l.toLowerCase());
  return NUMBERS;
}

export const ACTIVITIES: ActivityId[] = ['upper', 'lower', 'numbers'];

/** Letters that look alike, used for harder distractors (Level 3+). */
export const LOOKALIKES: Record<string, string[]> = {
  b: ['d', 'p', 'q'], d: ['b', 'q', 'p'], p: ['q', 'b', 'd'], q: ['p', 'd', 'b'],
  m: ['n', 'w'], n: ['m', 'h', 'ñ'], ñ: ['n'], h: ['n'], u: ['n', 'v'], v: ['u', 'w', 'y'], w: ['v', 'm'],
  i: ['l', 'j'], l: ['i', 't'], j: ['i', 'g'], g: ['q', 'j'], t: ['f', 'l'], f: ['t'],
  M: ['W', 'N'], W: ['M', 'V'], N: ['M', 'Z', 'Ñ'], Ñ: ['N'], E: ['F'], F: ['E', 'P'], P: ['R', 'B', 'F'],
  R: ['P', 'B'], B: ['D', 'P', 'R'], D: ['B', 'O'], O: ['Q', 'C', 'D'], Q: ['O', 'G'], C: ['G', 'O'],
  G: ['C', 'Q'], U: ['V'], V: ['U', 'Y'], Z: ['N', 'S'], S: ['Z'], I: ['L', 'T'], L: ['I'], K: ['X'], X: ['K', 'Y'],
  '6': ['9', '0'], '9': ['6'], '1': ['7'], '7': ['1'], '2': ['5'], '5': ['2', '3'], '3': ['8', '5'], '8': ['3', '0'],
  '0': ['8', '6'], '4': ['9'], '10': ['1', '0'],
};
