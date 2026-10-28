import type { Lang } from '../content/sets';
import type { Segment } from './lines';
import { stopAudio } from './player';
import { hasRecording, playClip } from './recordings';
import { cancelSpeech, currentGeneration, deviceVoiceMaybe, speakLine } from './speech';
import { playVoice } from './voiceClips';
import { engineAudio, engineReady, prepare } from './engine/engine';
import { playSamples } from './player';
import { type EnginePart, resolvePieces } from './engine/pieces';
import { useApp } from '../state/store';

export { drawPrompt, findPrompt, introSequence, nameLine, phrase, sequenceText, soundSequence } from './lines';
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

/**
 * Play segments in order, each with the best voice available: the in-app voice, a bundled clip, or the device's
 * own voice. A newer call (or hush) stops this one between steps.
 */
export async function playSequence(segments: Segment[]): Promise<void> {
  hush();
  const gen = currentGeneration();
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const fixes = () => useApp.getState().settings.letterFixes;
  // The in-app voice first (when it's downloaded), then the bundled clip, then the device's own voice.
  const viaEngine = async (parts: EnginePart[], lang: Lang) => {
    if (!engineReady()) return false;
    const audio = await engineAudio(parts, lang);
    // Made too late (she already moved on): count it as handled so nothing else plays.
    if (currentGeneration() !== gen) return true;
    return !!audio && (await playSamples(audio.samples, audio.rate));
  };
  for (const [i, seg] of segments.entries()) {
    // A short breath between pieces so joined clips don't run together.
    if (i > 0) await wait(seg.pause ?? PAUSE_MS);
    if (currentGeneration() !== gen) return;
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
    } else if (seg.kind === 'say') {
      if (seg.engine && (await viaEngine(resolvePieces(seg.engine, seg.lang, fixes()), seg.lang))) continue;
      if (!(seg.voice && (await playVoice(seg.voice.id)))) await speakLine(seg.text, seg.lang);
    } else if (!(await playClip(seg.key))) {
      if (seg.engine && (await viaEngine(resolvePieces(seg.engine, seg.lang), seg.lang))) continue;
      if (!(seg.voice && (await playVoice(seg.voice.id)))) await speakLine(seg.fallback, seg.lang);
    }
  }
}

/** Make the in-app voice's audio for these lines in the background, so they play instantly when needed. */
export function prepareSequences(sequences: Segment[][]) {
  if (!engineReady()) return;
  const fixes = useApp.getState().settings.letterFixes;
  prepare(sequences.flat().flatMap((seg) =>
    (seg.kind === 'say' || seg.kind === 'clip') && seg.engine ? [{ parts: resolvePieces(seg.engine, seg.lang, fixes), lang: seg.lang }] : []));
}
