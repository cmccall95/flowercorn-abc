import { useState } from 'react';
import { engineAudio, useEngine } from '../../audio/engine/engine';
import { EN_LETTER_IPA, letterPart, type LetterFixes } from '../../audio/engine/pieces';
import { playSamples } from '../../audio/player';
import { hush } from '../../audio/sayLetter';
import { VoiceEngineCard } from '../../components/VoiceEngineCard';
import { spokenName } from '../../content/names';
import { itemsFor, type Lang } from '../../content/sets';
import { wordFor } from '../../content/words';
import { useApp } from '../../state/store';

/** Grown-ups type how a letter's name should sound, hear it right away, and save it. */
export function FixLetters() {
  const ready = useEngine((s) => s.status === 'ready');
  const fixes = useApp((s) => s.settings.letterFixes);
  const [lang, setLang] = useState<Lang>('en');
  const [letter, setLetter] = useState('A');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const saved = fixes[lang]?.[letter] ?? '';
  const word = wordFor(letter, lang);

  const pick = (l: string) => { setLetter(l); setDraft(fixes[lang]?.[l] ?? ''); };
  const hear = async (withWord: boolean) => {
    hush();
    setBusy(true);
    const trial: LetterFixes = { ...fixes, [lang]: { ...fixes[lang], [letter]: draft.trim() } };
    const name = letterPart(letter, lang, draft.trim() ? trial : {});
    const tail = word ? (lang === 'es' ? ` de ${word[0]}.` : ` is for ${word[0]}.`) : '.';
    const audio = await engineAudio(withWord ? [name, { text: tail }] : [name, { text: '.' }], lang);
    setBusy(false);
    if (audio) await playSamples(audio.samples, audio.rate);
  };
  const save = (value: string) => {
    const next: LetterFixes = { ...fixes, [lang]: { ...fixes[lang] } };
    if (value) next[lang]![letter] = value; else delete next[lang]![letter];
    useApp.getState().updateSettings({ letterFixes: next });
  };

  if (!ready) return <div className="settings-grid"><VoiceEngineCard /><p className="muted">Fixing letters uses the in-app voice. Download it above first.</p></div>;

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3>Fix how a letter is said</h3>
      <p className="muted" style={{ margin: 0 }}>
        Pick a letter and press ▶ to hear it. If it sounds wrong, type it the way it should sound (like “see” for C or
        “zee” for Z), listen again, and Save. Your fix is used everywhere the letter is said.
      </p>
      <div className="seg" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={lang === 'en'} onClick={() => { setLang('en'); setDraft(fixes.en?.[letter] ?? ''); }}>English</button>
        <button aria-pressed={lang === 'es'} onClick={() => { setLang('es'); setDraft(fixes.es?.[letter] ?? ''); }}>Español</button>
      </div>
      <div className="rec-grid">
        {itemsFor('upper', lang).map((l) => (
          <button key={l} aria-pressed={l === letter} className={fixes[lang]?.[l] ? 'has' : ''} onClick={() => pick(l)}>{l}</button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="fix-text">How <b style={{ fontFamily: 'var(--font-letter)', fontSize: '1.4rem' }}>{letter}</b> should sound</label>
        <input id="fix-text" type="text" value={draft} maxLength={24} autoComplete="off"
          placeholder={lang === 'en' ? `built-in: /${EN_LETTER_IPA[letter]}/` : `built-in: “${spokenName(letter, 'es')}”`}
          onChange={(e) => setDraft(e.target.value)} />
      </div>
      <div className="row" style={{ justifyContent: 'flex-start' }}>
        <button className="btn small" disabled={busy} onClick={() => void hear(false)}>▶ {letter}.</button>
        {word && <button className="btn small" disabled={busy} onClick={() => void hear(true)}>▶ {letter} {lang === 'es' ? 'de' : 'is for'} {word[0]}</button>}
        <button className="btn small primary" disabled={draft.trim() === saved} onClick={() => save(draft.trim())}>Save</button>
        {saved && <button className="btn small" onClick={() => { setDraft(''); save(''); }}>Use built-in</button>}
        {busy && <span className="muted">Making the sound…</span>}
      </div>
    </div>
  );
}
