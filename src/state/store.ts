import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActivityId, Lang } from '../content/sets';
import type { Level } from '../game/engine';

export interface Profile {
  id: string;
  name: string;
  /** Phonetic spelling for the voice, e.g. "Lilly" or "Sofía". Falls back to the name. */
  sayAs: string;
  avatar: string;
}

export type LangMode = Lang | 'both';
export type InputMode = 'auto' | 'keyboard' | 'bubbles';
export type Palette = 'lavender' | 'blossom' | 'sherbet';

export interface Settings {
  lang: LangMode;
  input: InputMode;
  /** 'auto' moves her up a level each time she finishes a set. */
  levelMode: 'auto' | Level;
  voiceEn: string;
  voiceEs: string;
  rate: number;
  pitch: number;
  sfxVolume: number;
  reduceMotion: boolean;
  breakMinutes: 0 | 15 | 30;
  palette: Palette;
}

export interface Progress {
  level: Level;
  /** Position in the current round. */
  step: number;
  /** Sets finished, which earns gold stickers. */
  finished: number;
}

export type ProgressKey = `${ActivityId}:${Lang}`;

interface AppState {
  profiles: Profile[];
  activeId: string | null;
  progress: Record<string, Partial<Record<ProgressKey, Progress>>>;
  stickers: Record<string, string[]>;
  /** Right answers since her last sticker. */
  sinceSticker: Record<string, number>;
  /** Total right answers, for the stars counter. */
  stars: Record<string, number>;
  settings: Settings;

  addProfile: (p: Omit<Profile, 'id'>) => string;
  updateProfile: (id: string, p: Partial<Profile>) => void;
  removeProfile: (id: string) => void;
  selectProfile: (id: string | null) => void;
  setProgress: (key: ProgressKey, p: Progress) => void;
  /** Count a right answer; returns true when it's time for a sticker. */
  addStar: (every: number) => boolean;
  addSticker: (id: string) => void;
  resetStickers: (profileId: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'en', input: 'auto', levelMode: 'auto', voiceEn: '', voiceEs: '', rate: 0.9, pitch: 1.25,
  sfxVolume: 0.8, reduceMotion: false, breakMinutes: 15, palette: 'lavender',
};

export const DEFAULT_PROGRESS: Progress = { level: 1, step: 0, finished: 0 };

const newId = () => Math.random().toString(36).slice(2, 10);

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeId: null,
      progress: {},
      stickers: {},
      sinceSticker: {},
      stars: {},
      settings: DEFAULT_SETTINGS,

      addProfile: (p) => {
        const id = newId();
        set((s) => ({ profiles: [...s.profiles, { ...p, id }] }));
        return id;
      },
      updateProfile: (id, p) => set((s) => ({ profiles: s.profiles.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      removeProfile: (id) =>
        set((s) => ({ profiles: s.profiles.filter((x) => x.id !== id), activeId: s.activeId === id ? null : s.activeId })),
      selectProfile: (id) => set({ activeId: id }),
      setProgress: (key, p) =>
        set((s) => {
          const id = s.activeId;
          if (!id) return s;
          return { progress: { ...s.progress, [id]: { ...s.progress[id], [key]: p } } };
        }),
      addStar: (every) => {
        const id = get().activeId;
        if (!id) return false;
        const since = (get().sinceSticker[id] ?? 0) + 1;
        const due = since >= every;
        set((s) => ({
          stars: { ...s.stars, [id]: (s.stars[id] ?? 0) + 1 },
          sinceSticker: { ...s.sinceSticker, [id]: due ? 0 : since },
        }));
        return due;
      },
      addSticker: (sticker) =>
        set((s) => {
          const id = s.activeId;
          if (!id) return s;
          const owned = s.stickers[id] ?? [];
          return { stickers: { ...s.stickers, [id]: owned.includes(sticker) ? owned : [...owned, sticker] } };
        }),
      resetStickers: (profileId) =>
        set((s) => ({ stickers: { ...s.stickers, [profileId]: [] }, sinceSticker: { ...s.sinceSticker, [profileId]: 0 } })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'flowercorn-app',
      version: 1,
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
    },
  ),
);

export const useActiveProfile = () => useApp((s) => s.profiles.find((p) => p.id === s.activeId) ?? null);
export const spokenNameOf = (p: Profile | null) => (p ? p.sayAs.trim() || p.name : '');
