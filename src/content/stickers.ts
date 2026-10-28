export interface Sticker {
  id: string;
  emoji: string;
  en: string;
  es: string;
  gold?: boolean;
}

const s = (emoji: string, en: string, es: string): Sticker => ({ id: en.replace(/\s+/g, '-'), emoji, en, es });

/** Four themed pages of 12. Gold stickers are earned by finishing a whole set and aren't in the random pool. */
export const STICKER_PAGES: { en: string; es: string; stickers: Sticker[] }[] = [
  {
    en: 'Flowers', es: 'Flores',
    stickers: [
      s('🌸', 'cherry blossom', 'flor de cerezo'), s('🌷', 'tulip', 'tulipán'), s('🌻', 'sunflower', 'girasol'),
      s('🌼', 'daisy', 'margarita'), s('🌺', 'hibiscus', 'hibisco'), s('🌹', 'rose', 'rosa'),
      s('💐', 'bouquet', 'ramo de flores'), s('🪷', 'lotus', 'flor de loto'), s('🍄', 'mushroom', 'hongo'),
      s('🍓', 'strawberry', 'fresa'), s('🐝', 'bee', 'abeja'), s('🐞', 'ladybug', 'catarina'),
    ],
  },
  {
    en: 'Unicorns & Rainbows', es: 'Unicornios y arcoíris',
    stickers: [
      s('🦄', 'unicorn', 'unicornio'), s('🌈', 'rainbow', 'arcoíris'), s('⭐', 'star', 'estrella'),
      s('🌙', 'moon', 'luna'), s('💖', 'sparkly heart', 'corazón brillante'), s('👑', 'crown', 'corona'),
      s('🎀', 'bow', 'moño'), s('🧁', 'cupcake', 'pastelito'), s('🍭', 'lollipop', 'paleta'),
      s('🦋', 'butterfly', 'mariposa'), s('🫧', 'bubbles', 'burbujas'), s('☁️', 'cloud', 'nube'),
    ],
  },
  {
    en: 'Dinos', es: 'Dinosaurios',
    stickers: [
      s('🦕', 'long-neck dino', 'dino cuello largo'), s('🦖', 'T-rex', 'T-rex'), s('🥚', 'dino egg', 'huevo de dino'),
      s('🐊', 'crocodile', 'cocodrilo'), s('🐉', 'dragon', 'dragón'), s('🦎', 'lizard', 'lagartija'),
      s('🐢', 'turtle', 'tortuga'), s('🌋', 'volcano', 'volcán'), s('🌴', 'palm tree', 'palmera'),
      s('🪨', 'rock', 'piedra'), s('🦴', 'bone', 'hueso'), s('🌿', 'leaf', 'hoja'),
    ],
  },
  {
    en: 'Animal Friends', es: 'Amigos animales',
    stickers: [
      s('🐰', 'bunny', 'conejito'), s('🐱', 'kitty', 'gatito'), s('🐶', 'puppy', 'perrito'),
      s('🐥', 'chick', 'pollito'), s('🦒', 'giraffe', 'jirafa'), s('🐼', 'panda', 'panda'),
      s('🦊', 'fox', 'zorro'), s('🐨', 'koala', 'koala'), s('🐷', 'piggy', 'cerdito'),
      s('🐬', 'dolphin', 'delfín'), s('🦉', 'owl', 'búho'), s('🐠', 'fish', 'pececito'),
    ],
  },
];

export const STICKERS: Sticker[] = STICKER_PAGES.flatMap((p) => p.stickers);

export const GOLD_STICKERS: Sticker[] = [
  { id: 'gold-upper', emoji: '🏆', en: 'gold trophy', es: 'trofeo de oro', gold: true },
  { id: 'gold-lower', emoji: '🥇', en: 'gold medal', es: 'medalla de oro', gold: true },
  { id: 'gold-numbers', emoji: '🌟', en: 'glowing star', es: 'estrella brillante', gold: true },
];

export const stickerById = (id: string) => [...STICKERS, ...GOLD_STICKERS].find((x) => x.id === id);

/** Pick a sticker she doesn't have yet; once the book is full, any sticker. */
export function pickSticker(owned: string[], rand = Math.random): Sticker {
  const pool = STICKERS.filter((x) => !owned.includes(x.id));
  const from = pool.length ? pool : STICKERS;
  return from[Math.floor(rand() * from.length)];
}

export const STICKER_EVERY = 5;
