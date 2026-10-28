import { useEffect, useRef, useState } from 'react';
import { deleteRecording, hasRecording, loadRecordingKeys, playClip, saveRecording } from '../../audio/recordings';
import { playSequence, soundSequence } from '../../audio/sayLetter';
import { trimToWav } from '../../audio/trim';
import { PHONICS, recordingKey } from '../../content/phonics';
import { itemsFor, type Lang } from '../../content/sets';
import { wordFor } from '../../content/words';

const MAX_MS = 2500;

export function RecordSounds() {
  const [lang, setLang] = useState<Lang>('en');
  const [letter, setLetter] = useState('A');
  const [, setVersion] = useState(0);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stopTimer = useRef<number>();

  useEffect(() => { void loadRecordingKeys().then(() => setVersion((v) => v + 1)); }, []);
  useEffect(() => { setDraft(null); setError(''); }, [letter, lang]);

  const letters = itemsFor('upper', lang).filter((l) => PHONICS[lang][l]?.ipa);
  const key = recordingKey(letter, lang);
  const phonic = PHONICS[lang][letter];
  const word = wordFor(letter, lang);
  const done = letters.filter((l) => hasRecording(recordingKey(l, lang))).length;

  const start = async () => {
    setError('');
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
          void new Audio(URL.createObjectURL(wav)).play();
        } catch {
          setError('That recording could not be read. Try again.');
        }
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      stopTimer.current = window.setTimeout(stop, MAX_MS);
    } catch {
      setError('The microphone is blocked. Allow microphone access for this site in the browser settings, then try again.');
    }
  };
  const stop = () => {
    clearTimeout(stopTimer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };

  const keep = async () => {
    if (!draft) return;
    await saveRecording(key, draft);
    setDraft(null);
    setVersion((v) => v + 1);
    const next = letters.find((l) => !hasRecording(recordingKey(l, lang)));
    if (next) setLetter(next);
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3>Record phonics sounds · {done} of {letters.length} {lang === 'en' ? 'English' : 'Spanish'} done</h3>
      <p className="muted" style={{ margin: 0 }}>
        Say just the sound, short and clear: “mmm”, not “em”. Until a letter is recorded, the device voice makes its best guess.
        Recordings stay on this device and are shared by every player.
      </p>
      <div className="seg" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English sounds</button>
        <button aria-pressed={lang === 'es'} onClick={() => { setLang('es'); if (letter === 'H') setLetter('A'); }}>Spanish sounds</button>
      </div>
      <div className="rec-grid">
        {letters.map((l) => (
          <button key={l} aria-pressed={l === letter} className={hasRecording(recordingKey(l, lang)) ? 'has' : ''} onClick={() => setLetter(l)}>{l}</button>
        ))}
      </div>
      <div className="recorder">
        <button className={`mic ${recording ? 'on' : ''}`} aria-label={recording ? 'Recording… let go to stop' : 'Hold to record'}
          onPointerDown={(e) => { e.preventDefault(); void start(); }} onPointerUp={stop} onPointerLeave={() => recording && stop()}
          onKeyDown={(e) => { if (e.key === ' ' && !recording) void start(); }} onKeyUp={(e) => { if (e.key === ' ') stop(); }}>
          🎙️
        </button>
        <div style={{ flex: 1, minWidth: '14rem' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>
            <span style={{ fontFamily: 'var(--font-letter)', fontSize: '2rem' }}>{letter}</span> says <b>{phonic.ipa}</b>
            {word && <span className="muted"> · as in {word[0]}</span>}
          </div>
          <div className="muted">{recording ? 'Recording… let go when you’re done.' : 'Hold the microphone and say the sound.'}</div>
        </div>
        <div className="row">
          {draft && <>
            <button className="btn small" onClick={() => void new Audio(URL.createObjectURL(draft)).play()}>▶ Play</button>
            <button className="btn small primary" onClick={() => void keep()}>✓ Keep</button>
            <button className="btn small" onClick={() => setDraft(null)}>↺ Redo</button>
          </>}
          {!draft && hasRecording(key) && <>
            <button className="btn small" onClick={() => void playClip(key)}>▶ Saved sound</button>
            <button className="btn small" onClick={() => void playSequence(soundSequence(letter, lang))}>🔊 Hear in game</button>
            <button className="btn small" onClick={() => void deleteRecording(key).then(() => setVersion((v) => v + 1))}>Delete</button>
          </>}
        </div>
      </div>
      {error && <p style={{ color: '#c2185b', margin: 0 }}>{error}</p>}
      {lang === 'es' && <p className="muted" style={{ margin: 0 }}>H isn't listed: in Spanish it's silent, and the game says so.</p>}
    </div>
  );
}
