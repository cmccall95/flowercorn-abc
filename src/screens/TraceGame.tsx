import { useEffect, useMemo, useRef, useState } from 'react';
import { drawPrompt, introSequence, nameLine, playSequence } from '../audio/sayLetter';
import { sfx } from '../audio/sfx';
import { burst, CheerBubble } from '../components/Celebration';
import { Emoji } from '../components/Emoji';
import { IconButton, TopBar } from '../components/bits';
import { StickerReveal } from '../components/StickerReveal';
import { cheer } from '../content/cheers';
import { FRIENDS } from '../content/friends';
import { type ActivityId, itemsFor, type Lang } from '../content/sets';
import { pickSticker, STICKER_EVERY, type Sticker } from '../content/stickers';
import { tFor, uiLang, useT } from '../i18n/ui';
import { useMetrics } from '../metrics/store';
import type { Go } from '../nav';
import { toPath, type Pt } from '../trace/geometry';
import { GLYPHS } from '../trace/glyphs';
import { isDone, startTrace, traceSegment, type TraceState } from '../trace/tracer';
import { spokenNameOf, useActiveProfile, useApp } from '../state/store';

const HINT_IDLE_MS = 20_000;

export function TraceGame({ set, go }: { set: ActivityId; go: Go }) {
  const t = useT();
  const settings = useApp((s) => s.settings);
  const profile = useActiveProfile();
  const owned = useApp((s) => (s.activeId ? s.stickers[s.activeId] ?? [] : []));
  const setLang: Lang = settings.lang === 'en' ? 'en' : 'es';
  // Ten digits to trace; "10" is just 1 and 0.
  const items = useMemo(() => itemsFor(set, setLang).filter((x) => GLYPHS[x]), [set, setLang]);
  const [index, setIndex] = useState(0);
  const item = items[index % items.length];
  const lang: Lang = settings.lang === 'both' ? (index % 2 ? 'es' : 'en') : settings.lang;
  const name = spokenNameOf(profile);

  const [trace, setTraceState] = useState<TraceState>(() => startTrace(GLYPHS[item]));
  // Pointer events can arrive faster than React re-renders, so the latest state lives in a ref too.
  const traceRef = useRef(trace);
  const setTrace = (t: TraceState) => { traceRef.current = t; setTraceState(t); };
  const [cheerText, setCheerText] = useState<string | null>(null);
  const [reward, setReward] = useState<Sticker | null>(null);
  const [idle, setIdle] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const trail = useRef<SVGGElement>(null);
  const last = useRef<Pt | null>(null);
  const hue = useRef(0);
  const shownAt = useRef(Date.now());
  const idleTimer = useRef<number>();

  const resetIdle = () => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), HINT_IDLE_MS);
  };

  useEffect(() => {
    setTrace(startTrace(GLYPHS[item]));
    trail.current?.replaceChildren();
    shownAt.current = Date.now();
    resetIdle();
    void playSequence(drawPrompt(item, lang));
    return () => clearTimeout(idleTimer.current);
     
  }, [item, lang]);

  const toBox = (e: React.PointerEvent): Pt => {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return [p.x, p.y];
  };

  const drawTrail = (a: Pt, b: Pt) => {
    hue.current = (hue.current + 7) % 360;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(a[0])); line.setAttribute('y1', String(a[1]));
    line.setAttribute('x2', String(b[0])); line.setAttribute('y2', String(b[1]));
    line.setAttribute('stroke', `hsl(${hue.current} 90% 72%)`);
    line.setAttribute('stroke-width', '6');
    line.setAttribute('stroke-linecap', 'round');
    trail.current?.appendChild(line);
  };

  const finish = () => {
    if (!profile) return;
    useMetrics.getState().addAttempt({
      profileId: profile.id, activity: 'trace', lang, level: 1, target: item, shownAt: shownAt.current,
      answeredAt: Date.now(), wrongInputs: [], hintShown: false, replays: 0,
    });
    const line = cheer('{n}', lang);
    setCheerText(line.replace('{n}', profile.name));
    sfx.chime();
    burst();
    void playSequence([{ kind: 'say', text: line.replace('{n}', name), lang }, ...nameLine(item, lang)]);
    const due = useApp.getState().addStar(STICKER_EVERY);
    setTimeout(() => {
      trail.current?.replaceChildren();
      if (due) {
        const s = pickSticker(owned);
        useApp.getState().addSticker(s.id);
        setReward(s);
      } else setIndex((i) => i + 1);
    }, 2200);
  };

  const onMove = (p: Pt) => {
    const from = last.current ?? p;
    drawTrail(from, p);
    last.current = p;
    const res = traceSegment(traceRef.current, from, p);
    if (res.state !== traceRef.current) setTrace(res.state);
    if (res.event !== 'none') resetIdle();
    if (res.event === 'stroke-done') sfx.pop();
    if (res.event === 'glyph-done') finish();
  };

  const strokes = GLYPHS[item];
  const done = isDone(trace);
  const lower = item !== item.toUpperCase();
  const friend = FRIENDS[index % FRIENDS.length];

  return (
    <div className="scene">
      <TopBar
        left={<><IconButton e="🏠" label={t('home')} onClick={() => go({ id: 'home' })} /><span className="title"><Emoji e={friend.emoji} /> {tFor(uiLang(settings.lang), 'letsDraw', { x: item })}</span></>}
        right={<IconButton e="🔊" label="Hear it" onClick={() => void playSequence(introSequence(item, lang))} />}
      />
      <div className="trace-area">
        <svg ref={svg} className="trace-pad" viewBox="0 0 100 140" role="img" aria-label={`Trace ${item}`}
          onPointerDown={(e) => { if (done) return; e.currentTarget.setPointerCapture(e.pointerId); last.current = toBox(e); onMove(last.current); }}
          onPointerMove={(e) => { if (last.current && !done) onMove(toBox(e)); }}
          onPointerUp={() => { last.current = null; }}
          onPointerCancel={() => { last.current = null; }}>
          <defs>
            <linearGradient id="rainbow" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#ff9ecf" /><stop offset=".33" stopColor="#ffe07a" /><stop offset=".66" stopColor="#8fe3cf" /><stop offset="1" stopColor="#b79cff" />
            </linearGradient>
          </defs>
          {/* writing lines: top, middle (x-height), baseline */}
          <g stroke="var(--p3)" strokeWidth="0.8" opacity="0.6">
            <line x1="4" x2="96" y1="20" y2="20" strokeDasharray="2 3" />
            <line x1="4" x2="96" y1={lower ? 65 : 70} y2={lower ? 65 : 70} strokeDasharray="2 3" />
            <line x1="4" x2="96" y1="120" y2="120" />
          </g>
          {strokes.map((s, i) => (
            i < trace.stroke || done
              ? <path key={i} d={toPath(s)} stroke="url(#rainbow)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              : <path key={i} d={toPath(s)} stroke={i === trace.stroke ? 'var(--p2)' : 'color-mix(in srgb, var(--ink) 18%, transparent)'} strokeWidth="5" strokeDasharray="0.1 7" strokeLinecap="round" fill="none" />
          ))}
          <g ref={trail} />
          {!done && <StartMarker stroke={strokes[trace.stroke]} n={trace.stroke + 1} idle={idle} />}
        </svg>
      </div>
      <div className="trace-pick">
        <button className="btn small" aria-label="Previous" onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}><Emoji e="◀️" /></button>
        <span className="now">{item}</span>
        <button className="btn small" aria-label={t('next')} onClick={() => setIndex((i) => i + 1)}><Emoji e="▶️" /></button>
        <button className="btn small" onClick={() => { setTrace(startTrace(strokes)); trail.current?.replaceChildren(); }}><Emoji e="🔄" /> {t('again')}</button>
      </div>
      <CheerBubble text={cheerText} onDone={() => setCheerText(null)} />
      {reward && (
        <StickerReveal sticker={reward} name={name} lang={uiLang(settings.lang)}
          onBook={() => { setReward(null); go({ id: 'book' }); }} onDone={() => { setReward(null); setIndex((i) => i + 1); }} />
      )}
    </div>
  );
}

/** Numbered start dot plus an arrow showing which way to go. Pulses harder when she's been stuck a while. */
function StartMarker({ stroke, n, idle }: { stroke: Pt[]; n: number; idle: boolean }) {
  const [a] = stroke;
  const b = stroke.find((p) => Math.hypot(p[0] - a[0], p[1] - a[1]) > 4) ?? stroke[1];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [ux, uy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const [ax, ay] = [a[0] + ux * 15, a[1] + uy * 15];
  return (
    <g pointerEvents="none">
      <polygon points={`${ax + ux * 5},${ay + uy * 5} ${ax - uy * 4},${ay + ux * 4} ${ax + uy * 4},${ay - ux * 4}`} fill="var(--p1)" className={idle ? 'start-dot' : ''} />
      <circle cx={a[0]} cy={a[1]} r="6.5" fill="var(--p2)" className="start-dot" />
      <text x={a[0]} y={a[1] + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="white" fontFamily="Fredoka, sans-serif">{n}</text>
    </g>
  );
}
