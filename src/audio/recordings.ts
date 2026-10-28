import { del, get, keys, set } from 'idb-keyval';

// Grown-up recordings of phonics sounds live in IndexedDB: localStorage is too small for audio.
const cache = new Map<string, Blob | null>();
let known: Set<string> | null = null;

export async function loadRecordingKeys(): Promise<Set<string>> {
  try {
    known = new Set((await keys()).map(String).filter((k) => k.startsWith('phonic:')));
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
  (known ??= new Set()).add(key);
}

export async function deleteRecording(key: string) {
  await del(key);
  cache.delete(key);
  known?.delete(key);
}

let current: HTMLAudioElement | null = null;

export function stopClip() {
  current?.pause();
  current = null;
}

/** Play a recorded clip; resolves when it ends. */
export async function playClip(key: string): Promise<boolean> {
  const blob = await getRecording(key);
  if (!blob) return false;
  stopClip();
  const url = URL.createObjectURL(blob);
  const el = new Audio(url);
  current = el;
  await new Promise<void>((resolve) => {
    const done = () => { URL.revokeObjectURL(url); resolve(); };
    el.onended = el.onerror = done;
    el.play().catch(done);
  });
  return true;
}
