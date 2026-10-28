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
// The voice files are hosted with the app (scripts/voices/fetch_model.py), so phones never contact another site.
const MODELS = new URL(`${import.meta.env.BASE_URL}models/`, self.location.origin).href;

/**
 * kokoro-js looks for each voice's style file in its "kokoro-voices" cache under its Hugging Face address before
 * downloading it; filling that cache from our own copy keeps everything on our site.
 */
async function provideVoice(name: string) {
  const official = `https://huggingface.co/${MODEL}/resolve/main/voices/${name}.bin`;
  const cache = await caches.open('kokoro-voices');
  if (await cache.match(official)) return;
  const res = await fetch(`${MODELS}${MODEL}/voices/${name}.bin`);
  if (!res.ok) throw new Error(`voice file ${name} (${res.status})`);
  await cache.put(official, res);
}
const VOICE: Record<Lang, string> = { en: 'af_heart', es: 'ef_dora' };

type Tts = Awaited<ReturnType<typeof import('kokoro-js').KokoroTTS.from_pretrained>>;
let tts: Promise<Tts> | null = null;
const post = (m: FromWorker, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

function load(): Promise<Tts> {
  tts ??= (async () => {
    const [{ KokoroTTS }, { env }] = await Promise.all([import('kokoro-js'), import('@huggingface/transformers')]);
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = MODELS;
    await Promise.all(Object.values(VOICE).map(provideVoice));
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
