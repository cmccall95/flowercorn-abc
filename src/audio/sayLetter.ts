import type { Lang } from '../content/sets';
import type { Segment } from './lines';
import { stopAudio } from './player';
import { hasRecording, playClip } from './recordings';
import { cancelSpeech, currentGeneration, deviceVoiceMaybe, speakLine } from './speech';
import { playVoice } from './voiceClips';

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
 * Play segments in order: bundled clips where they exist, the device voice otherwise.
 * A newer call (or hush) stops this one between steps.
 */
export async function playSequence(segments: Segment[]): Promise<void> {
  hush();
  const gen = currentGeneration();
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (const [i, seg] of segments.entries()) {
    // A short breath between pieces so joined clips don't run together.
    if (i > 0) await wait(seg.pause ?? PAUSE_MS);
    if (currentGeneration() !== gen) return;
    if (seg.kind === 'phrase') {
      // Clips for the words; her name from a grown-up's recording, else the device voice if it can talk.
      for (const [j, part] of seg.parts.entries()) {
        if (j > 0) await wait(NAME_GAP_MS);
        if (currentGeneration() !== gen) return;
        if ('voice' in part) {
          if (!(await playVoice(part.voice.id)) && deviceVoiceMaybe()) await speakLine(part.voice.text ?? '', seg.lang);
        } else if (!(hasRecording(part.nameKey) && (await playClip(part.nameKey))) && deviceVoiceMaybe()) {
          await speakLine(part.spoken, seg.lang);
        }
      }
    } else if (seg.kind === 'say') {
      if (!(seg.voice && (await playVoice(seg.voice.id)))) await speakLine(seg.text, seg.lang);
    } else if (!(await playClip(seg.key)) && !(seg.voice && (await playVoice(seg.voice.id)))) {
      await speakLine(seg.fallback, seg.lang);
    }
  }
}
