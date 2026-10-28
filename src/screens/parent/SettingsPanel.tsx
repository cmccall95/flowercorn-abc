import { useEffect, useState } from 'react';
import { say } from '../../audio/sayLetter';
import { pickVoice, voicesFor } from '../../audio/speech';
import { firstCheer } from '../../content/cheers';
import { SoundCheck } from '../../components/SoundCheck';
import { VoiceEngineCard } from '../../components/VoiceEngineCard';
import type { Lang } from '../../content/sets';
import { type Settings, spokenNameOf, useActiveProfile, useApp } from '../../state/store';

function useVoices() {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const update = () => setN((n) => n + 1);
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
}

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, label]) => <button key={String(v)} aria-pressed={v === value} onClick={() => onChange(v)}>{label}</button>)}
    </div>
  );
}

export function SettingsPanel() {
  useVoices();
  const s = useApp((x) => x.settings);
  const set = (patch: Partial<Settings>) => useApp.getState().updateSettings(patch);
  const profile = useActiveProfile();
  const testName = spokenNameOf(profile) || 'friend';

  const voicePicker = (lang: Lang) => {
    const key = lang === 'en' ? 'voiceEn' : 'voiceEs';
    const pool = voicesFor(lang);
    const auto = pickVoice(lang);
    return (
      <div className="field">
        <label htmlFor={`v-${lang}`}>{lang === 'en' ? 'English device voice' : 'Spanish device voice'}</label>
        <select id={`v-${lang}`} value={s[key]} onChange={(e) => set({ [key]: e.target.value })}>
          <option value="">Auto{auto ? ` (${auto.name})` : ''}</option>
          {pool.map((v) => <option key={v.name} value={v.name}>{v.name} · {v.lang}</option>)}
        </select>
        <button className="btn small" style={{ alignSelf: 'flex-start' }} disabled={!pool.length} onClick={() => void say(`${firstCheer(testName, lang)} ${lang === 'es' ? 'La eme suena mmm.' : 'M says mmm.'}`, lang)}>
          🔊 Test
        </button>
        {!pool.length && <span className="muted">This browser has no {lang === 'en' ? 'English' : 'Spanish'} voices. That's fine: the game's own clips are used. See Sound check above.</span>}
      </div>
    );
  };

  return (
    <div className="settings-grid">
      <VoiceEngineCard />
      <SoundCheck />
      <div className="panel field">
        <span className="lbl">Language</span>
        <Seg value={s.lang} options={[['en', 'English'], ['es', 'Español'], ['both', 'Both (voice alternates)']]} onChange={(lang) => set({ lang })} />
        <span className="muted">The 🔊 English / Español buttons always work, in every mode.</span>
      </div>
      <div className="panel field">
        <span className="lbl">Answer with</span>
        <Seg value={s.input} options={[['auto', 'Auto'], ['keyboard', 'Keyboard'], ['bubbles', 'Bubbles']]} onChange={(input) => set({ input })} />
        <span className="muted">Auto shows bubbles on touch screens and the keyboard prompt once a key is pressed.</span>
      </div>
      <div className="panel field">
        <span className="lbl">Level</span>
        <Seg value={s.levelMode} options={[['auto', 'Auto'], [1, '1'], [2, '2'], [3, '3'], [4, '4']]} onChange={(levelMode) => set({ levelMode })} />
        <span className="muted">1: in order with the alphabet strip · 2: in order · 3: random, look-alikes · 4: listen only. Auto moves up after each full set.</span>
      </div>
      <div className="panel">{voicePicker('en')}</div>
      <div className="panel">{voicePicker('es')}</div>
      <div className="panel field">
        <span className="muted">Device voice only (used for her name when it isn't recorded). The game's own clips are already slow and clear.</span>
        <label htmlFor="v-rate">Device voice speed · {s.rate.toFixed(2)}</label>
        <input id="v-rate" type="range" min={0.6} max={1.2} step={0.05} value={s.rate} onChange={(e) => set({ rate: +e.target.value })} />
        <label htmlFor="v-pitch">Device voice pitch · {s.pitch.toFixed(2)}</label>
        <input id="v-pitch" type="range" min={0.8} max={1.8} step={0.05} value={s.pitch} onChange={(e) => set({ pitch: +e.target.value })} />
      </div>
      <div className="panel field">
        <label htmlFor="v-sfx">Sound effects volume</label>
        <input id="v-sfx" type="range" min={0} max={1} step={0.1} value={s.sfxVolume} onChange={(e) => set({ sfxVolume: +e.target.value })} />
        <label className="check"><input type="checkbox" checked={s.reduceMotion} onChange={(e) => set({ reduceMotion: e.target.checked })} /> Calmer animations</label>
      </div>
      <div className="panel field">
        <span className="lbl">Break reminder</span>
        <Seg value={s.breakMinutes} options={[[0, 'Off'], [15, '15 min'], [30, '30 min']]} onChange={(breakMinutes) => set({ breakMinutes })} />
      </div>
      <div className="panel field">
        <span className="lbl">Colors</span>
        <Seg value={s.palette} options={[['lavender', 'Lavender Dream'], ['blossom', 'Blossom Pink'], ['sherbet', 'Rainbow Sherbet']]} onChange={(palette) => set({ palette })} />
      </div>
    </div>
  );
}
