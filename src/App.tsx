import { useEffect, useRef, useState } from 'react';
import { loadRecordingKeys } from './audio/recordings';
import { hush, phrase, playSequence } from './audio/sayLetter';
import { SPOKEN } from './content/phrases';
import { setSfxVolume } from './audio/sfx';
import { setVoiceSettings } from './audio/speech';
import { loadVoiceIndex } from './audio/voiceClips';
import { startEngine } from './audio/engine/engine';
import { Emoji } from './components/Emoji';
import { SoundWarning } from './components/SoundCheck';
import { tFor, uiLang } from './i18n/ui';
import { useSessionTimer } from './metrics/store';
import type { Go, Screen } from './nav';
import { FindGame } from './screens/FindGame';
import { Home } from './screens/Home';
import { ParentCorner } from './screens/parent/ParentCorner';
import { StickerBook } from './screens/StickerBook';
import { TraceGame } from './screens/TraceGame';
import { Welcome } from './screens/Welcome';
import { useActiveProfile, useApp, whoOf } from './state/store';

export default function App() {
  const [screen, setScreen] = useState<Screen>({ id: 'welcome' });
  const settings = useApp((s) => s.settings);
  const profile = useActiveProfile();
  const playing = screen.id !== 'welcome' && screen.id !== 'parent';
  useSessionTimer(playing ? profile?.id ?? null : null);
  const needsBreak = useBreakReminder(playing, settings.breakMinutes);

  useEffect(() => { void loadRecordingKeys(); void loadVoiceIndex(); }, []);
  // The in-app voice loads from this device once it has been downloaded.
  useEffect(() => { if (settings.engine) startEngine(); }, [settings.engine]);
  useEffect(() => {
    setVoiceSettings({ voiceEn: settings.voiceEn, voiceEs: settings.voiceEs, rate: settings.rate, pitch: settings.pitch });
    setSfxVolume(settings.sfxVolume);
    document.documentElement.dataset.palette = settings.palette;
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
    document.documentElement.lang = uiLang(settings.lang);
  }, [settings]);
  // Stop talking when the tab is hidden.
  useEffect(() => {
    const onHide = () => { if (document.hidden) hush(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  const go: Go = (s) => {
    hush();
    if ((s.id === 'home' || s.id === 'find' || s.id === 'trace' || s.id === 'book') && !useApp.getState().activeId) s = { id: 'welcome' };
    setScreen(s);
  };

  useEffect(() => {
    if (!needsBreak.show) return;
    const lang = uiLang(settings.lang);
    void playSequence(phrase(SPOKEN[lang].breakTime, lang, {}, whoOf(profile)));
  }, [needsBreak.show]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div onContextMenu={(e) => e.preventDefault()} style={{ height: '100%' }}>
      {screen.id === 'welcome' && <Welcome go={go} />}
      {screen.id === 'home' && <Home go={go} />}
      {screen.id === 'find' && <FindGame key={screen.activity} activity={screen.activity} go={go} />}
      {screen.id === 'trace' && <TraceGame key={screen.set} set={screen.set} go={go} />}
      {screen.id === 'book' && <StickerBook go={go} />}
      {screen.id === 'parent' && <ParentCorner tab={screen.tab} go={go} />}
      {playing && <SoundWarning />}
      {needsBreak.show && playing && (
        <div className="overlay modal">
          <div className="reveal">
            <div className="sticker-big"><Emoji e="🌙" /></div>
            <h2>{tFor(uiLang(settings.lang), 'breakTime')}</h2>
            <button className="btn small" onClick={needsBreak.dismiss}>Grown-ups: keep playing</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Counts visible play time; after the chosen minutes, asks for a break until a grown-up dismisses it. */
function useBreakReminder(playing: boolean, minutes: number) {
  const [show, setShow] = useState(false);
  const played = useRef(0);
  useEffect(() => {
    if (!playing || !minutes) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      played.current += 1000;
      if (played.current >= minutes * 60_000) setShow(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, minutes]);
  return { show, dismiss: () => { played.current = 0; setShow(false); } };
}
