import { audio } from './sfx';

// Plays recorded and bundled clips through Web Audio: once the first tap has unlocked the audio context,
// iPad lets every later clip play without needing a tap of its own.
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let current: AudioBufferSourceNode | null = null;

export function stopAudio() {
  try { current?.stop(); } catch { /* already stopped */ }
  current = null;
}

function decode(key: string, load: () => Promise<ArrayBuffer | null>): Promise<AudioBuffer | null> {
  if (!buffers.has(key)) {
    buffers.set(key, (async () => {
      const ctx = audio();
      const data = await load().catch(() => null);
      if (!ctx || !data) return null;
      return ctx.decodeAudioData(data).catch(() => null);
    })());
  }
  return buffers.get(key)!;
}

export const forget = (key: string) => buffers.delete(key);

/** Play once; resolves true when it finishes, false if it couldn't play. */
export async function playBuffer(key: string, load: () => Promise<ArrayBuffer | null>): Promise<boolean> {
  const buf = await decode(key, load);
  const ctx = audio();
  if (!buf || !ctx) return false;
  stopAudio();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  current = src;
  await new Promise<void>((resolve) => {
    src.onended = () => resolve();
    src.start();
  });
  if (current === src) current = null;
  return true;
}
