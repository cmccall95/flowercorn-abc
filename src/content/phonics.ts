import type { Lang } from './sets';

export interface Phonic {
  /** Shown to grown-ups and in the speech bubble, e.g. "/k/". Empty for silent letters. */
  ipa: string;
  /** What the device voice says if there's no recording and no bundled clip. */
  approx: string;
  /** Phonemes for the bundled Kokoro clip: stops get a light schwa, sounds you can hold are held. */
  ps: string;
}

const p = (ipa: string, approx: string, ps: string): Phonic => ({ ipa, approx, ps });

/** One teaching sound per letter. English uses short vowels and hard C/G; Spanish uses pure vowels and hard C/G/R. */
export const PHONICS: Record<Lang, Record<string, Phonic>> = {
  en: {
    A: p('/a/', 'ah', 'ˈæ'), B: p('/b/', 'buh', 'bə'), C: p('/k/', 'kuh', 'kə'), D: p('/d/', 'duh', 'də'),
    E: p('/e/', 'eh', 'ˈɛ'), F: p('/f/', 'fff', 'fff'), G: p('/g/', 'guh', 'ɡə'), H: p('/h/', 'huh', 'hə'),
    I: p('/i/', 'ih', 'ˈɪ'), J: p('/j/', 'juh', 'ʤə'), K: p('/k/', 'kuh', 'kə'), L: p('/l/', 'lll', 'lll'),
    M: p('/m/', 'mmm', 'mmm'), N: p('/n/', 'nnn', 'nnn'), O: p('/o/', 'aw', 'ˈɑ'), P: p('/p/', 'puh', 'pə'),
    Q: p('/kw/', 'kwuh', 'kwə'), R: p('/r/', 'rrr', 'ɹɹɹ'), S: p('/s/', 'sss', 'sss'), T: p('/t/', 'tuh', 'tə'),
    U: p('/u/', 'uh', 'ˈʌ'), V: p('/v/', 'vvv', 'vvv'), W: p('/w/', 'wuh', 'wə'), X: p('/ks/', 'ks', 'ks'),
    Y: p('/y/', 'yuh', 'jə'), Z: p('/z/', 'zzz', 'zzz'), Ñ: p('/ny/', 'nyah', 'njɑ'),
  },
  es: {
    A: p('/a/', 'a', 'a'), B: p('/b/', 'ba', 'ba'), C: p('/k/', 'ca', 'ka'), D: p('/d/', 'da', 'da'),
    E: p('/e/', 'e', 'e'), F: p('/f/', 'fff', 'fff'), G: p('/g/', 'ga', 'ɡa'), H: p('', '', ''),
    I: p('/i/', 'i', 'i'), J: p('/x/', 'ja', 'xa'), K: p('/k/', 'ca', 'ka'), L: p('/l/', 'lll', 'lll'),
    M: p('/m/', 'mmm', 'mmm'), N: p('/n/', 'nnn', 'nnn'), Ñ: p('/ɲ/', 'ña', 'ɲa'), O: p('/o/', 'o', 'o'),
    P: p('/p/', 'pa', 'pa'), Q: p('/k/', 'cu', 'ku'), R: p('/r/', 'rrr', 'rrr'), S: p('/s/', 'sss', 'sss'),
    T: p('/t/', 'ta', 'ta'), U: p('/u/', 'u', 'u'), V: p('/b/', 'va', 'ba'), W: p('/w/', 'gua', 'wa'),
    X: p('/ks/', 'ks', 'ks'), Y: p('/ʝ/', 'ya', 'ʝa'), Z: p('/s/', 'sss', 'sss'),
  },
};

export const phonicFor = (item: string, lang: Lang): Phonic | undefined => PHONICS[lang][item.toUpperCase()];

/** Recordings are shared by upper and lower case: one clip per letter per language. */
export const recordingKey = (item: string, lang: Lang) => `phonic:${lang}:${item.toUpperCase()}`;

export const isSilent = (item: string, lang: Lang) => lang === 'es' && item.toUpperCase() === 'H';
