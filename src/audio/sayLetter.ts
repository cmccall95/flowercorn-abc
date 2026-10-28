import type { Lang } from '../content/sets';
import type { Segment } from './lines';
import { stopAudio } from './player';
import { playClip } from './recordings';
import { cancelSpeech, currentGeneration, speakLine } from './speech';
import { playVoice } from './voiceClips';

export { drawPrompt, findPrompt, introSequence, nameLine, sequenceText, soundSequence } from './lines';
export type { Segment } from './lines';

const PAUSE_MS = 350;

/** Stop speech and any clip that's playing. */
export function hush() {
  stopAudio();
  cancelSpeech();
}

/** Say one line on the device voice right now, cutting off anything playing. */
export function say(text: string, lang: Lang): Promise<void> {
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
  for (const [i, seg] of segments.entries()) {
    // A short breath between pieces so joined clips don't run together.
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSE_MS));
    if (currentGeneration() !== gen) return;
    if (seg.kind === 'say') {
      if (!(seg.voice && (await playVoice(seg.voice.id)))) await speakLine(seg.text, seg.lang);
    } else if (!(await playClip(seg.key)) && !(seg.voice && (await playVoice(seg.voice.id)))) {
      await speakLine(seg.fallback, seg.lang);
    }
  }
}
