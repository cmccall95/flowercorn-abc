import { describe, expect, it } from 'vitest';
import { findPrompt, introSequence, sequenceText } from './sayLetter';

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
    expect(sequenceText(introSequence('A', 'en'))).toMatch(/^Ay! Ay says ah ah Ay is for Apple!/);
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

describe('findPrompt', () => {
  it('asks for the item in each language', () => {
    expect(findPrompt('D', 'en')).toBe('Find D!');
    expect(findPrompt('D', 'es')).toBe('¡Busca la de!');
    expect(findPrompt('7', 'es')).toBe('¡Busca el siete!');
  });
});
