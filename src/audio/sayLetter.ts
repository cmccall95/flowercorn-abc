import { isNumber, numberWord, shortName, spokenName } from '../content/names';
import { isSilent, phonicFor, recordingKey } from '../content/phonics';
import type { Lang } from '../content/sets';
import { wordFor } from '../content/words';
import { playClip, stopClip } from './recordings';
import { cancelSpeech, currentGeneration, speakLine } from './speech';

export type Segment =
  | { kind: 'say'; text: string; lang: Lang }
  /** A recorded phonics clip; if there's no recording, `fallback` is said instead. */
  | { kind: 'clip'; key: string; fallback: string; lang: Lang };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * "Sound it out": name → phonics sound twice → picture word.
 *   en: "C! C says /k/, /k/. C is for Cat!"
 *   es: "¡Ce! La ce suena /k/, /k/. ¡Ce de Conejo!"
 * Numbers count instead: "Three! Let's count: one, two, three!"
 */
export function introSequence(item: string, lang: Lang): Segment[] {
  const say = (text: string): Segment => ({ kind: 'say', text, lang });
  const name = spokenName(item, lang);

  if (isNumber(item)) {
    const n = Number(item);
    if (n === 0) return [say(lang === 'es' ? '¡Cero! Cero es nada. ¡No hay ninguna!' : 'Zero! Zero means none at all!')];
    const counting = Array.from({ length: n }, (_, i) => numberWord(i + 1, lang)).join(', ');
    return [say(lang === 'es' ? `¡${cap(name)}! Vamos a contar: ${counting}. ¡${cap(name)}!` : `${cap(name)}! Let's count: ${counting}. ${cap(name)}!`)];
  }

  const short = shortName(item, lang);
  const word = wordFor(item, lang);
  const phonic = phonicFor(item, lang);
  const clip = (): Segment => ({ kind: 'clip', key: recordingKey(item, lang), fallback: phonic?.approx ?? '', lang });

  if (lang === 'es') {
    if (isSilent(item, lang)) return [say(`¡${cap(name)}! La hache no suena. ¡Shhh! ${cap(short)} de ${word[0]}.`)];
    return [say(`¡${cap(name)}! La ${short} suena`), clip(), clip(), say(`¡${cap(short)} de ${word[0]}!`)];
  }
  if (!word) return [say(`${cap(name)}!`)];
  // Ñ in English mode: explain it's a Spanish letter.
  if (item.toUpperCase() === 'Ñ') return [say(`${cap(name)}! In Spanish, enye says`), clip(), clip()];
  return [say(`${cap(name)}! ${cap(short)} says`), clip(), clip(), say(`${cap(short)} is for ${word[0]}!`)];
}

/** The short spoken prompt after a wrong answer: "Find C!" / "¡Busca la ce!" */
export function findPrompt(item: string, lang: Lang): string {
  const name = spokenName(item, lang);
  if (lang === 'es') return isNumber(item) ? `¡Busca el ${name}!` : `¡Busca la ${name}!`;
  return `Find ${name}!`;
}

/** Say one line right now, cutting off anything playing (speech or a recorded clip). */
export function say(text: string, lang: Lang): Promise<void> {
  stopClip();
  cancelSpeech();
  return speakLine(text, lang);
}

/** Play segments in order. A newer call (or cancelSpeech) stops this one between steps. */
export async function playSequence(segments: Segment[]): Promise<void> {
  cancelSpeech();
  stopClip();
  const gen = currentGeneration();
  for (const seg of segments) {
    if (currentGeneration() !== gen) return;
    if (seg.kind === 'say') await speakLine(seg.text, seg.lang);
    else if (!(await playClip(seg.key))) await speakLine(seg.fallback, seg.lang);
  }
}

/** Plain text of a sequence, for tests and for captions. */
export const sequenceText = (segments: Segment[]) =>
  segments.map((s) => (s.kind === 'say' ? s.text : s.fallback)).join(' ');
