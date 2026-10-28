import { isLower, isNumber, spokenName } from '../../content/names';
import type { Lang } from '../../content/sets';

/**
 * What the in-app voice is asked to say: plain text (pronounced by language rules), exact phonemes, or a letter or
 * number by name. Letters are resolved when spoken, so a grown-up's "Fix a letter" spelling applies right away.
 */
export type EnginePiece = string | { ps: string } | { item: string; long: boolean };

/** Text or phonemes, ready for the voice. `lang` overrides the line's language (names use English rules). */
export type EnginePart = { text: string; lang?: Lang } | { ps: string };

/** Letter names as Kokoro phonemes (US English). Exact sounds, so "A" can never come out as "uh". */
export const EN_LETTER_IPA: Record<string, string> = {
  A: 'ˈeɪ', B: 'bˈiː', C: 'sˈiː', D: 'dˈiː', E: 'ˈiː', F: 'ˈɛf', G: 'dʒˈiː', H: 'ˈeɪtʃ', I: 'ˈaɪ', J: 'dʒˈeɪ',
  K: 'kˈeɪ', L: 'ˈɛl', M: 'ˈɛm', N: 'ˈɛn', O: 'ˈoʊ', P: 'pˈiː', Q: 'kjˈuː', R: 'ˈɑːɹ', S: 'ˈɛs', T: 'tˈiː',
  U: 'jˈuː', V: 'vˈiː', W: 'dˈʌbəljuː', X: 'ˈɛks', Y: 'wˈaɪ', Z: 'zˈiː', Ñ: 'ˈɛnjeɪ',
};

export type LetterFixes = Partial<Record<Lang, Record<string, string>>>;

const OPEN = '\u0001';
const CLOSE = '\u0002';

/** Placeholders used while building a line's words, so letters can be swapped for their pronunciation. */
export const marker = (item: string, long: boolean) => `${OPEN}${long ? 'L' : 'S'}${item}${CLOSE}`;

export function parsePieces(s: string): EnginePiece[] {
  const out: EnginePiece[] = [];
  for (const chunk of s.split(new RegExp(`(${OPEN}[LS][^${CLOSE}]+${CLOSE})`))) {
    if (!chunk) continue;
    if (chunk.startsWith(OPEN)) out.push({ item: chunk.slice(2, -1), long: chunk[1] === 'L' });
    else out.push(chunk);
  }
  return out;
}

/** The letter's name as the voice should say it: a grown-up's fix, else exact phonemes (English) or the name. */
export function letterPart(item: string, lang: Lang, fixes: LetterFixes = {}): EnginePart {
  const up = item.toUpperCase();
  const fix = fixes[lang]?.[up];
  if (fix) return { text: fix };
  return lang === 'en' ? { ps: EN_LETTER_IPA[up] } : { text: spokenName(up, 'es') };
}

export function resolvePieces(pieces: EnginePiece[], lang: Lang, fixes: LetterFixes = {}): EnginePart[] {
  return pieces.flatMap((p): EnginePart[] => {
    if (typeof p === 'string') return [{ text: p }];
    if ('ps' in p) return [{ ps: p.ps }];
    if (isNumber(p.item)) return [{ text: spokenName(p.item, lang) }];
    const name = letterPart(p.item, lang, fixes);
    if (!p.long || !isLower(p.item)) return [name];
    return lang === 'es' ? [name, { text: ' minúscula' }] : [{ text: 'little ' }, name];
  });
}
