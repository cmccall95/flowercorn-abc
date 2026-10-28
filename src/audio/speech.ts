import type { Lang } from '../content/sets';
import { reportHealth, useAudioHealth } from './health';

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

/** How long the device voice gets to start talking before we treat it as stuck. */
const START_TIMEOUT_MS = 2500;

/**
 * Say one line. Resolves when finished (or right away if speech isn't available). Chrome's speech can silently
 * get stuck, especially with Google's online voices, so: if a line errors or doesn't start, it's retried once
 * with a voice that lives on the device, and the result is reported to the Sound check.
 */
export function speakLine(text: string, lang: Lang): Promise<void> {
  if (!supported() || !text.trim()) return Promise.resolve();
  const chosen = pickVoice(lang, lang === 'es' ? settings.voiceEs : settings.voiceEn);
  return attempt(text, lang, chosen).then((ok) => {
    if (ok || !chosen || chosen.localService) return;
    const local = voicesFor(lang).find((v) => v.localService);
    if (local) return attempt(text, lang, local).then(() => undefined);
  });
}

function attempt(text: string, lang: Lang, voice: SpeechSynthesisVoice | null): Promise<boolean> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? (lang === 'es' ? 'es-MX' : 'en-US');
    if (voice) u.voice = voice;
    u.rate = settings.rate;
    u.pitch = settings.pitch;
    let started = false;
    const finish = (ok: boolean, error = '') => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
      if (ok) reportHealth({ deviceVoice: 'ok', deviceError: '' });
      else if (error !== 'interrupted' && error !== 'canceled') reportHealth({ deviceVoice: 'failed', deviceError: error || 'did not start' });
      resolve(ok);
    };
    // Stuck engine: nothing started in time.
    const startTimer = setTimeout(() => {
      if (started) return;
      speechSynthesis.cancel();
      finish(false);
    }, START_TIMEOUT_MS);
    // Some browsers never fire onend; this keeps sequences moving.
    const endTimer = setTimeout(() => finish(true), START_TIMEOUT_MS + 1500 + text.length * 120);
    u.onstart = () => { started = true; };
    u.onend = () => finish(true);
    u.onerror = (e) => finish(false, e.error);
    // Chrome can be left paused after a cancel; resuming is harmless otherwise.
    speechSynthesis.resume();
    speechSynthesis.speak(u);
  });
}

/** Cut off whatever is playing and say this instead. */
export function speak(text: string, lang: Lang): Promise<void> {
  cancelSpeech();
  return speakLine(text, lang);
}

/** iPad and iPhone only allow speech after a tap; saying a silent word inside the first tap unlocks it. */
export function unlockSpeech() {
  if (!supported() || !/iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))) return;
  const u = new SpeechSynthesisUtterance('hi');
  u.volume = 0;
  speechSynthesis.speak(u);
}

/** Whether lines with the child's name can use the device voice (many Samsung phones have no voices at all). */
export const deviceVoiceUsable = (lang: Lang) => voicesFor(lang).length > 0 && useAudioHealth.getState().deviceVoice !== 'failed';
