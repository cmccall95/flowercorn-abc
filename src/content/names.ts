import type { Lang } from './sets';

// What the device voice should say for each symbol. Raw characters get misread ("A" as "uh"), so everything goes
// through these maps. The bundled Kokoro clips use exact phonemes instead (EN_LETTER_PS), so they're always right.
const EN_LETTER: Record<string, string> = { A: 'ey', Ñ: 'enye' };

/** English letter names in Kokoro/misaki phonemes (A = eɪ, I = aɪ, O = oʊ). */
const EN_LETTER_PS: Record<string, string> = {
  A: 'ˈA', B: 'bˈi', C: 'sˈi', D: 'dˈi', E: 'ˈi', F: 'ˈɛf', G: 'ʤˈi', H: 'ˈAʧ', I: 'ˈI', J: 'ʤˈA', K: 'kˈA',
  L: 'ˈɛl', M: 'ˈɛm', N: 'ˈɛn', O: 'ˈO', P: 'pˈi', Q: 'kjˈu', R: 'ˈɑɹ', S: 'ˈɛs', T: 'tˈi', U: 'jˈu', V: 'vˈi',
  W: 'dˈʌbᵊljˌu', X: 'ˈɛks', Y: 'wˈI', Z: 'zˈi', Ñ: 'ˈɛnjA',
};
const ES_LETTER: Record<string, string> = {
  A: 'a', B: 'be', C: 'ce', D: 'de', E: 'e', F: 'efe', G: 'ge', H: 'hache', I: 'i', J: 'jota', K: 'ka', L: 'ele',
  M: 'eme', N: 'ene', Ñ: 'eñe', O: 'o', P: 'pe', Q: 'cu', R: 'erre', S: 'ese', T: 'te', U: 'u', V: 'uve',
  W: 'uve doble', X: 'equis', Y: 'ye', Z: 'zeta',
};
const NUMBER_WORDS: Record<Lang, string[]> = {
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
  es: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'],
};

export const isNumber = (item: string) => /^\d+$/.test(item);
export const isLower = (item: string) => item !== item.toUpperCase();

/** The spoken name of a letter or number, e.g. "be", "little b", "be minúscula", "three". */
export function spokenName(item: string, lang: Lang): string {
  if (isNumber(item)) return NUMBER_WORDS[lang][Number(item)];
  const up = item.toUpperCase();
  const base = lang === 'es' ? ES_LETTER[up] : EN_LETTER[up] ?? up;
  if (!isLower(item)) return base;
  return lang === 'es' ? `${base} minúscula` : `little ${base}`;
}

/** Spoken name without the "little"/"minúscula" marker, for repeated mentions in one sentence. */
export const shortName = (item: string, lang: Lang) =>
  isNumber(item) ? spokenName(item, lang) : lang === 'es' ? ES_LETTER[item.toUpperCase()] : EN_LETTER[item.toUpperCase()] ?? item.toUpperCase();

export const numberWord = (n: number, lang: Lang) => NUMBER_WORDS[lang][n];

/**
 * The same names written for the Kokoro voice generator. English letters carry exact phonemes in misaki's
 * link syntax, e.g. "[A](/ˈA/)"; Spanish letter names are already ordinary words.
 */
export function voiceName(item: string, lang: Lang): string {
  if (isNumber(item) || lang === 'es') return spokenName(item, lang);
  const marked = voiceShort(item, lang);
  return isLower(item) ? `little ${marked}` : marked;
}

export function voiceShort(item: string, lang: Lang): string {
  if (isNumber(item) || lang === 'es') return shortName(item, lang);
  const up = item.toUpperCase();
  return `[${up === 'Ñ' ? 'enye' : up}](/${EN_LETTER_PS[up]}/)`;
}

/** A file-safe id for an item: "ua" (A), "la" (a), "uny" (Ñ), "n3" (3). Never relies on letter case. */
export function slug(item: string): string {
  if (isNumber(item)) return `n${item}`;
  const base = item.toLowerCase() === 'ñ' ? 'ny' : item.toLowerCase();
  return `${isLower(item) ? 'l' : 'u'}${base}`;
}

/** Id shared by both cases of a letter: "a", "ny", "n3". */
export const letterSlug = (item: string) => (isNumber(item) ? `n${item}` : slug(item.toUpperCase()).slice(1));
