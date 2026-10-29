import { describe, expect, it } from 'vitest';
import { LETTER_GAP_MS, wholeText, allVoiceLines, drawPrompt, findPrompt, introSequence, nameLine, phrase, type Segment, sequenceText, soundSequence } from './lines';

const voiceOf = (seg: Segment) => (seg.kind === 'say' || seg.kind === 'clip' ? seg.voice : undefined);
/** A sequence as pieces: letters as [X], word clips as their text, pauses as | when they're long. */
const shape = (segs: Segment[]) => segs.map((s) => `${(s.pause ?? 0) >= 1000 ? '| ' : ''}${s.kind === 'letter' ? `[${s.item}]` : s.kind === 'clip' ? `/${s.fallback}/` : s.kind === 'say' ? s.text : '…'}`);

describe('introSequence', () => {
  it('says the name, pauses a full second, then the picture word', () => {
    const seq = introSequence('C', 'en');
    expect(shape(seq)).toEqual(['[C]', '| [C]', 'is for Cat.']);
    expect(sequenceText(seq)).toBe('C C is for Cat.');
    expect(seq[1].pause).toBe(1000);
    expect(seq[2].pause).toBe(LETTER_GAP_MS);
  });

  it('plays each letter name as its own clip, joined to the words with a short gap', () => {
    expect(LETTER_GAP_MS).toBeGreaterThanOrEqual(150);
    expect(LETTER_GAP_MS).toBeLessThanOrEqual(250);
    const [, , words] = introSequence('A', 'en');
    expect(voiceOf(words)).toMatchObject({ lang: 'en', text: 'is for Apple.' });
    expect(voiceOf(words)?.id).toMatch(/^en\/f-[a-z0-9]{7}$/);
  });

  it('uses Spanish letter names and words', () => {
    expect(shape(introSequence('C', 'es'))).toEqual(['[C]', '| [C]', 'de Conejo.']);
    expect(shape(introSequence('Ñ', 'es'))).toEqual(['[Ñ]', '| [Ñ]', 'de Ñandú.']);
    expect(sequenceText(introSequence('H', 'es'))).toBe('hache hache de Helado.');
  });

  it('marks lowercase letters', () => {
    expect(shape(introSequence('b', 'en'))).toEqual(['Here is little', '[B]', '| [B]', 'is for Butterfly.']);
    expect(shape(introSequence('b', 'es'))).toEqual(['Esta es la', '[B]', 'minúscula.', '| [B]', 'de Ballena.']);
  });

  it('counts up for numbers', () => {
    expect(sequenceText(introSequence('3', 'en'))).toBe("Three! Let's count: one, two, three. Three!");
    expect(sequenceText(introSequence('3', 'es'))).toBe('¡Tres! Vamos a contar: uno, dos, tres. ¡Tres!');
    expect(sequenceText(introSequence('0', 'es'))).toContain('Cero');
  });
});

describe('phrase', () => {
  const who = { spoken: 'Lily', profileId: 'p1' };

  it('says the full line with her name on the device voice', () => {
    const [seg] = phrase('Hi, {n}! Pick a game!', 'en', {}, who);
    expect(seg.kind === 'phrase' && seg.text).toBe('Hi, Lily! Pick a game!');
  });

  it('cuts the clips around her recorded name', () => {
    const [seg] = phrase('Hi, {n}! Pick a game!', 'en', {}, who);
    if (seg.kind !== 'phrase') throw new Error('expected a phrase');
    expect(seg.parts.map((p) => ('voice' in p ? p.voice.text : p.nameKey))).toEqual(['Hi,', 'name:p1', 'Pick a game!']);
  });

  it('tidies the words after the name in both languages', () => {
    const parts = (t: string, lang: 'en' | 'es', vars = {}) => {
      const [seg] = phrase(t, lang, vars, who);
      return seg.kind === 'phrase' ? seg.parts.map((p) => ('voice' in p ? p.voice.text : '<name>')) : [];
    };
    expect(parts('{n}, you got a {s} sticker!', 'en', { s: 'unicorn' })).toEqual(['<name>', 'You got a unicorn sticker!']);
    expect(parts('¡{n}, ganaste una estampita de {s}!', 'es', { s: 'unicornio' })).toEqual(['<name>', '¡Ganaste una estampita de unicornio!']);
    expect(parts('Great job, {n}!', 'en')).toEqual(['Great job,', '<name>']);
    expect(parts('¡Sí, {n}! ¡Correcto!', 'es')).toEqual(['¡Sí,', '<name>', '¡Correcto!']);
  });

  it('works without a name', () => {
    const [seg] = phrase('Tap the present!', 'en');
    expect(seg.kind === 'phrase' && seg.parts.length).toBe(1);
  });
});

describe('soundSequence (the Letter sound button)', () => {
  it('leads in, then plays the sound twice', () => {
    const seq = soundSequence('C', 'en');
    expect(shape(seq)).toEqual(['The letter', '[C]', 'says', '/kuh/', '/kuh/']);
    expect(voiceOf(seq[3])).toMatchObject({ lang: 'en', phonemes: 'kə' });
    expect(shape(soundSequence('C', 'es'))).toEqual(['La letra', '[C]', 'suena', '/ca/', '/ca/']);
  });

  it('says the Spanish H is silent instead of a sound', () => {
    const seq = soundSequence('H', 'es');
    expect(seq.some((s) => s.kind === 'clip')).toBe(false);
    expect(sequenceText(seq)).toContain('La hache no suena');
  });

  it('shares one recording per letter for both cases', () => {
    const upper = soundSequence('M', 'en')[3];
    const lower = soundSequence('m', 'en')[3];
    expect(upper.kind === 'clip' && lower.kind === 'clip' && upper.key === lower.key).toBe(true);
  });
});

describe('prompts', () => {
  it('asks for the item in each language', () => {
    expect(shape(findPrompt('D', 'en'))).toEqual(['Can you find', '[D]']);
    expect(shape(findPrompt('d', 'en'))).toEqual(['Can you find little', '[D]']);
    expect(shape(findPrompt('D', 'es'))).toEqual(['¿Puedes encontrar la', '[D]']);
    expect(sequenceText(findPrompt('7', 'es'))).toBe('¡Busca el siete!');
    expect(shape(drawPrompt('b', 'es'))).toEqual(['¡Vamos a dibujar la', '[B]', 'minúscula!']);
    expect(shape(drawPrompt('B', 'en'))).toEqual(["Let's draw the letter", '[B]']);
    expect(shape(nameLine('w', 'en'))).toEqual(['[W]']);
  });

  it('keeps word clips to a few words, so the voice has room to start cleanly', () => {
    const items = ['A', 'a', 'Ñ', 'ñ', 'Q'];
    for (const lang of ['en', 'es'] as const) {
      for (const item of items) {
        for (const seg of [...introSequence(item, lang), ...findPrompt(item, lang), ...drawPrompt(item, lang), ...soundSequence(item, lang)]) {
          if (seg.kind === 'say') expect(seg.text.length, seg.text).toBeGreaterThan(3);
        }
      }
    }
  });
});

describe('allVoiceLines', () => {
  const lines = allVoiceLines();

  it('covers every letter, both cases, Ñ and numbers in both languages', () => {
    const ids = new Set(lines.map((l) => l.id.replace(/-[a-z0-9]{7}$/, '')));
    for (const id of ['es/intro-n10', 'en/find-n3', 'es/draw-n3', 'en/sound-ny', 'es/name-n5', 'es/says-h', 'en/f', 'es/f', 'en/p', 'es/p']) {
      expect(ids.has(id), id).toBe(true);
    }
    expect(ids.has('es/sound-h')).toBe(false);
  });

  it('never puts a letter name in a word clip', () => {
    const texts = new Set(lines.map((l) => l.text));
    expect(texts).toContain('is for Apple.');
    expect(texts).toContain('Here is little');
    expect([...texts].some((t) => t && /^[A-Z][.!]?$/.test(t))).toBe(false);
  });

  it('changes the id when the words change', () => {
    expect(voiceOf(introSequence('A', 'en')[2])?.id).not.toBe(voiceOf(introSequence('B', 'en')[2])?.id);
    expect(voiceOf(soundSequence('C', 'en')[1])?.id).toBe(voiceOf(soundSequence('c', 'en')[1])?.id);
  });

  it('uses file-safe ids that never depend on letter case', () => {
    for (const l of lines) expect(l.id).toMatch(/^(en|es)\/[a-z0-9-]+$/);
  });

  it('includes the cheers and sticker lines, never with a name in them', () => {
    const texts = lines.map((l) => l.text);
    expect(texts).toContain('Great job,');
    expect(texts).toContain('You got a unicorn sticker!');
    expect(texts).toContain('¡Ganaste una estampita de unicornio!');
    expect(texts.some((t) => t?.includes('Lily'))).toBe(false);
  });

  it('has text or phonemes for every line', () => {
    for (const l of lines) expect(!!(l.text || l.phonemes), l.id).toBe(true);
  });
});

describe('whole sentences for the cloud voice', () => {
  const whole = (segs: Segment[], lang: 'en' | 'es') => segs.filter((s) => s.whole).map((s) => wholeText(s.whole!.pieces, lang));

  it('reads each sentence in one go, letters included', () => {
    expect(whole(introSequence('B', 'en'), 'en')).toEqual(['B.', 'B is for Butterfly.']);
    expect(whole(introSequence('b', 'en'), 'en')).toEqual(['Here is little B.', 'B is for Butterfly.']);
    expect(whole(introSequence('b', 'es'), 'es')).toEqual(['Esta es la be minúscula.', 'Be de Ballena.']);
    expect(whole(findPrompt('d', 'es'), 'es')).toEqual(['¿Puedes encontrar la de minúscula?']);
    expect(whole(findPrompt('D', 'en'), 'en')).toEqual(['Can you find D?']);
    expect(whole(drawPrompt('D', 'es'), 'es')).toEqual(['¡Vamos a dibujar la de!']);
    expect(whole(soundSequence('C', 'en'), 'en')).toEqual(['The letter C says…']);
    expect(whole(introSequence('Ñ', 'en'), 'en')).toEqual(['Enye.', 'Enye is a Spanish letter.']);
  });

  it('knows how many pieces each sentence replaces', () => {
    const seq = introSequence('b', 'es');
    expect(seq.filter((s) => s.whole).map((s) => s.whole!.size)).toEqual([3, 2]);
  });

  it("uses a grown-up's spelling fix", () => {
    expect(wholeText([{ letter: 'Z' }, 'is for Zebra.'], 'en', { en: { Z: 'zee' } })).toBe('Zee is for Zebra.');
  });
});
