import { describe, expect, it } from 'vitest';
import { allVoiceLines, drawPrompt, findPrompt, introSequence, nameLine, phrase, type Segment, sequenceText, soundSequence } from './lines';

const voiceOf = (seg: Segment) => (seg.kind === 'phrase' ? undefined : seg.voice);

describe('introSequence', () => {
  it('says the name, pauses a full second, then the picture word', () => {
    const seq = introSequence('C', 'en');
    expect(seq.map((x) => x.kind)).toEqual(['say', 'say']);
    expect(sequenceText(seq)).toBe('C. C is for Cat.');
    expect(seq[1].pause).toBe(1000);
  });

  it('uses Spanish letter names and words', () => {
    expect(sequenceText(introSequence('C', 'es'))).toBe('Ce. Ce de Conejo.');
    expect(sequenceText(introSequence('Ñ', 'es'))).toBe('Eñe. Eñe de Ñandú.');
    expect(sequenceText(introSequence('H', 'es'))).toBe('Hache. Hache de Helado.');
  });

  it('marks lowercase letters', () => {
    expect(sequenceText(introSequence('b', 'en'))).toBe('Little B. B is for Butterfly.');
    expect(sequenceText(introSequence('b', 'es'))).toBe('Be minúscula. Be de Ballena.');
  });

  it('gives the bundled voice exact phonemes for English letter names', () => {
    const [name, word] = introSequence('A', 'en');
    expect(voiceOf(name)).toMatchObject({ lang: 'en', text: '[A](/ˈA/).' });
    expect(voiceOf(name)?.id).toMatch(/^en\/intro-ua-[a-z0-9]{7}$/);
    expect(voiceOf(word)?.text).toBe('[A](/ˈA/) is for Apple.');
    expect(voiceOf(introSequence('a', 'en')[0])?.text).toBe('Little [A](/ˈA/).');
    expect(voiceOf(introSequence('a', 'en')[1])?.id).toBe(voiceOf(word)?.id);
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
    expect(seq.map((s) => s.kind)).toEqual(['say', 'clip', 'clip']);
    expect(sequenceText(seq)).toBe('C says kuh kuh');
    expect(voiceOf(seq[1])).toMatchObject({ lang: 'en', phonemes: 'kə' });
    expect(sequenceText(soundSequence('C', 'es'))).toBe('La ce suena ca ca');
  });

  it('says the Spanish H is silent instead of a sound', () => {
    const seq = soundSequence('H', 'es');
    expect(seq.some((s) => s.kind === 'clip')).toBe(false);
    expect(sequenceText(seq)).toContain('La hache no suena');
  });

  it('shares one recording per letter for both cases', () => {
    const upper = soundSequence('M', 'en')[1];
    const lower = soundSequence('m', 'en')[1];
    expect(upper.kind === 'clip' && lower.kind === 'clip' && upper.key === lower.key).toBe(true);
  });
});

describe('prompts', () => {
  it('asks for the item in each language', () => {
    expect(sequenceText(findPrompt('D', 'en'))).toBe('Find D!');
    expect(voiceOf(findPrompt('D', 'en')[0])?.text).toBe('Find [D](/dˈi/)!');
    expect(sequenceText(findPrompt('D', 'es'))).toBe('¡Busca la de!');
    expect(sequenceText(findPrompt('7', 'es'))).toBe('¡Busca el siete!');
    expect(sequenceText(drawPrompt('b', 'es'))).toBe('¡Vamos a dibujar la be minúscula!');
    expect(sequenceText(nameLine('w', 'en'))).toBe('W!');
  });
});

describe('allVoiceLines', () => {
  const lines = allVoiceLines();

  it('covers every letter, both cases, Ñ and numbers in both languages', () => {
    const ids = new Set(lines.map((l) => l.id.replace(/-[a-z0-9]{7}$/, '')));
    for (const id of ['en/intro-ua', 'en/intro-la', 'en/intro-uny', 'es/intro-uny', 'es/intro-n10', 'en/find-lz', 'es/draw-n3', 'en/sound-ny', 'es/name-ny', 'en/says-a', 'es/says-h', 'en/word-a', 'en/p', 'es/p']) {
      expect(ids.has(id), id).toBe(true);
    }
    expect(ids.has('es/sound-h')).toBe(false);
  });

  it('changes the id when the words change', () => {
    expect(voiceOf(introSequence('A', 'en')[0])?.id).not.toBe(voiceOf(introSequence('a', 'en')[0])?.id);
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
