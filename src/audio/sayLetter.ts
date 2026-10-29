import type { Lang } from '../content/sets';
import type { Segment } from './lines';
import { playBuffer, playSamples, stopAudio } from './player';
import { cloudAudio, cloudReady, prefetchCloud } from './cloud';
import { hasRecording, playClip } from './recordings';
import { cancelSpeech, currentGeneration, deviceVoiceMaybe, speakLine } from './speech';
import { letterClipInfo, playLetterClip, playVoice } from './voiceClips';
import { normalize, secondCopy } from './carrier';
import { letterNameKey, type SentencePiece, wholeText } from './lines';
import { spokenName } from '../content/names';
import { engineAudio, engineReady, prepare } from './engine/engine';
import { type EnginePart, type LetterFixes, letterPart, resolvePieces } from './engine/pieces';
import { useApp } from '../state/store';

export { drawPrompt, findPrompt, introSequence, letterNameKey, nameLine, phrase, sequenceText, soundSequence } from './lines';
export type { NameRef, Segment } from './lines';

const PAUSE_MS = 350;
/** Gap around the child's recorded name inside a phrase. */
const NAME_GAP_MS = 120;

/** Stop speech and any clip that's playing. */
export function hush() {
  stopAudio();
  cancelSpeech();
}

/** Say one line on the device voice right now, cutting off anything playing. */
export function say(text: string, lang: Lang): Promise<boolean> {
  hush();
  return speakLine(text, lang);
}

/** The in-app voice saying a letter's name twice ("A. A."), so the second, clean copy can be kept. */
export function carrierParts(item: string, lang: Lang, fixes: LetterFixes = {}): EnginePart[] {
  const name = letterPart(item, lang, fixes);
  return 'ps' in name ? [{ ps: `${name.ps}. ${name.ps}.` }] : [{ text: `${name.text}. ${name.text}.` }];
}

/** Which voice a letter's name comes from, in the order they're tried. */
export type LetterSource = 'recording' | 'fix' | 'bundled' | 'engine' | 'device';

export function letterSource(item: string, lang: Lang): LetterSource {
  const up = item.toUpperCase();
  const { letterFixes, letterReviews } = useApp.getState().settings;
  if (hasRecording(letterNameKey(up, lang))) return 'recording';
  if (letterFixes[lang]?.[up]) return 'fix';
  if (letterClipInfo(lang, 'name', up) && letterReviews[lang]?.[up] !== 'bad') return 'bundled';
  return engineReady() ? 'engine' : 'device';
}

/**
 * Play segments in order, each with the best voice available. A newer call (or hush) stops this one between steps.
 *   Signed in:    the cloud voice reads each whole sentence (her name included), unless a grown-up recorded a
 *                 letter or her name in it; then the pieces below are used.
 *   Words:        the in-app voice, its bundled clip, the device voice.
 *   Letter names: a grown-up's recording, a bundled recording (unless a grown-up typed a fix), the in-app voice
 *                 saying it twice and keeping the second copy, the device voice.
 *   Sounds:       a grown-up's recording, a bundled recording, the in-app voice, the bundled clip, the device voice.
 */
export async function playSequence(segments: Segment[]): Promise<void> {
  hush();
  const gen = currentGeneration();
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const fixes = () => useApp.getState().settings.letterFixes;
  const viaEngine = async (parts: EnginePart[], lang: Lang, keepSecond = false) => {
    if (!engineReady()) return false;
    const audio = await engineAudio(parts, lang);
    // Made too late (she already moved on): count it as handled so nothing else plays.
    if (currentGeneration() !== gen) return true;
    if (!audio) return false;
    const clip = (keepSecond && secondCopy(audio.samples, audio.rate)) || audio.samples;
    return playSamples(normalize(clip, audio.rate), audio.rate);
  };
  // The cloud voice (ElevenLabs, when signed in): whole sentences in one natural read.
  const viaCloud = async (text: string, lang: Lang) => {
    if (!cloudReady()) return false;
    const audio = await cloudAudio(text, lang);
    if (currentGeneration() !== gen) return true;
    return !!audio && (await playBuffer(`cloud:${lang}:${text}`, async () => audio));
  };
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    // A short breath between pieces so joined clips don't run together.
    if (i > 0) await wait(seg.pause ?? PAUSE_MS);
    if (currentGeneration() !== gen) return;
    // A grown-up's recording of a letter wins over the cloud voice, so those sentences stay in pieces.
    const recorded = (p: SentencePiece) => typeof p !== 'string' && hasRecording(letterNameKey(p.letter, seg.lang));
    if (seg.whole && !seg.whole.pieces.some(recorded) && (await viaCloud(wholeText(seg.whole.pieces, seg.lang, fixes()), seg.lang))) {
      i += seg.whole.size - 1;
      continue;
    }
    if (seg.kind === 'phrase' && !seg.parts.some((p) => 'nameKey' in p && hasRecording(p.nameKey)) && (await viaCloud(seg.text, seg.lang))) continue;
    if (seg.kind === 'say' && (await viaCloud(seg.text, seg.lang))) continue;
    if (seg.kind === 'phrase') {
      // Bundled clips for the words; her name from a grown-up's recording, the in-app voice, or the device voice.
      for (const [j, part] of seg.parts.entries()) {
        if (j > 0) await wait(NAME_GAP_MS);
        if (currentGeneration() !== gen) return;
        if ('voice' in part) {
          const text = part.voice.text ?? '';
          if (!(await playVoice(part.voice.id)) && !(await viaEngine([{ text }], seg.lang)) && deviceVoiceMaybe()) await speakLine(text, seg.lang);
        } else if (!(hasRecording(part.nameKey) && (await playClip(part.nameKey)))
          && !(await viaEngine([{ text: part.spoken, lang: 'en' }], seg.lang)) && deviceVoiceMaybe()) {
          await speakLine(part.spoken, seg.lang);
        }
      }
    } else if (seg.kind === 'letter') {
      const source = letterSource(seg.item, seg.lang);
      if (source === 'recording' && (await playClip(letterNameKey(seg.item, seg.lang)))) continue;
      if (source === 'bundled' && (await playLetterClip(seg.lang, 'name', seg.item))) continue;
      if (await viaEngine(carrierParts(seg.item, seg.lang, fixes()), seg.lang, true)) continue;
      await speakLine(spokenName(seg.item, seg.lang), seg.lang);
    } else if (seg.kind === 'say') {
      if (seg.engine && (await viaEngine(resolvePieces(seg.engine, seg.lang, fixes()), seg.lang))) continue;
      if (!(seg.voice && (await playVoice(seg.voice.id)))) await speakLine(seg.text, seg.lang);
    } else if (!(await playClip(seg.key)) && !(await playLetterClip(seg.lang, 'sound', seg.item))) {
      if (seg.engine && (await viaEngine(resolvePieces(seg.engine, seg.lang), seg.lang))) continue;
      if (!(seg.voice && (await playVoice(seg.voice.id)))) await speakLine(seg.fallback, seg.lang);
    }
  }
}

/** Make the in-app voice's audio for these lines in the background, so they play instantly when needed. */
export function prepareSequences(sequences: Segment[][]) {
  const fixes0 = useApp.getState().settings.letterFixes;
  if (cloudReady()) {
    // Only the next few lines: each new one costs speech credits, and she may not get that far.
    prefetchCloud(sequences.slice(0, 3).flat().flatMap((seg) =>
      seg.whole ? [{ text: wholeText(seg.whole.pieces, seg.lang, fixes0), lang: seg.lang }]
        : seg.kind === 'say' || seg.kind === 'phrase' ? [{ text: seg.text, lang: seg.lang }] : []));
    return;
  }
  if (!engineReady()) return;
  const fixes = useApp.getState().settings.letterFixes;
  prepare(sequences.flat().flatMap((seg) => {
    if (seg.kind === 'letter') return letterSource(seg.item, seg.lang) === 'engine' || letterSource(seg.item, seg.lang) === 'fix'
      ? [{ parts: carrierParts(seg.item, seg.lang, fixes), lang: seg.lang }] : [];
    return (seg.kind === 'say' || seg.kind === 'clip') && seg.engine ? [{ parts: resolvePieces(seg.engine, seg.lang, fixes), lang: seg.lang }] : [];
  }));
}
