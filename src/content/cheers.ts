import type { Lang } from './sets';

export const CHEERS: Record<Lang, string[]> = {
  en: ['Great job, {n}!', 'You did it, {n}!', 'Super star, {n}!', "Yay, {n}! That's right!", 'Wow, {n}! Amazing!', 'High five, {n}!'],
  es: ['¡Muy bien, {n}!', '¡Lo lograste, {n}!', '¡Eres una estrella, {n}!', '¡Sí, {n}! ¡Correcto!', '¡Guau, {n}! ¡Increíble!', '¡Choca esos cinco, {n}!'],
};

let last = -1;
/** A cheer with the child's name, never the same one twice in a row. */
export function cheer(name: string, lang: Lang, rand = Math.random): string {
  const list = CHEERS[lang];
  let i = Math.floor(rand() * list.length);
  if (i === last) i = (i + 1) % list.length;
  last = i;
  return list[i].replace('{n}', name);
}

export const firstCheer = (name: string, lang: Lang) => CHEERS[lang][0].replace('{n}', name);
