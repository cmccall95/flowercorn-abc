import { isNumber, letterSlug, numberWord, shortName, slug, spokenName, voiceName, voiceShort } from '../content/names';
import { isSilent, phonicFor, recordingKey } from '../content/phonics';
import { itemsFor, type Lang } from '../content/sets';
import { wordFor } from '../content/words';

/**
 * A fixed line with a bundled Kokoro clip at public/voice/<id>.mp3 (see scripts/voices). The id ends with a
 * fingerprint of the words, so changing a line simply waits for its new clip (device voice meanwhile).
 * `text` goes through Kokoro's own pronunciation rules; `phonemes` are spoken exactly.
 */
export interface VoiceLine {
  id: string;
  lang: Lang;
  text?: string;
  phonemes?: string;
}

export type Segment =
  /** A line for the device voice; if `voice` has a bundled clip, that plays instead. */
  | { kind: 'say'; text: string; lang: Lang; voice?: VoiceLine }
  /** A phonics sound: a grown-up's recording, else the bundled clip, else `fallback` on the device voice. */
  | { kind: 'clip'; key: string; fallback: string; lang: Lang; voice?: VoiceLine };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Short fingerprint of the words, so a reworded line never plays an old clip (FNV-1a). */
function fingerprint(s: string): string {
  let h = 0x811c9dc5;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0)!, 0x01000193) >>> 0;
  return h.toString(36).padStart(7, '0');
}
const voiceId = (lang: Lang, base: string, words: string) => `${lang}/${base}-${fingerprint(words)}`;

/** One spoken line, written twice: plain text for the device voice, and markup for the Kokoro clip. */
function line(lang: Lang, id: string, build: (name: (item: string) => string, short: (item: string) => string) => string): Segment {
  const text = build((x) => spokenName(x, lang), (x) => shortName(x, lang));
  const voiceText = build((x) => voiceName(x, lang), (x) => voiceShort(x, lang));
  return { kind: 'say', text, lang, voice: { id: voiceId(lang, id, voiceText), lang, text: voiceText } };
}

function sound(item: string, lang: Lang): Segment {
  const phonic = phonicFor(item, lang);
  return {
    kind: 'clip', key: recordingKey(item, lang), fallback: phonic?.approx ?? '', lang,
    voice: phonic?.ps ? { id: voiceId(lang, `sound-${letterSlug(item)}`, phonic.ps), lang, phonemes: phonic.ps } : undefined,
  };
}

/**
 * What's said when a letter or number appears: one smooth sentence, a single clip.
 *   en: "C! C is for Cat."   es: "¡Ce! Ce de Conejo."
 * Numbers count instead: "Three! Let's count: one, two, three!"
 */
export function introSequence(item: string, lang: Lang): Segment[] {
  const id = slug(item);
  if (isNumber(item)) {
    const n = Number(item);
    const counting = Array.from({ length: n }, (_, i) => numberWord(i + 1, lang)).join(', ');
    return [line(lang, `intro-${id}`, (name) => {
      if (n === 0) return lang === 'es' ? '¡Cero! Cero es nada. ¡No hay ninguna!' : 'Zero! Zero means none at all!';
      return lang === 'es' ? `¡${cap(name(item))}! Vamos a contar: ${counting}. ¡${cap(name(item))}!` : `${cap(name(item))}! Let's count: ${counting}. ${cap(name(item))}!`;
    })];
  }
  const word = wordFor(item, lang);
  if (lang === 'es') {
    return [line(lang, `intro-${id}`, (name, short) => `¡${cap(name(item))}! ${cap(short(item))} de ${word[0]}.`)];
  }
  // Ñ in English mode: there's no English picture word.
  if (item.toUpperCase() === 'Ñ') return [line(lang, `intro-${id}`, (name, short) => `${cap(name(item))}! ${cap(short(item))} is a Spanish letter.`)];
  return [line(lang, `intro-${id}`, (name, short) => `${cap(name(item))}! ${cap(short(item))} is for ${word[0]}.`)];
}

/**
 * The "Letter sound" button: "C says… /k/ … /k/" / "La ce suena… /k/ … /k/".
 * Spanish H explains that it's silent.
 */
export function soundSequence(item: string, lang: Lang): Segment[] {
  if (isNumber(item)) return introSequence(item, lang);
  if (isSilent(item, lang)) return [line(lang, `says-${letterSlug(item)}`, () => 'La hache no suena. ¡Shhh!')];
  const lead = line(lang, `says-${letterSlug(item)}`, (_, short) => (lang === 'es' ? `La ${short(item)} suena` : `${cap(short(item))} says`));
  return [lead, sound(item, lang), sound(item, lang)];
}

/** The short spoken prompt after a wrong answer: "Find C!" / "¡Busca la ce!" */
export const findPrompt = (item: string, lang: Lang): Segment[] => [
  line(lang, `find-${slug(item)}`, (name) =>
    lang === 'es' ? `¡Busca ${isNumber(item) ? 'el' : 'la'} ${name(item)}!` : `Find ${name(item)}!`),
];

/** "Let's draw A!" / "¡Vamos a dibujar la a!" */
export const drawPrompt = (item: string, lang: Lang): Segment[] => [
  line(lang, `draw-${slug(item)}`, (name) =>
    lang === 'es' ? `¡Vamos a dibujar ${isNumber(item) ? 'el' : 'la'} ${name(item)}!` : `Let's draw ${name(item)}!`),
];

/** Just the name, said after a cheer: "A!" / "¡A!" */
export const nameLine = (item: string, lang: Lang): Segment[] => [
  line(lang, `name-${letterSlug(item)}`, (_, short) => (lang === 'es' ? `¡${cap(short(item))}!` : `${cap(short(item))}!`)),
];

/** Plain text of a sequence, for tests and captions. */
export const sequenceText = (segments: Segment[]) =>
  segments.map((s) => (s.kind === 'say' ? s.text : s.fallback)).join(' ');

/** Every bundled line, for the clip generator. Throws if two lines share an id but differ. */
export function allVoiceLines(): VoiceLine[] {
  const out = new Map<string, VoiceLine>();
  for (const lang of ['en', 'es'] as Lang[]) {
    // The Spanish sets are a superset (they add Ñ), and "Both" mode uses them with the English voice too.
    const items = [...itemsFor('upper', 'es'), ...itemsFor('lower', 'es'), ...itemsFor('numbers', 'es')];
    for (const item of items) {
      for (const seg of [...introSequence(item, lang), ...soundSequence(item, lang), ...findPrompt(item, lang), ...drawPrompt(item, lang), ...nameLine(item, lang)]) {
        if (!seg.voice) continue;
        const prev = out.get(seg.voice.id);
        if (prev && JSON.stringify(prev) !== JSON.stringify(seg.voice)) throw new Error(`Voice line ${seg.voice.id} has two different texts`);
        out.set(seg.voice.id, seg.voice);
      }
    }
  }
  return [...out.values()];
}
