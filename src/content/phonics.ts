import type { Lang } from './sets';

export interface Phonic {
  /** Shown to grown-ups and in the speech bubble, e.g. "/k/". Empty for silent letters. */
  ipa: string;
  /** What the browser voice says until a grown-up records the real sound. */
  approx: string;
}

const p = (ipa: string, approx: string): Phonic => ({ ipa, approx });

/** One teaching sound per letter. English uses short vowels and hard C/G; Spanish uses pure vowels and hard C/G/R. */
export const PHONICS: Record<Lang, Record<string, Phonic>> = {
  en: {
    A: p('/a/', 'ah'), B: p('/b/', 'buh'), C: p('/k/', 'kuh'), D: p('/d/', 'duh'), E: p('/e/', 'eh'),
    F: p('/f/', 'fff'), G: p('/g/', 'guh'), H: p('/h/', 'huh'), I: p('/i/', 'ih'), J: p('/j/', 'juh'),
    K: p('/k/', 'kuh'), L: p('/l/', 'lll'), M: p('/m/', 'mmm'), N: p('/n/', 'nnn'), O: p('/o/', 'aw'),
    P: p('/p/', 'puh'), Q: p('/kw/', 'kwuh'), R: p('/r/', 'rrr'), S: p('/s/', 'sss'), T: p('/t/', 'tuh'),
    U: p('/u/', 'uh'), V: p('/v/', 'vvv'), W: p('/w/', 'wuh'), X: p('/ks/', 'ks'), Y: p('/y/', 'yuh'),
    Z: p('/z/', 'zzz'), Ñ: p('/ny/', 'nyah'),
  },
  es: {
    A: p('/a/', 'a'), B: p('/b/', 'ba'), C: p('/k/', 'ca'), D: p('/d/', 'da'), E: p('/e/', 'e'),
    F: p('/f/', 'fff'), G: p('/g/', 'ga'), H: p('', ''), I: p('/i/', 'i'), J: p('/x/', 'ja'),
    K: p('/k/', 'ca'), L: p('/l/', 'lll'), M: p('/m/', 'mmm'), N: p('/n/', 'nnn'), Ñ: p('/ɲ/', 'ña'),
    O: p('/o/', 'o'), P: p('/p/', 'pa'), Q: p('/k/', 'cu'), R: p('/r/', 'rrr'), S: p('/s/', 'sss'),
    T: p('/t/', 'ta'), U: p('/u/', 'u'), V: p('/b/', 'va'), W: p('/w/', 'gua'), X: p('/ks/', 'ks'),
    Y: p('/ʝ/', 'ya'), Z: p('/s/', 'sss'),
  },
};

export const phonicFor = (item: string, lang: Lang): Phonic | undefined => PHONICS[lang][item.toUpperCase()];

/** Recordings are shared by upper and lower case: one clip per letter per language. */
export const recordingKey = (item: string, lang: Lang) => `phonic:${lang}:${item.toUpperCase()}`;

export const isSilent = (item: string, lang: Lang) => lang === 'es' && item.toUpperCase() === 'H';
