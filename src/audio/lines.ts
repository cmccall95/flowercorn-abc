import { isNumber, letterSlug, numberWord, shortName, slug, spokenName, voiceName, voiceShort } from '../content/names';
import { isSilent, phonicFor, recordingKey } from '../content/phonics';
import { CHEERS } from '../content/cheers';
import { SPOKEN } from '../content/phrases';
import { itemsFor, type Lang } from '../content/sets';
import { GOLD_STICKERS, STICKER_PAGES, STICKERS } from '../content/stickers';
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

/** Who's playing: the name for the device voice, and where her recorded name is kept. */
export interface NameRef {
  spoken: string;
  profileId: string;
}

export type PhrasePart = { voice: VoiceLine } | { nameKey: string; spoken: string };

/** Every segment can ask for a longer pause before it (milliseconds). */
export type Segment = (
  /** A line for the device voice; if `voice` has a bundled clip, that plays instead. */
  | { kind: 'say'; text: string; lang: Lang; voice?: VoiceLine }
  /** A phonics sound: a grown-up's recording, else the bundled clip, else `fallback` on the device voice. */
  | { kind: 'clip'; key: string; fallback: string; lang: Lang; voice?: VoiceLine }
  /**
   * A line that may include the child's name: bundled clips, with her recorded name slotted in (or the device
   * voice saying it, where there is one). `text` is the whole line, for captions and as a last resort.
   */
  | { kind: 'phrase'; text: string; lang: Lang; parts: PhrasePart[] }
) & { pause?: number };

export const nameRecordingKey = (profileId: string) => `name:${profileId}`;

/** Pause between a letter's name and its picture word: "A." … "A is for Apple." */
export const NAME_TO_WORD_PAUSE_MS = 1000;

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
 * What's said when a letter or number appears: the name, a one-second pause, then the picture word.
 *   en: "C." … "C is for Cat."   es: "Ce." … "Ce de Conejo."
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
  const first = line(lang, `intro-${id}`, (name) => `${cap(name(item))}.`);
  const second = (build: Parameters<typeof line>[2]): Segment => ({ ...line(lang, `word-${letterSlug(item)}`, build), pause: NAME_TO_WORD_PAUSE_MS });
  if (lang === 'es') return [first, second((_, short) => `${cap(short(item))} de ${word[0]}.`)];
  // Ñ in English mode: there's no English picture word.
  if (item.toUpperCase() === 'Ñ') return [first, second((_, short) => `${cap(short(item))} is a Spanish letter.`)];
  return [first, second((_, short) => `${cap(short(item))} is for ${word[0]}.`)];
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

/** Clean up the words around a name: "! Pick a game!" → "Pick a game!", ", you got…" → "You got…". */
function tidy(piece: string, lang: Lang, afterName: boolean): string {
  let t = piece.trim();
  if (afterName) t = t.replace(/^[,.!?]+\s*/, '');
  if (!/[\p{L}\p{N}]/u.test(t)) return '';
  if (afterName) t = cap(t);
  if (lang === 'es' && /!$/.test(t) && !t.includes('¡')) t = `¡${t}`;
  return t;
}

/**
 * A spoken line that may include the child's name ("{n}") and other values ("{s}").
 * The bundled clips are cut around the name, so they work for every child.
 */
export function phrase(template: string, lang: Lang, vars: Record<string, string> = {}, who?: NameRef): Segment[] {
  const fill = (s: string, name: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => (k === 'n' ? name : vars[k] ?? ''));
  const parts: PhrasePart[] = [];
  template.split('{n}').forEach((piece, i) => {
    if (i > 0 && who) parts.push({ nameKey: nameRecordingKey(who.profileId), spoken: who.spoken });
    const words = tidy(fill(piece, ''), lang, i > 0);
    if (words) parts.push({ voice: { id: voiceId(lang, 'p', words), lang, text: words } });
  });
  return [{ kind: 'phrase', text: fill(template, who?.spoken ?? '').replace(/\s+([,!?.])/g, '$1').replace(/^[,\s]+/, ''), lang, parts }];
}

/** Plain text of a sequence, for tests and captions. */
export const sequenceText = (segments: Segment[]) =>
  segments.map((s) => (s.kind === 'clip' ? s.fallback : s.text)).join(' ');

/** Every bundled line, for the clip generator. Throws if two lines share an id but differ. */
export function allVoiceLines(): VoiceLine[] {
  const out = new Map<string, VoiceLine>();
  for (const lang of ['en', 'es'] as Lang[]) {
    // The Spanish sets are a superset (they add Ñ), and "Both" mode uses them with the English voice too.
    const items = [...itemsFor('upper', 'es'), ...itemsFor('lower', 'es'), ...itemsFor('numbers', 'es')];
    for (const item of items) {
      for (const seg of [...introSequence(item, lang), ...soundSequence(item, lang), ...findPrompt(item, lang), ...drawPrompt(item, lang), ...nameLine(item, lang)]) {
        add(seg);
      }
    }
    // Everything else the game says, with a stand-in name (the clips never contain the name).
    const who = { spoken: 'Lily', profileId: 'x' };
    const templates = [...Object.values(SPOKEN[lang]), ...CHEERS[lang]].filter((t) => !t.includes('{s}'));
    for (const t of templates) phrase(t, lang, {}, who).forEach(add);
    for (const s of [...STICKERS, ...GOLD_STICKERS]) {
      phrase(SPOKEN[lang].gotSticker, lang, { s: s[lang] }, who).forEach(add);
      phrase(`${cap(s[lang])}!`, lang).forEach(add);
    }
    for (const p of STICKER_PAGES) phrase(`${p[lang]}!`, lang).forEach(add);
  }
  return [...out.values()];

  function add(seg: Segment) {
    const voices = seg.kind === 'phrase' ? seg.parts.flatMap((p) => ('voice' in p ? [p.voice] : [])) : seg.voice ? [seg.voice] : [];
    for (const v of voices) {
      const prev = out.get(v.id);
      if (prev && JSON.stringify(prev) !== JSON.stringify(v)) throw new Error(`Voice line ${v.id} has two different texts`);
      out.set(v.id, v);
    }
  }
}
