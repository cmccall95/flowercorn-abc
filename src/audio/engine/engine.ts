import { get, set } from 'idb-keyval';
import { create } from 'zustand';
import type { Lang } from '../../content/sets';
import { playSamples } from '../player';
import type { EnginePart } from './pieces';
import type { FromWorker, ToWorker } from './tts.worker';

/** Bump when the voice, speed or phoneme rules change, so saved audio is made again. */
const ENGINE_VERSION = 1;
const SPEED: Record<Lang, number> = { en: 0.85, es: 0.85 };

type Status = 'off' | 'loading' | 'ready' | 'failed';

interface EngineState {
  status: Status;
  /** 0–1 while downloading. */
  progress: number;
  error: string;
}

/** The in-app voice (Kokoro, running on this device). */
export const useEngine = create<EngineState>()(() => ({ status: 'off', progress: 0, error: '' }));

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, { resolve: (r: { samples: Float32Array; rate: number } | null) => void }>();

interface Job { parts: EnginePart[]; lang: Lang; urgent: boolean; resolve: (r: { samples: Float32Array; rate: number } | null) => void }
const queue: Job[] = [];
let busy = false;

/** Start (or resume) the in-app voice. Downloads the model the first time; after that it loads from this device. */
export function startEngine() {
  if (worker) return;
  useEngine.setState({ status: 'loading', progress: 0, error: '' });
  worker = new Worker(new URL('./tts.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<FromWorker>) => {
    const m = e.data;
    if (m.type === 'progress') useEngine.setState({ progress: m.total ? m.loaded / m.total : 0 });
    else if (m.type === 'ready') { useEngine.setState({ status: 'ready', progress: 1 }); pump(); }
    else if (m.type === 'failed') { useEngine.setState({ status: 'failed', error: m.message }); worker?.terminate(); worker = null; }
    else if (m.type === 'audio' || m.type === 'error') {
      waiting.get(m.id)?.resolve(m.type === 'audio' ? { samples: m.samples, rate: m.rate } : null);
      waiting.delete(m.id);
    }
  };
  worker.onerror = (e) => { useEngine.setState({ status: 'failed', error: e.message || 'could not start' }); worker = null; };
  post({ type: 'load' });
}

const post = (m: ToWorker) => worker?.postMessage(m);

const cacheKey = (parts: EnginePart[], lang: Lang) => `tts:${ENGINE_VERSION}:${lang}:${SPEED[lang]}:${JSON.stringify(parts)}`;

async function pump() {
  if (busy || useEngine.getState().status !== 'ready') return;
  const job = queue.shift();
  if (!job) return;
  busy = true;
  const id = nextId++;
  const result = await new Promise<{ samples: Float32Array; rate: number } | null>((resolve) => {
    waiting.set(id, { resolve });
    post({ type: 'synth', id, parts: job.parts, lang: job.lang, speed: SPEED[job.lang] });
  });
  if (result) void set(cacheKey(job.parts, job.lang), { rate: result.rate, data: result.samples.buffer }).catch(() => {});
  job.resolve(result);
  busy = false;
  void pump();
}

/** Audio for a line: saved on this device if it was made before, otherwise made now (urgent lines go first). */
export async function engineAudio(parts: EnginePart[], lang: Lang, urgent = true): Promise<{ samples: Float32Array; rate: number } | null> {
  try {
    const saved = (await get(cacheKey(parts, lang))) as { rate: number; data: ArrayBuffer } | undefined;
    if (saved) return { samples: new Float32Array(saved.data), rate: saved.rate };
  } catch { /* storage unavailable */ }
  if (useEngine.getState().status !== 'ready') return null;
  return new Promise((resolve) => {
    const job = { parts, lang, urgent, resolve };
    if (urgent) queue.unshift(job); else queue.push(job);
    void pump();
  });
}

/** Say a line with the in-app voice. Resolves false if the voice isn't available. */
export async function playEngine(parts: EnginePart[], lang: Lang): Promise<boolean> {
  const audio = await engineAudio(parts, lang, true);
  return audio ? playSamples(audio.samples, audio.rate) : false;
}

/** 16-bit WAV of a line, base64, for the automated voice check (e2e/engine-check.mjs). */
export async function wavBase64(parts: EnginePart[], lang: Lang): Promise<string | null> {
  const a = await engineAudio(parts, lang, true);
  if (!a) return null;
  const n = a.samples.length;
  const v = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, a.rate, true); v.setUint32(28, a.rate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  a.samples.forEach((x, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 0x7fff, true));
  let bin = '';
  const bytes = new Uint8Array(v.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Get lines ready in the background so they play instantly later. */
export function prepare(lines: { parts: EnginePart[]; lang: Lang }[]) {
  if (useEngine.getState().status !== 'ready') return;
  for (const l of lines) void engineAudio(l.parts, l.lang, false);
}

/** Drop background preparation (e.g. when leaving a game). */
export function cancelPreparing() {
  for (let i = queue.length - 1; i >= 0; i--) if (!queue[i].urgent) { queue[i].resolve(null); queue.splice(i, 1); }
}

export const engineReady = () => useEngine.getState().status === 'ready';
