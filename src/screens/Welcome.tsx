import { useState } from 'react';
import { phrase, playSequence } from '../audio/sayLetter';
import { SPOKEN } from '../content/phrases';
import { sfx } from '../audio/sfx';
import { unlockSpeech } from '../audio/speech';
import { Emoji } from '../components/Emoji';
import { ParentGate } from '../components/bits';
import { ProfileSheet } from '../components/ProfileSheet';
import { VersionTag } from '../components/VersionInfo';
import { uiLang, useT } from '../i18n/ui';
import type { Go } from '../nav';
import { type LangMode, useApp, whoOf } from '../state/store';

export function Welcome({ go }: { go: Go }) {
  const t = useT();
  const profiles = useApp((s) => s.profiles);
  const lang = useApp((s) => s.settings.lang);
  const [adding, setAdding] = useState(false);

  const pick = (id: string) => {
    // This tap is what lets tablets play sound.
    unlockSpeech();
    sfx.unlock();
    sfx.pop();
    useApp.getState().selectProfile(id);
    const p = useApp.getState().profiles.find((x) => x.id === id)!;
    const l = uiLang(lang);
    // Switch screens first: switching stops whatever is being said.
    go({ id: 'home' });
    void playSequence(phrase(SPOKEN[l].greet, l, {}, whoOf(p)));
  };

  const setLang = (l: LangMode) => {
    useApp.getState().updateSettings({ lang: l });
    const voiceLang = l === 'es' ? 'es' : 'en';
    void playSequence(phrase(SPOKEN[voiceLang].language, voiceLang));
  };

  return (
    <div className="scene">
      <div className="center-col">
        <h1 className="big-title">Flower<span className="accent">Corn</span> Land <Emoji e="🌸" /><Emoji e="🦄" /></h1>
        <div style={{ fontSize: '1.6rem', fontWeight: 600 }}>{t('whoIsPlaying')}</div>
        <div className="cards">
          {profiles.map((p) => (
            <button key={p.id} className="card" onClick={() => pick(p.id)}>
              <span className="big"><Emoji e={p.avatar} /></span>
              {p.name}
            </button>
          ))}
          <button className="card add" onClick={() => { unlockSpeech(); setAdding(true); }}>
            <span className="big"><Emoji e="➕" /></span>
            {t('newPlayer')}
          </button>
        </div>
        <div className="seg" role="group" aria-label="Language">
          <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
          <button aria-pressed={lang === 'es'} onClick={() => setLang('es')}>Español</button>
          <button aria-pressed={lang === 'both'} onClick={() => setLang('both')}>Both · Ambos</button>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="garden" style={{ fontSize: '2rem' }}><Emoji e="🌷" /><Emoji e="🌼" /><Emoji e="🌸" /><Emoji e="🌻" /><Emoji e="🌺" /></span>
        <div className="row">
          <VersionTag />
          <ParentGate label={t('holdForGrownups')} onOpen={() => go({ id: 'parent' })} />
        </div>
      </div>
      {adding && (
        <ProfileSheet
          onClose={() => setAdding(false)}
          onSave={(p) => { const id = useApp.getState().addProfile(p); setAdding(false); pick(id); }}
        />
      )}
    </div>
  );
}
