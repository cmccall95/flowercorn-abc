import { del, get, keys, set } from 'idb-keyval';
import { forget, playBuffer } from './player';

// Grown-up recordings of phonics sounds live in IndexedDB: localStorage is too small for audio.
const cache = new Map<string, Blob | null>();
let known: Set<string> | null = null;

export async function loadRecordingKeys(): Promise<Set<string>> {
  try {
    known = new Set((await keys()).map(String).filter((k) => k.startsWith('phonic:') || k.startsWith('name:')));
  } catch {
    known = new Set();
  }
  return known;
}

export const hasRecording = (key: string) => known?.has(key) ?? false;

export async function getRecording(key: string): Promise<Blob | null> {
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const blob = ((await get(key)) as Blob | undefined) ?? null;
    cache.set(key, blob);
    return blob;
  } catch {
    return null;
  }
}

export async function saveRecording(key: string, blob: Blob) {
  await set(key, blob);
  cache.set(key, blob);
  forget(`rec:${key}`);
  (known ??= new Set()).add(key);
}

export async function deleteRecording(key: string) {
  await del(key);
  cache.delete(key);
  forget(`rec:${key}`);
  known?.delete(key);
}

/** Play a recorded clip; resolves true when it ends, false if there's no recording. */
export async function playClip(key: string): Promise<boolean> {
  if (!hasRecording(key)) return false;
  return playBuffer(`rec:${key}`, async () => (await getRecording(key))?.arrayBuffer() ?? null);
}
