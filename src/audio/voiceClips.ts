import { reportHealth } from './health';
import { letterSlug } from '../content/names';
import { playBuffer } from './player';

// Bundled Kokoro clips (scripts/voices): public/voice/index.json lists every clip that exists.
let index: Record<string, string> = {};
const base = () => `${import.meta.env.BASE_URL}voice/`;

/**
 * Load the clip list. Always ask the network first, so an offline copy from an older version can't hide new
 * clips; fall back to the offline copy when there's no connection.
 */
export async function loadVoiceIndex() {
  for (const url of [`${base()}index.json?fresh=${Date.now()}`, `${base()}index.json`]) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      index = await res.json();
      reportHealth({ clips: 'ok', clipCount: Object.keys(index).length });
      return;
    } catch {
      // try the next source
    }
  }
  index = {};
  reportHealth({ clips: 'failed', clipCount: 0 });
}

export const hasVoice = (id: string) => id in index;

/** Where a bundled letter recording came from, for the grown-up page and credits (public/voice/letters). */
export interface LetterClipInfo { source: 'commons' | 'kokoro'; license: string; credit?: string; file?: string }
let letters: Record<string, LetterClipInfo> = {};
const letterId = (lang: string, kind: 'name' | 'sound', item: string) => `${lang}/${kind}/${letterSlug(item.toUpperCase())}`;

/** Load the list of bundled letter names and sounds (network first, like the clip list). */
export async function loadLetterIndex() {
  for (const url of [`${base()}letters/index.json?fresh=${Date.now()}`, `${base()}letters/index.json`]) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) { letters = await res.json(); return; }
    } catch {
      // try the next source
    }
  }
}

export const letterClipInfo = (lang: string, kind: 'name' | 'sound', item: string): LetterClipInfo | undefined =>
  letters[letterId(lang, kind, item)];

/** Play a bundled letter recording ("name" or phonics "sound"); false if there isn't one. */
export async function playLetterClip(lang: string, kind: 'name' | 'sound', item: string): Promise<boolean> {
  const id = letterId(lang, kind, item);
  if (!(id in letters)) return false;
  return playBuffer(`letter:${id}`, () => fetch(`${base()}letters/${id}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)));
}

export async function playVoice(id: string): Promise<boolean> {
  if (!hasVoice(id)) return false;
  const ok = await playBuffer(`voice:${id}`, () => fetch(`${base()}${id}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)));
  if (!ok) reportHealth({ clips: 'failed' });
  return ok;
}

/** A sample clip for the Sound check. */
export const sampleVoiceId = () => Object.keys(index).find((k) => k.startsWith('en/intro-ua-')) ?? Object.keys(index)[0];
