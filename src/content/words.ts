import type { Lang } from './sets';

/** Picture word for each letter: [word, emoji]. Theme-first: flowers, unicorns, dinos, animals. */
export const WORDS: Record<Lang, Record<string, [string, string]>> = {
  en: {
    A: ['Apple', '🍎'], B: ['Butterfly', '🦋'], C: ['Cat', '🐱'], D: ['Dinosaur', '🦕'], E: ['Elephant', '🐘'],
    F: ['Flower', '🌸'], G: ['Giraffe', '🦒'], H: ['Heart', '💖'], I: ['Ice cream', '🍦'], J: ['Juice', '🧃'],
    K: ['Kitten', '🐈'], L: ['Ladybug', '🐞'], M: ['Moon', '🌙'], N: ['Nest', '🪹'], O: ['Owl', '🦉'],
    P: ['Puppy', '🐶'], Q: ['Queen', '👸'], R: ['Rainbow', '🌈'], S: ['Star', '⭐'], T: ['Tulip', '🌷'],
    U: ['Unicorn', '🦄'], V: ['Violin', '🎻'], W: ['Whale', '🐳'], X: ['Xylophone', '🎶'], Y: ['Yo-yo', '🪀'],
    Z: ['Zebra', '🦓'], Ñ: ['Ñandú', '🐦'],
  },
  es: {
    A: ['Abeja', '🐝'], B: ['Ballena', '🐳'], C: ['Conejo', '🐰'], D: ['Dinosaurio', '🦕'], E: ['Estrella', '⭐'],
    F: ['Flor', '🌸'], G: ['Gato', '🐱'], H: ['Helado', '🍦'], I: ['Iguana', '🦎'], J: ['Jirafa', '🦒'],
    K: ['Koala', '🐨'], L: ['León', '🦁'], M: ['Mariposa', '🦋'], N: ['Nube', '☁️'], Ñ: ['Ñandú', '🐦'],
    O: ['Oso', '🐻'], P: ['Perro', '🐶'], Q: ['Queso', '🧀'], R: ['Ratón', '🐭'], S: ['Sol', '☀️'],
    T: ['Tortuga', '🐢'], U: ['Unicornio', '🦄'], V: ['Vaca', '🐮'], W: ['Wafle', '🧇'], X: ['Xilófono', '🎶'],
    Y: ['Yoyo', '🪀'], Z: ['Zorro', '🦊'],
  },
};

/** Things to count for each number, so "3" shows three of something. */
export const COUNT_THINGS = ['🌸', '🦄', '🦋', '🐥', '🌷', '🐞', '⭐', '🦕', '🍓', '💖', '🐢'];

export const wordFor = (item: string, lang: Lang) => WORDS[lang][item.toUpperCase()];
