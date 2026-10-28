import { useAudioHealth } from '../audio/health';
import { say } from '../audio/sayLetter';
import { voicesFor } from '../audio/speech';
import { playVoice, sampleVoiceId } from '../audio/voiceClips';
import { sfx } from '../audio/sfx';
import { Emoji } from './Emoji';

const icon = (s: string) => (s === 'ok' ? '✅' : s === 'failed' ? '⚠️' : '❔');

/** Grown-up panel: is each kind of sound working on this device, with buttons to test it. */
export function SoundCheck() {
  const h = useAudioHealth();
  const en = voicesFor('en').length;
  const es = voicesFor('es').length;
  return (
    <div className="panel field" style={{ gridColumn: '1 / -1' }}>
      <span className="lbl">Sound check</span>
      <div className="check-row">
        <Emoji e={icon(h.clips)} />
        <div>
          <b>Letter voice clips</b>{' '}
          {h.clips === 'ok' ? `${h.clipCount} ready` : h.clips === 'failed' ? 'could not load (check the internet connection, then reload)' : 'loading…'}
          <div className="muted">These say every letter, sound and prompt. They work offline once loaded.</div>
        </div>
        <button className="btn small" onClick={() => { sfx.unlock(); const id = sampleVoiceId(); if (id) void playVoice(id); }}>▶ Play a clip</button>
      </div>
      <div className="check-row">
        <Emoji e={icon(h.deviceVoice)} />
        <div>
          <b>This device's voice</b>{' '}
          {h.deviceVoice === 'ok' ? 'working' : h.deviceVoice === 'failed' ? `not available (${h.deviceError})` : en + es === 0 ? 'no voices listed (tap Test to try)' : 'not tested yet'}
          {en + es > 0 && <> · {en} English, {es} Spanish voices</>}
          <div className="muted">
            Only needed to say her name in cheers when it isn't recorded; everything else has its own clip. Chrome on many
            Samsung phones doesn't offer its voices to websites even when they're set up, so the easy fix is
            Players → Record name.
          </div>
        </div>
        <button className="btn small" onClick={() => void say('Testing, one, two, three!', 'en')}>🔊 Test</button>
      </div>
    </div>
  );
}

/** Small on-screen note while playing, shown only if the game's voice clips couldn't load. */
export function SoundWarning() {
  const failed = useAudioHealth((s) => s.clips === 'failed');
  if (!failed) return null;
  return (
    <div className="sound-warning" role="status">
      🔇 The voice clips didn't load. Grown-ups: check the internet, then Settings → Sound check
    </div>
  );
}
