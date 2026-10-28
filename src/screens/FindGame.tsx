import { motion, useAnimationControls } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findPrompt, introSequence, nameLine, phrase, playSequence, prepareSequences, soundSequence } from '../audio/sayLetter';
import { cancelPreparing, useEngine } from '../audio/engine/engine';
import { sfx } from '../audio/sfx';
import { burst, CheerBubble } from '../components/Celebration';
import { Emoji } from '../components/Emoji';
import { Garden, IconButton, TopBar } from '../components/bits';
import { StickerReveal } from '../components/StickerReveal';
import { cheer } from '../content/cheers';
import { FRIENDS } from '../content/friends';
import { isNumber } from '../content/names';
import { type ActivityId, itemsFor, type Lang } from '../content/sets';
import { GOLD_STICKERS, pickSticker, STICKER_EVERY, type Sticker } from '../content/stickers';
import { COUNT_THINGS, wordFor } from '../content/words';
import { HINT_AFTER_MISSES, LEVELS, type Level, makeChoices, matchKey, nextLevel, pickTarget } from '../game/engine';
import { uiLang, useT } from '../i18n/ui';
import { itemStats } from '../metrics/analyze';
import { useMetrics } from '../metrics/store';
import type { Go } from '../nav';
import { DEFAULT_PROGRESS, type ProgressKey, useActiveProfile, useApp, whoOf } from '../state/store';

const KEY_DEBOUNCE_MS = 350;
const ADVANCE_MS = 1700;

// Once she presses a real key on this device, show the keyboard prompt instead of bubbles (in Auto mode).
let keyboardSeen = (() => { try { return sessionStorage.getItem('fc-kb') === '1'; } catch { return false; } })();
const coarsePointer = () => matchMedia('(pointer: coarse)').matches;

interface Round {
  target: string;
  choices: string[];
  shownAt: number;
  lang: Lang;
}

export function FindGame({ activity, go }: { activity: ActivityId; go: Go }) {
  const t = useT();
  const settings = useApp((s) => s.settings);
  const profile = useActiveProfile();
  const stars = useApp((s) => (s.activeId ? s.stars[s.activeId] ?? 0 : 0));
  const owned = useApp((s) => (s.activeId ? s.stickers[s.activeId] ?? [] : []));
  const setLang: Lang = settings.lang === 'en' ? 'en' : 'es';
  const items = useMemo(() => itemsFor(activity, setLang), [activity, setLang]);
  const key: ProgressKey = `${activity}:${setLang}`;
  const saved = useApp((s) => (s.activeId && s.progress[s.activeId]?.[key]) || DEFAULT_PROGRESS);
  const level: Level = settings.levelMode === 'auto' ? saved.level : settings.levelMode;
  const config = LEVELS[level];
  const who = whoOf(profile);
  const displayName = profile?.name ?? '';

  const [step, setStep] = useState(saved.step % items.length);
  const [round, setRound] = useState<Round | null>(null);
  const [misses, setMisses] = useState(0);
  const [buffer, setBuffer] = useState('');
  const [cheerText, setCheerText] = useState<string | null>(null);
  const [reward, setReward] = useState<Sticker | null>(null);
  const [useKeys, setUseKeys] = useState(settings.input === 'keyboard' || (settings.input === 'auto' && keyboardSeen && !coarsePointer()));
  const busy = useRef(false);
  const lastKey = useRef(0);
  const wrongInputs = useRef<string[]>([]);
  const replays = useRef(0);
  const hinted = useRef(false);
  // Letters already shown in random levels, so ◀ can go back to them.
  const past = useRef<string[]>([]);
  const cardControls = useAnimationControls();

  // Her trouble letters and usual mix-ups, from past play, steer the random levels.
  const history = useMemo(() => {
    const mine = useMetrics.getState().attempts.filter((a) => a.profileId === profile?.id && a.activity === activity);
    return itemStats(mine);
  }, [profile?.id, activity]);
  const trouble = useMemo(() => [...history.values()].filter((x) => x.needsPractice).map((x) => x.item), [history]);

  const roundLang = (s: number): Lang => (settings.lang === 'both' ? (s % 2 ? 'es' : 'en') : settings.lang);

  const startRound = useCallback((s: number, previous?: string, forced?: string) => {
    const target = forced ?? pickTarget(items, level, s, Math.random, previous, trouble);
    const lang = roundLang(s);
    const r: Round = { target, lang, shownAt: Date.now(), choices: makeChoices(items, target, level, Math.random, history.get(target)?.usualMixup ?? undefined) };
    setRound(r);
    setMisses(0);
    setBuffer('');
    wrongInputs.current = [];
    replays.current = 0;
    hinted.current = false;
    busy.current = false;
    if (LEVELS[level].showCard) void playSequence(introSequence(target, lang));
    else void playSequence(findPrompt(target, lang));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, level, trouble, history, settings.lang]);

  useEffect(() => { startRound(step); /* first round only */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, level]);

  // With the in-app voice, get this set's lines ready in the background (next few letters first).
  const engineReady = useEngine((s) => s.status === 'ready');
  useEffect(() => {
    if (!engineReady) return;
    const order = [...items.slice(step), ...items.slice(0, step)];
    const lang: Lang = settings.lang === 'es' ? 'es' : 'en';
    prepareSequences(order.map((x) => [...introSequence(x, lang), ...nameLine(x, lang)]));
    return cancelPreparing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady, items]);

  const replay = (lang?: Lang) => {
    if (!round) return;
    replays.current++;
    void playSequence(introSequence(round.target, lang ?? round.lang));
  };
  const playSound = () => {
    if (!round) return;
    replays.current++;
    void playSequence(soundSequence(round.target, round.lang));
  };

  // ◀ / ▶ and tapping the alphabet strip: move without answering (nothing is recorded).
  const sequence = config.order === 'sequence';
  const jumpTo = (s: number) => {
    if (!round || busy.current) return;
    sfx.pop();
    setStep(s);
    useApp.getState().setProgress(key, { ...saved, level, step: s });
    startRound(s);
  };
  const goBack = () => {
    if (!round || busy.current) return;
    if (sequence) return jumpTo((step - 1 + items.length) % items.length);
    const prev = past.current.pop();
    if (prev) { sfx.pop(); startRound(step, undefined, prev); }
  };
  const goNext = () => {
    if (!round || busy.current) return;
    if (sequence) return jumpTo((step + 1) % items.length);
    past.current.push(round.target);
    sfx.pop();
    startRound(step, round.target);
  };

  const finishSet = (): Sticker | null => {
    const store = useApp.getState();
    const done = saved.finished + 1;
    store.setProgress(key, { level: settings.levelMode === 'auto' ? nextLevel(saved.level) : saved.level, step: 0, finished: done });
    const gold = GOLD_STICKERS.find((g) => g.id === `gold-${activity}`)!;
    return owned.includes(gold.id) ? pickSticker(owned) : gold;
  };

  const correct = () => {
    if (!round || !profile) return;
    busy.current = true;
    useMetrics.getState().addAttempt({
      profileId: profile.id, activity, lang: round.lang, level, target: round.target, shownAt: round.shownAt,
      answeredAt: Date.now(), wrongInputs: wrongInputs.current, hintShown: hinted.current, replays: replays.current,
    });
    const line = cheer('{n}', round.lang);
    setCheerText(line.replace('{n}', displayName));
    sfx.chime();
    burst();
    void playSequence([...phrase(line, round.lang, {}, who), ...nameLine(round.target, round.lang)]);
    const stickerDue = useApp.getState().addStar(STICKER_EVERY);
    past.current.push(round.target);
    const next = step + 1;
    const setDone = next >= items.length;
    let prize: Sticker | null = null;
    if (setDone) prize = finishSet();
    else {
      useApp.getState().setProgress(key, { ...saved, level, step: next });
      if (stickerDue) prize = pickSticker(owned);
    }
    setTimeout(() => {
      const s = setDone ? 0 : next;
      setStep(s);
      if (prize) {
        useApp.getState().addSticker(prize.id);
        setReward(prize);
      } else startRound(s, round.target);
    }, ADVANCE_MS);
  };

  const wrong = (picked: string) => {
    if (!round) return;
    wrongInputs.current.push(picked);
    const m = misses + 1;
    setMisses(m);
    if (m >= HINT_AFTER_MISSES) hinted.current = true;
    sfx.boop();
    void cardControls.start({ rotate: [0, -8, 7, -4, 0], transition: { duration: 0.45 } });
    void playSequence(findPrompt(round.target, round.lang));
  };

  const answer = (picked: string) => {
    if (!round || busy.current) return;
    if (picked === round.target) correct();
    else wrong(picked);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!round || busy.current || reward || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); return; }
      const now = Date.now();
      const res = matchKey(e.key, round.target, buffer);
      if (res.kind === 'ignore') return;
      if (now - lastKey.current < KEY_DEBOUNCE_MS) return;
      lastKey.current = now;
      e.preventDefault();
      if (!keyboardSeen && settings.input === 'auto') {
        keyboardSeen = true;
        try { sessionStorage.setItem('fc-kb', '1'); } catch { /* private mode */ }
        if (!coarsePointer()) setUseKeys(true);
      }
      if (res.kind === 'partial') { setBuffer(res.buffer); sfx.pop(); return; }
      setBuffer('');
      if (res.kind === 'correct') answer(round.target);
      else wrong(res.pressed);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const closeReward = () => {
    setReward(null);
    startRound(step, round?.target);
  };

  if (!round) return null;
  const friend = FRIENDS[step % FRIENDS.length];
  const hint = misses >= HINT_AFTER_MISSES;
  const showBubbles = settings.input === 'bubbles' || (settings.input === 'auto' && !useKeys);

  return (
    <div className="scene">
      <TopBar
        left={<><IconButton e="🏠" label={t('home')} onClick={() => go({ id: 'home' })} /><span className="title">{t('hi', { n: displayName })}</span></>}
        right={<><span className="pill"><Emoji e="⭐" /> {stars}</span><IconButton e="📖" label={t('stickerBook')} onClick={() => go({ id: 'book' })} /><IconButton e="🔊" label="Say it again" onClick={() => replay()} /></>}
      />

      {config.strip && (
        <div className="strip">
          {items.map((x, i) => <button key={x} className={i < step ? 'done' : i === step ? 'now' : ''} onClick={() => i !== step && jumpTo(i)} aria-label={`Go to ${x}`}>{x}</button>)}
        </div>
      )}

      <div className="stage">
        <motion.button key={`${round.target}-${step}`} className={`letter-card ${config.showCard ? '' : 'listen'}`} aria-label="Hear it again" onClick={() => replay()}
          initial={{ scale: 0.3, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 13 }}>
          <motion.span animate={cardControls} style={{ display: 'grid', placeItems: 'center' }}>
            {config.showCard
              ? <span className={`glyph ${round.target.length > 1 ? 'two' : ''}`}>{round.target}</span>
              : <span className="glyph"><Emoji e="👂" /></span>}
          </motion.span>
          {config.showCard && isNumber(round.target) && Number(round.target) > 0 && (
            <span className="count" aria-hidden>{Array.from({ length: Number(round.target) }, (_, i) => <Emoji key={i} e={COUNT_THINGS[Number(round.target)]} />)}</span>
          )}
        </motion.button>

        <div className="friend">
          <motion.span className="who" animate={{ y: [0, -8, 0], rotate: [0, 4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}><Emoji e={friend.emoji} label={friend[round.lang]} /></motion.span>
          {config.showCard && <div className="speech">{bubbleText(round.target, round.lang)}</div>}
        </div>

        <div className="hear">
          <button className="btn nav" onClick={goBack} aria-label="Previous" disabled={!sequence && past.current.length === 0}><Emoji e="◀️" /></button>
          <button className="btn" onClick={() => replay('en')}><Emoji e="🔊" /> {t('hearEnglish')}</button>
          <button className="btn" onClick={() => replay('es')}><Emoji e="🔊" /> {t('hearSpanish')}</button>
          {!isNumber(round.target) && <button className="btn" onClick={playSound}><Emoji e="🔤" /> {t('letterSound')}</button>}
          <button className="btn nav" onClick={goNext} aria-label="Next"><Emoji e="▶️" /></button>
        </div>
      </div>

      {showBubbles ? (
        <div className="choices">
          {round.choices.map((c) => (
            <motion.button key={c} className={`choice ${hint && c === round.target ? 'hint' : ''}`} onClick={() => answer(c)} aria-label={c}
              whileTap={{ scale: 0.9 }} animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, delay: Math.random() }}>
              {c}
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="prompt-row">
          <Emoji e="⌨️" /> {t('press')}
          {round.target.length > 1
            ? [...round.target].map((ch, i) => <span key={i} className={`key ${buffer.length > i ? 'filled' : ''} ${hint ? 'hint' : ''}`}>{config.showCard ? ch : '?'}</span>)
            : <span className={`key ${hint ? 'hint' : ''}`}>{config.showCard || hint ? round.target : '?'}</span>}
        </div>
      )}

      <Garden count={stars} />
      <CheerBubble text={cheerText} onDone={() => setCheerText(null)} />
      {reward && profile && (
        <StickerReveal sticker={reward} who={who} lang={uiLang(settings.lang)}
          onBook={() => { setReward(null); go({ id: 'book' }); }} onDone={closeReward} />
      )}
    </div>
  );
}

function bubbleText(item: string, lang: Lang) {
  if (isNumber(item)) {
    const n = Number(item);
    if (n === 0) return lang === 'es' ? <>¡Cero es <em>nada</em>!</> : <>Zero is <em>none</em>!</>;
    return lang === 'es' ? <>¡Cuenta hasta <em>{item}</em>!</> : <>Let's count to <em>{item}</em>!</>;
  }
  const word = wordFor(item, lang);
  if (lang === 'es') return <>{item} de <em>{word[0]}</em> <Emoji e={word[1]} /></>;
  if (item.toUpperCase() === 'Ñ') return <>{item} is a <em>Spanish</em> letter</>;
  return <>{item} is for <em>{word[0]}</em> <Emoji e={word[1]} /></>;
}
