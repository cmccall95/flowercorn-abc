import { useEffect, useReducer, useState } from 'react';
import { normalize, secondCopy } from '../../audio/carrier';
import { engineAudio, useEngine } from '../../audio/engine/engine';
import { EN_LETTER_IPA, type LetterFixes } from '../../audio/engine/pieces';
import { playSamples } from '../../audio/player';
import { deleteRecording, hasRecording, loadRecordingKeys, playClip, saveRecording } from '../../audio/recordings';
import { carrierParts, hush, introSequence, letterNameKey, type LetterSource, letterSource, playSequence, soundSequence } from '../../audio/sayLetter';
import { letterClipInfo } from '../../audio/voiceClips';
import { HoldToRecord } from '../../components/HoldToRecord';
import { spokenName } from '../../content/names';
import { isSilent, PHONICS, recordingKey } from '../../content/phonics';
import { itemsFor, type Lang } from '../../content/sets';
import { wordFor } from '../../content/words';
import { useApp } from '../../state/store';

/** Letters whose sound is a short stop (said once, no "uh"); the rest can be held. */
const STOPS: Record<Lang, string> = { en: 'BCDGJKPQTX', es: 'BCDGKPQTVX' };
const soundTip = (letter: string, lang: Lang) => (STOPS[lang].includes(letter)
  ? 'Keep it short, with no “uh” after it: “b”, not “buh”.'
  : 'Hold it for about half a second: “mmmm”.');

const hasSound = (letter: string, lang: Lang) => !!PHONICS[lang][letter]?.ipa && !isSilent(letter, lang);
const nameHint = (letter: string, lang: Lang) => (lang === 'en' ? `“${letter === 'Ñ' ? 'enye' : letter}”` : `“${spokenName(letter, 'es')}”`);

function sourceLabel(source: LetterSource, letter: string, lang: Lang): string {
  const fix = useApp.getState().settings.letterFixes[lang]?.[letter];
  const info = letterClipInfo(lang, 'name', letter);
  switch (source) {
    case 'recording': return 'your recording';
    case 'fix': return `your spelling “${fix}”, said by the in-app voice`;
    case 'bundled': return info?.source === 'commons' ? `a built-in recording (${info.credit})` : 'a built-in voice clip';
    case 'engine': return 'the in-app voice';
    default: return "this device's voice";
  }
}

/**
 * One place for everything about how letters sound: hear each letter's name and sound as the game plays them,
 * mark them 👍/👎, record your own, or type a spelling for the in-app voice. "Record all" walks through every letter.
 */
export function LettersAndSounds() {
  const [lang, setLang] = useState<Lang>('en');
  const [letter, setLetter] = useState('A');
  const [guided, setGuided] = useState(false);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const reviews = useApp((s) => s.settings.letterReviews);
  useEffect(() => { void loadRecordingKeys().then(bump); }, []);

  const letters = itemsFor('upper', lang);
  if (guided) return <RecordAll lang={lang} onDone={() => { setGuided(false); bump(); }} />;

  const review = reviews[lang]?.[letter];
  const setReview = (r: 'good' | 'bad' | undefined) => {
    const next = { ...reviews, [lang]: { ...reviews[lang] } };
    if (r) next[lang]![letter] = r; else delete next[lang]![letter];
    useApp.getState().updateSettings({ letterReviews: next });
  };
  const source = letterSource(letter, lang);
  const nameKey = letterNameKey(letter, lang);
  const soundKey = recordingKey(letter, lang);
  const word = wordFor(letter, lang);
  const named = letters.filter((l) => hasRecording(letterNameKey(l, lang))).length;
  const sounded = letters.filter((l) => hasSound(l, lang) && hasRecording(recordingKey(l, lang))).length;
  const keep = (key: string) => async (clip: Blob) => { await saveRecording(key, clip); bump(); };
  const remove = (key: string) => void deleteRecording(key).then(bump);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3>Letters &amp; sounds</h3>
      <p className="muted" style={{ margin: 0 }}>
        Tap a letter to hear it the way the game says it. 👍 the ones that sound right; 👎 the ones that don't, then record
        it in your own voice. Your recordings always come first, stay on this device, and are shared by every player.
      </p>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="seg">
          <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
          <button aria-pressed={lang === 'es'} onClick={() => setLang('es')}>Español</button>
        </div>
        <button className="btn small primary" onClick={() => setGuided(true)}>🎙️ Record all letters</button>
      </div>
      <span className="muted">Recorded: {named} of {letters.length} names · {sounded} of {letters.filter((l) => hasSound(l, lang)).length} sounds</span>
      <div className="rec-grid">
        {letters.map((l) => (
          <button key={l} aria-pressed={l === letter} onClick={() => { hush(); setLetter(l); void playSequence([{ kind: 'letter', item: l, lang }]); }}
            className={[hasRecording(letterNameKey(l, lang)) ? 'has' : '', reviews[lang]?.[l] ?? ''].join(' ')}>{l}</button>
        ))}
      </div>

      <section className="letter-detail">
        <h4><span className="big-letter">{letter}</span> name · now from {sourceLabel(source, letter, lang)}</h4>
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <button className="btn small" onClick={() => void playSequence([{ kind: 'letter', item: letter, lang }])}>▶ Name</button>
          <button className="btn small" onClick={() => void playSequence(introSequence(letter, lang))}>▶ In the game</button>
          <button className="btn small" aria-pressed={review === 'good'} onClick={() => setReview(review === 'good' ? undefined : 'good')}>👍 Sounds right</button>
          <button className="btn small" aria-pressed={review === 'bad'} onClick={() => setReview(review === 'bad' ? undefined : 'bad')}>👎 Sounds wrong</button>
        </div>
        {review === 'bad' && source !== 'recording' && (
          <p className="muted" style={{ margin: 0 }}>Record it below in your own voice{source === 'bundled' ? ' (the built-in recording is skipped meanwhile)' : ''}, or type how it should sound.</p>
        )}
        <HoldToRecord resetKey={`name:${lang}:${letter}`} onKeep={keep(nameKey)} hint={<b>Say the letter's name: {nameHint(letter, lang)}</b>} />
        {hasRecording(nameKey) && (
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <button className="btn small" onClick={() => void playClip(nameKey)}>▶ Your recording</button>
            <button className="btn small" onClick={() => remove(nameKey)}>Delete recording</button>
          </div>
        )}
        <FixSpelling lang={lang} letter={letter} />
      </section>

      {hasSound(letter, lang) ? (
        <section className="letter-detail">
          <h4><span className="big-letter">{letter}</span> sound · {PHONICS[lang][letter].ipa}{word && ` as in ${word[0]}`}</h4>
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <button className="btn small" onClick={() => void playSequence(soundSequence(letter, lang))}>▶ In the game</button>
            {hasRecording(soundKey) && <button className="btn small" onClick={() => void playClip(soundKey)}>▶ Your recording</button>}
            {hasRecording(soundKey) && <button className="btn small" onClick={() => remove(soundKey)}>Delete recording</button>}
          </div>
          <HoldToRecord resetKey={`sound:${lang}:${letter}`} onKeep={keep(soundKey)}
            hint={<><b>Say just the sound: {PHONICS[lang][letter].ipa}</b><div className="muted">{soundTip(letter, lang)}</div></>} />
        </section>
      ) : lang === 'es' && letter === 'H' && <p className="muted" style={{ margin: 0 }}>In Spanish H is silent, and the game says so.</p>}
    </div>
  );
}

/** Type how a letter's name should sound for the in-app voice, hear it, and save it. */
function FixSpelling({ lang, letter }: { lang: Lang; letter: string }) {
  const ready = useEngine((s) => s.status === 'ready');
  const fixes = useApp((s) => s.settings.letterFixes);
  const saved = fixes[lang]?.[letter] ?? '';
  const [draft, setDraft] = useState(saved);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(saved), [lang, letter, saved]);

  const save = (value: string) => {
    const next: LetterFixes = { ...fixes, [lang]: { ...fixes[lang] } };
    if (value) next[lang]![letter] = value; else delete next[lang]![letter];
    useApp.getState().updateSettings({ letterFixes: next });
  };
  const hear = async () => {
    hush();
    setBusy(true);
    const audio = await engineAudio(carrierParts(letter, lang, draft.trim() ? { [lang]: { [letter]: draft.trim() } } : {}), lang);
    setBusy(false);
    if (audio) await playSamples(normalize(secondCopy(audio.samples, audio.rate) ?? audio.samples, audio.rate), audio.rate);
  };

  if (!ready) return <p className="muted" style={{ margin: 0 }}>To type a spelling instead, download the in-app voice in Settings.</p>;
  return (
    <div className="field">
      <label htmlFor="fix-text">Or type how {letter} should sound (in-app voice)</label>
      <div className="row" style={{ justifyContent: 'flex-start' }}>
        <input id="fix-text" type="text" value={draft} maxLength={24} autoComplete="off" style={{ maxWidth: '12rem' }}
          placeholder={lang === 'en' ? `built-in: /${EN_LETTER_IPA[letter]}/` : `built-in: “${spokenName(letter, 'es')}”`}
          onChange={(e) => setDraft(e.target.value)} />
        <button className="btn small" disabled={busy} onClick={() => void hear()}>▶ Try</button>
        <button className="btn small primary" disabled={draft.trim() === saved} onClick={() => save(draft.trim())}>Save</button>
        {saved && <button className="btn small" onClick={() => save('')}>Use built-in</button>}
        {busy && <span className="muted">Making the sound…</span>}
      </div>
    </div>
  );
}

/** Walk through every letter: its name, then its sound. Each keep moves on to the next. */
function RecordAll({ lang, onDone }: { lang: Lang; onDone: () => void }) {
  const [missingOnly, setMissingOnly] = useState(true);
  const [steps] = useState(() => itemsFor('upper', lang).flatMap((l) => [
    { letter: l, kind: 'name' as const, key: letterNameKey(l, lang) },
    ...(hasSound(l, lang) ? [{ letter: l, kind: 'sound' as const, key: recordingKey(l, lang) }] : []),
  ]));
  const todo = missingOnly ? steps.filter((s) => !hasRecording(s.key)) : steps;
  const [at, setAt] = useState(0);
  const [list, setList] = useState(todo);
  useEffect(() => { setList(todo); setAt(0); }, [missingOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = list[at];

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3>Record all letters · {lang === 'en' ? 'English' : 'Español'}</h3>
      <ul className="muted" style={{ margin: 0, paddingLeft: '1.2rem' }}>
        <li>Find a quiet room and hold the phone about a hand's width from your mouth.</li>
        <li>Names: say the letter the way you'd teach it, clearly, once.</li>
        <li>Sounds you can hold (m, s, f, vowels): hold them about half a second. Short sounds (b, d, k, p, t): once, with no “uh” after.</li>
        <li>Silence is trimmed and the volume is matched automatically.</li>
      </ul>
      <label className="check"><input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} /> Only letters not recorded yet</label>
      {step ? (
        <>
          <div className="muted">{at + 1} of {list.length}</div>
          <HoldToRecord resetKey={`${at}:${step.key}`}
            onKeep={async (clip) => { await saveRecording(step.key, clip); setAt((n) => n + 1); }}
            hint={
              <div>
                <span className="big-letter">{step.letter}</span>{' '}
                {step.kind === 'name'
                  ? <b>Say its name: {nameHint(step.letter, lang)}</b>
                  : <><b>Say its sound: {PHONICS[lang][step.letter].ipa}</b>{wordFor(step.letter, lang) && <span className="muted"> as in {wordFor(step.letter, lang)![0]}</span>}
                    <div className="muted">{soundTip(step.letter, lang)}</div></>}
              </div>
            } />
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <button className="btn small" disabled={at === 0} onClick={() => setAt((n) => n - 1)}>◀ Back</button>
            <button className="btn small" onClick={() => setAt((n) => n + 1)}>Skip ▶</button>
            <button className="btn small" onClick={onDone}>Finish</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: 0 }}>🎉 All done{list.length ? '' : ': everything is already recorded'}.</p>
          <button className="btn small primary" style={{ alignSelf: 'flex-start' }} onClick={onDone}>Back to letters</button>
        </>
      )}
    </div>
  );
}
