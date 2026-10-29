import { isLower, isNumber, letterSlug, numberWord, slug, spokenName } from '../content/names';
import { isSilent, phonicFor, recordingKey } from '../content/phonics';
import { CHEERS } from '../content/cheers';
import { SPOKEN } from '../content/phrases';
import { itemsFor, type Lang } from '../content/sets';
import { GOLD_STICKERS, STICKER_PAGES, STICKERS } from '../content/stickers';
import { wordFor } from '../content/words';
import type { EnginePiece } from './engine/pieces';

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

/** A whole sentence for the cloud voice: words, and letters (named when it's spoken, so a grown-up's fix applies). */
export type SentencePiece = string | { letter: string };

/**
 * Every segment can ask for a longer pause before it (milliseconds). The first segment of a sentence built from
 * pieces carries the `whole` sentence, so a voice that reads letters well can say it in one go and skip the rest.
 */
export type Segment = (
  /** A fixed line: the in-app voice (`engine`), else its bundled clip (`voice`), else the device voice (`text`). */
  | { kind: 'say'; text: string; lang: Lang; voice?: VoiceLine; engine?: EnginePiece[] }
  /**
   * A letter's name on its own: a grown-up's recording, else a bundled recording (public/voice/letters), else the
   * in-app voice (said twice, keeping the second), else the device voice.
   */
  | { kind: 'letter'; item: string; lang: Lang }
  /**
   * A phonics sound: a grown-up's recording, else a bundled recording, else the in-app voice, else the bundled
   * Kokoro clip, else the device voice.
   */
  | { kind: 'clip'; key: string; fallback: string; lang: Lang; item: string; voice?: VoiceLine; engine?: EnginePiece[] }
  /**
   * A line that may include the child's name: bundled clips, with her recorded name slotted in (or the device
   * voice saying it, where there is one). `text` is the whole line, for captions and as a last resort.
   */
  | { kind: 'phrase'; text: string; lang: Lang; parts: PhrasePart[] }
) & { pause?: number; whole?: { pieces: SentencePiece[]; size: number } };

export const nameRecordingKey = (profileId: string) => `name:${profileId}`;
/** A grown-up's recording of a letter's name (shared by both cases). */
export const letterNameKey = (item: string, lang: Lang) => `lettername:${lang}:${item.toUpperCase()}`;

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

/** A fixed line of words (no letter names in it): the in-app voice, its bundled clip, or the device voice. */
function line(lang: Lang, id: string, text: string): Segment {
  return { kind: 'say', text, lang, voice: { id: voiceId(lang, id, text), lang, text }, engine: [text] };
}

/** Gap between a letter's clip and the words around it: "A" · "is for Apple." */
export const LETTER_GAP_MS = 200;

type Piece = SentencePiece;
const L = (item: string): Piece => ({ letter: item.toUpperCase() });

/**
 * A sentence built from pieces: each letter name is its own clip (a grown-up's recording, a bundled recording,
 * or the in-app voice saying it twice and keeping the second), joined to short phrases of words with a small
 * gap. Voices garble very short lines, so the phrases are kept to a few words where possible.
 */
function sentence(lang: Lang, pieces: Piece[], end = '.'): Segment[] {
  const last = pieces[pieces.length - 1];
  const whole = { pieces: typeof last === 'string' && /[.!?]$/.test(last) ? pieces : [...pieces, end], size: pieces.length };
  return pieces.map((p, i): Segment => {
    const seg: Segment = typeof p === 'string' ? line(lang, 'f', p) : { kind: 'letter', item: p.letter, lang };
    return i > 0 ? { ...seg, pause: LETTER_GAP_MS } : { ...seg, whole };
  });
}

const withPause = (segs: Segment[], pause: number): Segment[] => segs.map((s, i) => (i === 0 ? { ...s, pause } : s));

/** A sentence's text for the cloud voice. English letters stay as capitals ("B"); Spanish ones are named ("be"). */
export function wholeText(pieces: SentencePiece[], lang: Lang, fixes: Partial<Record<Lang, Record<string, string>>> = {}): string {
  return pieces.map((p) => {
    if (typeof p === 'string') return p;
    const fix = fixes[lang]?.[p.letter];
    if (fix) return fix;
    return lang === 'es' || p.letter === 'Ñ' ? spokenName(p.letter, lang) : p.letter;
  }).join(' ').replace(/\s+([.!?,…])/g, '$1').replace(/^(\p{L})/u, (c) => c.toUpperCase());
}

function sound(item: string, lang: Lang): Segment {
  const phonic = phonicFor(item, lang);
  return {
    kind: 'clip', key: recordingKey(item, lang), fallback: phonic?.approx ?? '', lang, item: item.toUpperCase(),
    voice: phonic?.ps ? { id: voiceId(lang, `sound-${letterSlug(item)}`, phonic.ps), lang, phonemes: phonic.ps } : undefined,
    engine: phonic?.ps ? [{ ps: phonic.ps }] : undefined,
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
    const name = cap(spokenName(item, lang));
    const counting = Array.from({ length: n }, (_, i) => numberWord(i + 1, lang)).join(', ');
    if (n === 0) return [line(lang, `intro-${id}`, lang === 'es' ? '¡Cero! Cero es nada. ¡No hay ninguna!' : 'Zero! Zero means none at all!')];
    return [line(lang, `intro-${id}`, lang === 'es' ? `¡${name}! Vamos a contar: ${counting}. ¡${name}!` : `${name}! Let's count: ${counting}. ${name}!`)];
  }
  const word = wordFor(item, lang);
  const lower = isLower(item);
  const first = lang === 'es'
    ? sentence(lang, lower ? ['Esta es la', L(item), 'minúscula.'] : [L(item)])
    : sentence(lang, lower ? ['Here is little', L(item)] : [L(item)]);
  // Ñ in English mode: there's no English picture word.
  const rest = lang === 'es' ? `de ${word[0]}.` : item.toUpperCase() === 'Ñ' ? 'is a Spanish letter.' : `is for ${word[0]}.`;
  return [...first, ...withPause(sentence(lang, [L(item), rest]), NAME_TO_WORD_PAUSE_MS)];
}

/**
 * The "Letter sound" button: "The letter C says… /k/ … /k/" / "La letra ce suena… /k/ … /k/".
 * Spanish H explains that it's silent.
 */
export function soundSequence(item: string, lang: Lang): Segment[] {
  if (isNumber(item)) return introSequence(item, lang);
  if (isSilent(item, lang)) return [line(lang, `says-${letterSlug(item)}`, 'La hache no suena. ¡Shhh!')];
  const lead = lang === 'es' ? sentence(lang, ['La letra', L(item), 'suena'], '…') : sentence(lang, ['The letter', L(item), 'says'], '…');
  return [...lead, sound(item, lang), sound(item, lang)];
}

/** The short spoken prompt after a wrong answer: "Can you find C?" / "¿Puedes encontrar la ce?" */
export function findPrompt(item: string, lang: Lang): Segment[] {
  if (isNumber(item)) return [line(lang, `find-${slug(item)}`, lang === 'es' ? `¡Busca el ${spokenName(item, lang)}!` : `Find ${spokenName(item, lang)}!`)];
  if (lang === 'es') return sentence(lang, isLower(item) ? ['¿Puedes encontrar la', L(item), 'minúscula?'] : ['¿Puedes encontrar la', L(item)], '?');
  return sentence(lang, [isLower(item) ? 'Can you find little' : 'Can you find', L(item)], '?');
}

/** "Let's draw the letter A!" / "¡Vamos a dibujar la a!" */
export function drawPrompt(item: string, lang: Lang): Segment[] {
  if (isNumber(item)) return [line(lang, `draw-${slug(item)}`, lang === 'es' ? `¡Vamos a dibujar el ${spokenName(item, lang)}!` : `Let's draw ${spokenName(item, lang)}!`)];
  if (lang === 'es') return sentence(lang, isLower(item) ? ['¡Vamos a dibujar la', L(item), 'minúscula!'] : ['¡Vamos a dibujar la', L(item)], '!');
  return sentence(lang, [isLower(item) ? "Let's draw little" : "Let's draw the letter", L(item)], '!');
}

/** Just the name, said after a cheer: "A!" / "¡A!" */
export const nameLine = (item: string, lang: Lang): Segment[] =>
  isNumber(item) ? [line(lang, `name-${slug(item)}`, lang === 'es' ? `¡${cap(spokenName(item, lang))}!` : `${cap(spokenName(item, lang))}!`)] : sentence(lang, [L(item)], '!');

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
  segments.map((s) => (s.kind === 'clip' ? s.fallback : s.kind === 'letter' ? spokenName(s.item, s.lang) : s.text)).join(' ')
    .replace(/\s+([,.!?])/g, '$1');

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
    const voices = seg.kind === 'phrase' ? seg.parts.flatMap((p) => ('voice' in p ? [p.voice] : []))
      : seg.kind !== 'letter' && seg.voice ? [seg.voice] : [];
    for (const v of voices) {
      const prev = out.get(v.id);
      if (prev && JSON.stringify(prev) !== JSON.stringify(v)) throw new Error(`Voice line ${v.id} has two different texts`);
      out.set(v.id, v);
    }
  }
}
