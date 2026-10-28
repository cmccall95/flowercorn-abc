import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { GARDEN_FLOWERS } from '../content/friends';
import { Emoji } from './Emoji';

/** Ten seedlings that bloom one by one as she answers. */
export function Garden({ count }: { count: number }) {
  const n = count % 10 || (count > 0 ? 10 : 0);
  return (
    <div className="garden" aria-label={`${n} flowers`}>
      {Array.from({ length: 10 }, (_, i) =>
        i < n ? (
          <motion.span key={`f${i}`} initial={i === n - 1 ? { scale: 0, rotate: -30 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}>
            <Emoji e={GARDEN_FLOWERS[i % GARDEN_FLOWERS.length]} />
          </motion.span>
        ) : (
          <span key={`s${i}`}><Emoji e="🌱" /></span>
        ),
      )}
    </div>
  );
}

export function TopBar({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="topbar">
      <div className="group">{left}</div>
      {right && <div className="group">{right}</div>}
    </header>
  );
}

export function IconButton({ e, label, onClick }: { e: string; label: string; onClick: () => void }) {
  return (
    <button className="icon-btn" aria-label={label} title={label} onClick={onClick}>
      <Emoji e={e} />
    </button>
  );
}

const HOLD_MS = 3000;

/**
 * Grown-ups only: the button has to be held for 3 seconds, which little hands rarely do by accident.
 * Only lifting the finger (or mouse) stops the hold: iPad Safari can cancel a long touch for its own
 * gestures, so cancel events are ignored and the release is watched on the whole window.
 */
export function ParentGate({ label, onOpen }: { label: string; onOpen: () => void }) {
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState(false);
  const holding = useRef(false);
  const started = useRef(0);
  const interval = useRef<number>();
  const hintTimer = useRef<number>();

  const release = () => {
    if (!holding.current) return;
    holding.current = false;
    clearInterval(interval.current);
    setProgress(0);
    setHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(false), 2500);
  };

  const press = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (holding.current) return;
    holding.current = true;
    started.current = performance.now();
    setHint(false);
    clearInterval(interval.current);
    interval.current = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - started.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        holding.current = false;
        clearInterval(interval.current);
        setProgress(0);
        onOpen();
      }
    }, 50);
  };

  useEffect(() => {
    const ends = ['pointerup', 'mouseup', 'touchend'] as const;
    ends.forEach((t) => window.addEventListener(t, release));
    return () => {
      ends.forEach((t) => window.removeEventListener(t, release));
      clearInterval(interval.current);
      clearTimeout(hintTimer.current);
    };
  }, []);

  const r = 14;
  const c = 2 * Math.PI * r;
  const secondsLeft = Math.ceil(((1 - progress) * HOLD_MS) / 1000);
  return (
    <button
      className="gate"
      aria-label={`${label} 3 seconds`}
      onPointerDown={press}
      onTouchStart={press}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.shiftKey) onOpen(); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg viewBox="0 0 36 36" aria-hidden>
        <circle className="track" cx="18" cy="18" r={r} fill="none" strokeWidth="4" />
        <circle className="fill" cx="18" cy="18" r={r} fill="none" strokeWidth="4" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 18 18)" strokeLinecap="round" />
        <text x="18" y="23" textAnchor="middle" fontSize="14">⚙</text>
      </svg>
      {progress > 0 ? `Keep holding… ${secondsLeft}` : hint ? 'Hold for 3 seconds' : label}
    </button>
  );
}
