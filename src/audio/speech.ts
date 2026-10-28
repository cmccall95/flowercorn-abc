import type { Lang } from '../content/sets';

export interface VoiceSettings {
  voiceEn: string;
  voiceEs: string;
  rate: number;
  pitch: number;
}

const PREFERRED: Record<Lang, string[]> = {
  en: ['Samantha', 'Google US English', 'Microsoft Ava Online', 'Microsoft Aria Online', 'Microsoft Jenny Online', 'Ava', 'Aria', 'Jenny', 'Karen', 'Microsoft Zira'],
  es: ['Paulina', 'Google español de Estados Unidos', 'Microsoft Dalia Online', 'Microsoft Paloma Online', 'Dalia', 'Sabela', 'Mónica', 'Google español'],
};

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export const voicesFor = (lang: Lang): SpeechSynthesisVoice[] =>
  supported() ? speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang)) : [];

/** The grown-up's chosen voice, else the friendliest known natural voice, else any voice in the language. */
export function pickVoice(lang: Lang, chosen = ''): SpeechSynthesisVoice | null {
  const pool = voicesFor(lang);
  const exact = chosen && pool.find((v) => v.name === chosen);
  if (exact) return exact;
  for (const name of PREFERRED[lang]) {
    const v = pool.find((x) => x.name.includes(name));
    if (v) return v;
  }
  // Prefer a Latin American voice for Spanish.
  if (lang === 'es') return pool.find((v) => /es-(MX|US|419)/i.test(v.lang)) ?? pool[0] ?? null;
  return pool.find((v) => /en-US/i.test(v.lang)) ?? pool[0] ?? null;
}

let settings: VoiceSettings = { voiceEn: '', voiceEs: '', rate: 0.9, pitch: 1.25 };
export const setVoiceSettings = (s: VoiceSettings) => { settings = s; };

let generation = 0;

/** Stop anything being said. Any sequence in progress stops at its next step. */
export function cancelSpeech() {
  generation++;
  if (supported()) speechSynthesis.cancel();
}

export const currentGeneration = () => generation;

/** Say one line. Resolves when finished (or right away if speech isn't available). */
export function speakLine(text: string, lang: Lang): Promise<void> {
  if (!supported() || !text) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-MX' : 'en-US';
    const v = pickVoice(lang, lang === 'es' ? settings.voiceEs : settings.voiceEn);
    if (v) u.voice = v;
    u.rate = settings.rate;
    u.pitch = settings.pitch;
    // Some browsers never fire onend; the timer keeps sequences from stalling.
    const timer = setTimeout(resolve, 1500 + text.length * 120);
    u.onend = u.onerror = () => { clearTimeout(timer); resolve(); };
    speechSynthesis.speak(u);
  });
}

/** Cut off whatever is playing and say this instead. */
export function speak(text: string, lang: Lang): Promise<void> {
  cancelSpeech();
  return speakLine(text, lang);
}

/** iOS only allows speech after a tap; saying an empty utterance inside the first tap unlocks it. */
export function unlockSpeech() {
  if (!supported()) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}
