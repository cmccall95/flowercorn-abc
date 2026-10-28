import { useEffect, useState } from 'react';
import { deleteRecording, hasRecording, loadRecordingKeys, playClip, saveRecording } from '../../audio/recordings';
import { playSequence, soundSequence } from '../../audio/sayLetter';
import { HoldToRecord } from '../../components/HoldToRecord';
import { PHONICS, recordingKey } from '../../content/phonics';
import { itemsFor, type Lang } from '../../content/sets';
import { wordFor } from '../../content/words';

export function RecordSounds() {
  const [lang, setLang] = useState<Lang>('en');
  const [letter, setLetter] = useState('A');
  const [, setVersion] = useState(0);
  useEffect(() => { void loadRecordingKeys().then(() => setVersion((v) => v + 1)); }, []);

  const letters = itemsFor('upper', lang).filter((l) => PHONICS[lang][l]?.ipa);
  const key = recordingKey(letter, lang);
  const phonic = PHONICS[lang][letter];
  const word = wordFor(letter, lang);
  const done = letters.filter((l) => hasRecording(recordingKey(l, lang))).length;

  const keep = async (clip: Blob) => {
    await saveRecording(key, clip);
    setVersion((v) => v + 1);
    const next = letters.find((l) => !hasRecording(recordingKey(l, lang)));
    if (next) setLetter(next);
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3>Record phonics sounds · {done} of {letters.length} {lang === 'en' ? 'English' : 'Spanish'} done</h3>
      <p className="muted" style={{ margin: 0 }}>
        Say just the sound, short and clear: “mmm”, not “em”. Until a letter is recorded, the built-in voice clip is used.
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
      <HoldToRecord
        resetKey={`${lang}:${letter}`}
        onKeep={keep}
        hint={
          <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>
            <span style={{ fontFamily: 'var(--font-letter)', fontSize: '2rem' }}>{letter}</span> says <b>{phonic.ipa}</b>
            {word && <span className="muted"> · as in {word[0]}</span>}
          </div>
        }
      />
      {hasRecording(key) && (
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <button className="btn small" onClick={() => void playClip(key)}>▶ Saved sound</button>
          <button className="btn small" onClick={() => void playSequence(soundSequence(letter, lang))}>🔊 Hear in game</button>
          <button className="btn small" onClick={() => void deleteRecording(key).then(() => setVersion((v) => v + 1))}>Delete</button>
        </div>
      )}
      {lang === 'es' && <p className="muted" style={{ margin: 0 }}>H isn't listed: in Spanish it's silent, and the game says so.</p>}
    </div>
  );
}
