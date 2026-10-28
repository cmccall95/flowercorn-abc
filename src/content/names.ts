import type { Lang } from './sets';

// What the device voice should say for each symbol. Raw characters get misread ("A" as "uh"), so everything goes
// through these maps.
const EN_LETTER: Record<string, string> = { A: 'ey', Ñ: 'enye' };

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

/** A file-safe id for an item: "ua" (A), "la" (a), "uny" (Ñ), "n3" (3). Never relies on letter case. */
export function slug(item: string): string {
  if (isNumber(item)) return `n${item}`;
  const base = item.toLowerCase() === 'ñ' ? 'ny' : item.toLowerCase();
  return `${isLower(item) ? 'l' : 'u'}${base}`;
}

/** Id shared by both cases of a letter: "a", "ny", "n3". */
export const letterSlug = (item: string) => (isNumber(item) ? `n${item}` : slug(item.toUpperCase()).slice(1));
