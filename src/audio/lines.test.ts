import { describe, expect, it } from 'vitest';
import { allVoiceLines, drawPrompt, findPrompt, introSequence, nameLine, sequenceText, soundSequence } from './lines';

describe('introSequence', () => {
  it('is one smooth sentence: name, then picture word', () => {
    const seq = introSequence('C', 'en');
    expect(seq).toHaveLength(1);
    expect(sequenceText(seq)).toBe('C! C is for Cat.');
  });

  it('uses Spanish letter names and words', () => {
    expect(sequenceText(introSequence('C', 'es'))).toBe('¡Ce! Ce de Conejo.');
    expect(sequenceText(introSequence('Ñ', 'es'))).toBe('¡Eñe! Eñe de Ñandú.');
    expect(sequenceText(introSequence('H', 'es'))).toBe('¡Hache! Hache de Helado.');
  });

  it('marks lowercase letters', () => {
    expect(sequenceText(introSequence('b', 'en'))).toBe('Little B! B is for Butterfly.');
    expect(sequenceText(introSequence('b', 'es'))).toBe('¡Be minúscula! Be de Ballena.');
  });

  it('gives the bundled voice exact phonemes for English letter names', () => {
    expect(introSequence('A', 'en')[0].voice).toMatchObject({ lang: 'en', text: '[A](/ˈA/)! [A](/ˈA/) is for Apple.' });
    expect(introSequence('A', 'en')[0].voice?.id).toMatch(/^en\/intro-ua-[a-z0-9]{7}$/);
    expect(introSequence('a', 'en')[0].voice?.text).toBe('Little [A](/ˈA/)! [A](/ˈA/) is for Apple.');
    expect(introSequence('C', 'es')[0].voice?.text).toBe('¡Ce! Ce de Conejo.');
  });

  it('counts up for numbers', () => {
    expect(sequenceText(introSequence('3', 'en'))).toBe("Three! Let's count: one, two, three. Three!");
    expect(sequenceText(introSequence('3', 'es'))).toBe('¡Tres! Vamos a contar: uno, dos, tres. ¡Tres!');
    expect(sequenceText(introSequence('0', 'es'))).toContain('Cero');
  });
});

describe('soundSequence (the Letter sound button)', () => {
  it('leads in, then plays the sound twice', () => {
    const seq = soundSequence('C', 'en');
    expect(seq.map((s) => s.kind)).toEqual(['say', 'clip', 'clip']);
    expect(sequenceText(seq)).toBe('C says kuh kuh');
    expect(seq[1].voice).toMatchObject({ lang: 'en', phonemes: 'kə' });
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
    expect(findPrompt('D', 'en')[0].voice?.text).toBe('Find [D](/dˈi/)!');
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
    for (const id of ['en/intro-ua', 'en/intro-la', 'en/intro-uny', 'es/intro-uny', 'es/intro-n10', 'en/find-lz', 'es/draw-n3', 'en/sound-ny', 'es/name-ny', 'en/says-a', 'es/says-h']) {
      expect(ids.has(id), id).toBe(true);
    }
    expect(ids.has('es/sound-h')).toBe(false);
  });

  it('changes the id when the words change', () => {
    expect(introSequence('A', 'en')[0].voice?.id).not.toBe(introSequence('a', 'en')[0].voice?.id);
    expect(soundSequence('C', 'en')[1].voice?.id).toBe(soundSequence('c', 'en')[1].voice?.id);
  });

  it('uses file-safe ids that never depend on letter case', () => {
    for (const l of lines) expect(l.id).toMatch(/^(en|es)\/[a-z0-9-]+$/);
  });

  it('has text or phonemes for every line', () => {
    for (const l of lines) expect(!!(l.text || l.phonemes), l.id).toBe(true);
  });
});
