import { useEffect, useRef, useState } from 'react';
import { playBuffer } from '../audio/player';
import { sfx } from '../audio/sfx';
import { trimToWav } from '../audio/trim';

const playBlob = (b: Blob) => playBuffer(`draft:${Date.now()}`, () => b.arrayBuffer());

/**
 * Hold the microphone to record a short clip, hear it back, then Keep or Redo.
 * Used for phonics sounds and for recording a child's name.
 */
export function HoldToRecord({ onKeep, hint, maxMs = 2500, resetKey }: {
  onKeep: (clip: Blob) => Promise<void>; hint: React.ReactNode; maxMs?: number; resetKey?: string;
}) {
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stopTimer = useRef<number>();

  useEffect(() => { setDraft(null); setError(''); }, [resetKey]);

  const stop = () => {
    clearTimeout(stopTimer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };

  const start = async () => {
    setError('');
    sfx.unlock();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        try {
          const wav = await trimToWav(new Blob(chunks, { type: rec.mimeType }));
          setDraft(wav);
          void playBlob(wav);
        } catch {
          setError('That recording could not be read. Try again.');
        }
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      stopTimer.current = window.setTimeout(stop, maxMs);
    } catch {
      setError('The microphone is blocked. Allow microphone access for this site in the browser settings, then try again.');
    }
  };

  return (
    <div className="recorder">
      <button className={`mic ${recording ? 'on' : ''}`} aria-label={recording ? 'Recording… let go to stop' : 'Hold to record'}
        onPointerDown={(e) => { e.preventDefault(); void start(); }} onPointerUp={stop} onPointerLeave={() => recording && stop()}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if (e.key === ' ' && !recording) void start(); }} onKeyUp={(e) => { if (e.key === ' ') stop(); }}>
        🎙️
      </button>
      <div style={{ flex: 1, minWidth: '12rem' }}>
        {hint}
        <div className="muted">{recording ? 'Recording… let go when you’re done.' : 'Hold the microphone while you talk.'}</div>
        {error && <div style={{ color: '#c2185b' }}>{error}</div>}
      </div>
      {draft && (
        <div className="row">
          <button className="btn small" onClick={() => void playBlob(draft)}>▶ Play</button>
          <button className="btn small primary" onClick={() => void onKeep(draft).then(() => setDraft(null))}>✓ Keep</button>
          <button className="btn small" onClick={() => setDraft(null)}>↺ Redo</button>
        </div>
      )}
    </div>
  );
}
