import type { Lang, Synthesize } from './app.js';

export interface ElevenLabsConfig {
  apiKey: string;
  voices: Record<Lang, string>;
  model: string;
  /** Optional voice settings, e.g. {"stability":0.5,"similarity_boost":0.75,"style":0.3,"speed":0.9}. */
  settings?: Record<string, number | boolean>;
}

// Models that accept a language hint (the others work it out from the text).
const TAKES_LANGUAGE = /^eleven_(flash|turbo)_v2_5|^eleven_v3/;

/** ElevenLabs text-to-speech. The API key stays on the server; callers only send words and a language. */
export function elevenLabs(cfg: ElevenLabsConfig): Synthesize {
  return async (text, lang) => {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(cfg.voices[lang])}?output_format=mp3_44100_64`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': cfg.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: cfg.model,
        ...(TAKES_LANGUAGE.test(cfg.model) ? { language_code: lang } : {}),
        ...(cfg.settings ? { voice_settings: cfg.settings } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return Buffer.from(await res.arrayBuffer());
  };
}
