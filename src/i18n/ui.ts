import type { Lang } from '../content/sets';
import { useApp } from '../state/store';

const en = {
  appName: 'FlowerCorn Land',
  whoIsPlaying: "Who's playing?",
  newPlayer: 'New player',
  hi: 'Hi, {n}!',
  pickGame: 'Pick a game!',
  find: 'Find',
  trace: 'Trace',
  stickerBook: 'Sticker book',
  press: 'Press',
  tapIt: 'Tap it!',
  findIt: 'Find {x}!',
  tapPresent: 'Tap the present!',
  gotSticker: 'You got a sticker!',
  gotStickerSay: '{n}, you got a {s} sticker!',
  keepPlaying: 'Keep playing',
  seeBook: 'See my book',
  bookTitle: "{n}'s Sticker Book",
  page: 'Page {a} of {b}',
  letsDraw: "Let's draw {x}!",
  allDone: 'You finished them all!',
  setDoneSay: 'Wow, {n}! You finished them all! Here is a golden prize!',
  levelUp: 'Level {l}!',
  breakTime: 'Time for a little break!',
  breakSay: 'Great playing, {n}! Time for a little break.',
  holdForGrownups: 'Grown-ups: hold',
  hearEnglish: 'English',
  hearSpanish: 'Español',
  next: 'Next',
  again: 'Again',
  home: 'Home',
};

type Strings = typeof en;

const es: Strings = {
  appName: 'FlowerCorn Land',
  whoIsPlaying: '¿Quién va a jugar?',
  newPlayer: 'Nuevo jugador',
  hi: '¡Hola, {n}!',
  pickGame: '¡Escoge un juego!',
  find: 'Busca',
  trace: 'Traza',
  stickerBook: 'Estampitas',
  press: 'Presiona',
  tapIt: '¡Tócala!',
  findIt: '¡Busca {x}!',
  tapPresent: '¡Toca el regalo!',
  gotSticker: '¡Ganaste una estampita!',
  gotStickerSay: '¡{n}, ganaste una estampita de {s}!',
  keepPlaying: 'Seguir jugando',
  seeBook: 'Ver mi libro',
  bookTitle: 'Las estampitas de {n}',
  page: 'Página {a} de {b}',
  letsDraw: '¡Vamos a dibujar {x}!',
  allDone: '¡Terminaste todas!',
  setDoneSay: '¡Guau, {n}! ¡Terminaste todas! ¡Aquí tienes un premio dorado!',
  levelUp: '¡Nivel {l}!',
  breakTime: '¡Hora de un descansito!',
  breakSay: '¡Qué bien jugaste, {n}! Es hora de un descansito.',
  holdForGrownups: 'Adultos: mantener',
  hearEnglish: 'English',
  hearSpanish: 'Español',
  next: 'Siguiente',
  again: 'Otra vez',
  home: 'Inicio',
};

export const STRINGS: Record<Lang, Strings> = { en, es };
export type StringKey = keyof Strings;

export function fmt(s: string, vars: Record<string, string | number> = {}) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

/** Screen text follows the language setting; "Both" shows English text with the voice alternating. */
export const uiLang = (mode: Lang | 'both'): Lang => (mode === 'es' ? 'es' : 'en');

export function useT() {
  const lang = uiLang(useApp((s) => s.settings.lang));
  return (key: StringKey, vars?: Record<string, string | number>) => fmt(STRINGS[lang][key], vars);
}

export const tFor = (lang: Lang, key: StringKey, vars?: Record<string, string | number>) => fmt(STRINGS[lang][key], vars);
