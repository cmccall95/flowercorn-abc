/// <reference lib="webworker" />
// Runs the Kokoro voice off the main thread. The model downloads once (~90 MB) and is then kept by the browser.
import type { Lang } from '../../content/sets';
import type { EnginePart } from './pieces';
import { partsToPhonemes } from './phonemize';

export type ToWorker =
  | { type: 'load' }
  | { type: 'synth'; id: number; parts: EnginePart[]; lang: Lang; speed: number };

export type FromWorker =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready' }
  | { type: 'failed'; message: string }
  | { type: 'audio'; id: number; samples: Float32Array; rate: number; phonemes: string }
  | { type: 'error'; id: number; message: string };

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE: Record<Lang, string> = { en: 'af_heart', es: 'ef_dora' };

type Tts = Awaited<ReturnType<typeof import('kokoro-js').KokoroTTS.from_pretrained>>;
let tts: Promise<Tts> | null = null;
const post = (m: FromWorker, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

function load(): Promise<Tts> {
  tts ??= (async () => {
    const { KokoroTTS } = await import('kokoro-js');
    const files = new Map<string, { loaded: number; total: number }>();
    return KokoroTTS.from_pretrained(MODEL, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (p.status !== 'progress' || !p.file) return;
        files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
        let loaded = 0, total = 0;
        for (const f of files.values()) { loaded += f.loaded; total += f.total; }
        post({ type: 'progress', loaded, total });
      },
    });
  })();
  return tts;
}

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  if (m.type === 'load') {
    try { await load(); post({ type: 'ready' }); }
    catch (err) { tts = null; post({ type: 'failed', message: String(err) }); }
    return;
  }
  try {
    const voice = await load();
    const phonemes = await partsToPhonemes(m.parts, m.lang);
    const { input_ids } = voice.tokenizer(phonemes, { truncation: true });
    const out = await voice.generate_from_ids(input_ids, { voice: VOICE[m.lang] as 'af_heart', speed: m.speed });
    const samples = new Float32Array(out.audio);
    post({ type: 'audio', id: m.id, samples, rate: out.sampling_rate, phonemes }, [samples.buffer]);
  } catch (err) {
    post({ type: 'error', id: m.id, message: String(err) });
  }
};
