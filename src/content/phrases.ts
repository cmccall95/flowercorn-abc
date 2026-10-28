import type { Lang } from './sets';

/**
 * Everything the game says out loud apart from letters (see audio/lines.ts). Each line has a bundled clip;
 * "{n}" is the child's name (her recorded name, or the device voice), "{s}" a sticker name.
 */
export const SPOKEN = {
  en: {
    greet: 'Hi, {n}! Pick a game!',
    tapPresent: 'Tap the present!',
    gotSticker: '{n}, you got a {s} sticker!',
    setDone: 'Wow, {n}! You finished them all! Here is a golden prize!',
    breakTime: 'Great playing, {n}! Time for a little break.',
    findUpper: 'Find the big letters!',
    findLower: 'Find the little letters!',
    findNumbers: 'Find the numbers!',
    traceUpper: "Let's trace big letters!",
    traceLower: "Let's trace little letters!",
    traceNumbers: "Let's trace numbers!",
    stickerBook: 'Sticker book!',
    language: 'English!',
  },
  es: {
    greet: '¡Hola, {n}! ¡Escoge un juego!',
    tapPresent: '¡Toca el regalo!',
    gotSticker: '¡{n}, ganaste una estampita de {s}!',
    setDone: '¡Guau, {n}! ¡Terminaste todas! ¡Aquí tienes un premio dorado!',
    breakTime: '¡Qué bien jugaste, {n}! Es hora de un descansito.',
    findUpper: '¡Busca las letras grandes!',
    findLower: '¡Busca las letras chiquitas!',
    findNumbers: '¡Busca los números!',
    traceUpper: '¡Vamos a trazar letras grandes!',
    traceLower: '¡Vamos a trazar letras chiquitas!',
    traceNumbers: '¡Vamos a trazar números!',
    stickerBook: '¡Mis estampitas!',
    language: '¡Español!',
  },
} satisfies Record<Lang, Record<string, string>>;

export type SpokenKey = keyof typeof SPOKEN.en;
