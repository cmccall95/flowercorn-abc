import { playBuffer } from './player';

// Bundled Kokoro clips (scripts/voices): public/voice/index.json lists every clip that exists.
let index: Record<string, string> = {};
const base = () => `${import.meta.env.BASE_URL}voice/`;

export async function loadVoiceIndex() {
  try {
    const res = await fetch(`${base()}index.json`);
    if (res.ok) index = await res.json();
  } catch {
    index = {};
  }
}

export const hasVoice = (id: string) => id in index;

export const playVoice = (id: string) =>
  hasVoice(id) ? playBuffer(`voice:${id}`, () => fetch(`${base()}${id}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null))) : Promise.resolve(false);
