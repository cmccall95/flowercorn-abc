import { describe, expect, it } from 'vitest';
import { allVoiceLines, drawPrompt, findPrompt, introSequence, nameLine, sequenceText } from './lines';

describe('introSequence', () => {
  it('says name, sound twice, then picture word in English', () => {
    const seq = introSequence('C', 'en');
    expect(seq.map((s) => s.kind)).toEqual(['say', 'clip', 'clip', 'say']);
    expect(sequenceText(seq)).toBe('C! C says kuh kuh C is for Cat!');
  });

  it('uses Spanish letter names and words', () => {
    expect(sequenceText(introSequence('C', 'es'))).toBe('¡Ce! La ce suena ca ca ¡Ce de Conejo!');
    expect(sequenceText(introSequence('Ñ', 'es'))).toContain('La eñe suena ña ña');
  });

  it('says the Spanish H is silent instead of a sound', () => {
    const seq = introSequence('H', 'es');
    expect(seq.some((s) => s.kind === 'clip')).toBe(false);
    expect(sequenceText(seq)).toContain('La hache no suena');
  });

  it('marks lowercase letters', () => {
    expect(sequenceText(introSequence('b', 'en'))).toMatch(/^Little B! B says/);
    expect(sequenceText(introSequence('b', 'es'))).toMatch(/^¡Be minúscula! La be suena/);
  });

  it('reads A as the letter name, not the word "a"', () => {
    expect(sequenceText(introSequence('A', 'en'))).toMatch(/^Ey! Ey says ah ah Ey is for Apple!/);
  });

  it('gives the bundled voice exact phonemes for English letter names', () => {
    const [first, sound, , word] = introSequence('A', 'en');
    expect(first.voice).toEqual({ id: 'en/intro-ua', lang: 'en', text: '[A](/ˈA/)! [A](/ˈA/) says' });
    expect(sound.voice).toEqual({ id: 'en/sound-a', lang: 'en', phonemes: 'ˈæ' });
    expect(word.voice?.text).toBe('[A](/ˈA/) is for Apple!');
    expect(introSequence('a', 'en')[0].voice?.text).toBe('Little [A](/ˈA/)! [A](/ˈA/) says');
  });

  it('gives the Spanish voice ordinary words', () => {
    expect(introSequence('C', 'es')[0].voice?.text).toBe('¡Ce! La ce suena');
    expect(introSequence('C', 'es')[1].voice?.phonemes).toBe('ka');
  });

  it('shares one recording per letter for both cases', () => {
    const upper = introSequence('M', 'en').find((s) => s.kind === 'clip');
    const lower = introSequence('m', 'en').find((s) => s.kind === 'clip');
    expect(upper && lower && upper.kind === 'clip' && lower.kind === 'clip' && upper.key === lower.key).toBe(true);
  });

  it('counts up for numbers', () => {
    expect(sequenceText(introSequence('3', 'en'))).toBe("Three! Let's count: one, two, three. Three!");
    expect(sequenceText(introSequence('3', 'es'))).toBe('¡Tres! Vamos a contar: uno, dos, tres. ¡Tres!');
    expect(sequenceText(introSequence('0', 'es'))).toContain('Cero');
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
    const ids = new Set(lines.map((l) => l.id));
    for (const id of ['en/intro-ua', 'en/intro-la', 'en/intro-uny', 'es/intro-uny', 'es/intro-n10', 'en/find-lz', 'es/draw-n3', 'en/sound-ny', 'es/name-ny', 'es/word-a']) {
      expect(ids.has(id), id).toBe(true);
    }
    expect(ids.has('es/sound-h')).toBe(false);
  });

  it('uses file-safe ids that never depend on letter case', () => {
    for (const l of lines) expect(l.id).toMatch(/^(en|es)\/[a-z0-9-]+$/);
  });

  it('has text or phonemes for every line', () => {
    for (const l of lines) expect(!!(l.text || l.phonemes), l.id).toBe(true);
  });
});
