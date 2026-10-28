import { describe, expect, it } from 'vitest';
import { spanishPhonemes } from './spanish';

describe('spanishPhonemes', () => {
  it.each([
    ['conejo', 'konˈexo'],
    ['ce', 'sˈe'],
    ['zeta', 'sˈeta'],
    ['hache', 'ˈatʃe'],
    ['mariposa', 'maɾipˈosa'],
    ['perro', 'pˈero'],
    ['queso', 'kˈeso'],
    ['jirafa', 'xiɾˈafa'],
    ['ñandú', 'ɲandˈu'],
    ['ballena', 'baʝˈena'],
    ['ratón', 'ratˈon'],
    ['helado', 'elˈaðo'],
    ['guitarra', 'ɡitˈara'],
    ['tortuga', 'toɾtˈuɣa'],
    ['estrella', 'estɾˈeʝa'],
    ['nube', 'nˈuβe'],
    ['iguana', 'iɣwˈana'],
    ['dinosaurio', 'dinosˈawɾjo'],
    ['eñe', 'ˈeɲe'],
    ['equis', 'ˈekis'],
    ['uve', 'ˈuβe'],
    ['cu', 'kˈu'],
    ['ye', 'ʝˈe'],
  ])('%s → %s', (word, ps) => {
    expect(spanishPhonemes(word)).toBe(ps);
  });

  it('keeps punctuation and leaves short words unstressed', () => {
    expect(spanishPhonemes('¡Ce de Conejo!')).toBe('¡sˈe de konˈexo!');
    expect(spanishPhonemes('¡Muy bien, Sofía!')).toBe('¡mwˈi bjˈen, sofˈia!');
  });
});
