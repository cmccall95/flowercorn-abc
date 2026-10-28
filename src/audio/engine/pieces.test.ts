import { describe, expect, it } from 'vitest';
import { letterPart, marker, parsePieces, resolvePieces } from './pieces';

describe('engine pieces', () => {
  it('finds letters inside a line', () => {
    expect(parsePieces(`${marker('a', true)}. ${marker('a', false)} is for Apple.`)).toEqual([
      { item: 'a', long: true }, '. ', { item: 'a', long: false }, ' is for Apple.',
    ]);
  });

  it('says English letters with exact phonemes and Spanish letters by name', () => {
    expect(letterPart('A', 'en')).toEqual({ ps: 'ˈeɪ' });
    expect(letterPart('c', 'es')).toEqual({ text: 'ce' });
  });

  it("uses a grown-up's fix when there is one", () => {
    expect(letterPart('C', 'en', { en: { C: 'see' } })).toEqual({ text: 'see' });
  });

  it('adds little / minúscula only where the line says the full name', () => {
    const pieces = parsePieces(`${marker('b', true)}. ${marker('b', false)} is for Butterfly.`);
    expect(resolvePieces(pieces, 'en')).toEqual([{ text: 'little ' }, { ps: 'bˈiː' }, { text: '. ' }, { ps: 'bˈiː' }, { text: ' is for Butterfly.' }]);
    expect(resolvePieces(parsePieces(marker('b', true)), 'es')).toEqual([{ text: 'be' }, { text: ' minúscula' }]);
  });

  it('says numbers as words', () => {
    expect(resolvePieces(parsePieces(`${marker('3', true)}!`), 'es')).toEqual([{ text: 'tres' }, { text: '!' }]);
  });
});
