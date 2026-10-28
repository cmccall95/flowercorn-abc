import type { Lang } from '../../content/sets';
import type { EnginePart } from './pieces';
import { spanishPhonemes } from './spanish';

// Punctuation stays as-is (it shapes pauses and tone); the words between are turned into phonemes.
const PUNCT = /((?:\s*[;:,.!?¡¿—…"«»“”(){}[\]]+\s*)+)/;

/** English words → phonemes with espeak-ng (the same rules Kokoro's own browser package uses). */
async function english(text: string): Promise<string> {
  const { phonemize } = await import('phonemizer');
  const chunks = await Promise.all(
    text.split(PUNCT).map(async (chunk, i) => (i % 2 || !chunk.trim() ? chunk : (await phonemize(chunk, 'en-us')).join(' '))),
  );
  return chunks.join('')
    .replace(/ʲ/g, 'j').replace(/r/g, 'ɹ').replace(/x/g, 'k').replace(/ɬ/g, 'l')
    .replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, 'z');
}

/** All the parts of a line as one phoneme string for the voice. */
export async function partsToPhonemes(parts: EnginePart[], lang: Lang): Promise<string> {
  const out = await Promise.all(parts.map(async (p) => {
    if ('ps' in p) return p.ps;
    const l = p.lang ?? lang;
    return l === 'es' ? spanishPhonemes(p.text) : english(p.text);
  }));
  return out.join('').replace(/\s+/g, ' ').trim();
}
