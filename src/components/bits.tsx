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

/** Grown-ups only: the button has to be held for 3 seconds, which little hands rarely do by accident. */
export function ParentGate({ label, onOpen }: { label: string; onOpen: () => void }) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);
  const started = useRef(0);

  const stop = () => {
    if (timer.current) cancelAnimationFrame(timer.current);
    timer.current = null;
    setProgress(0);
  };
  const tick = () => {
    const p = Math.min(1, (performance.now() - started.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) { stop(); onOpen(); return; }
    timer.current = requestAnimationFrame(tick);
  };
  useEffect(() => stop, []);

  const r = 14;
  const c = 2 * Math.PI * r;
  return (
    <button
      className="gate"
      aria-label={`${label} 3 seconds`}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); started.current = performance.now(); tick(); }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.shiftKey) onOpen(); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg viewBox="0 0 36 36" aria-hidden>
        <circle className="track" cx="18" cy="18" r={r} fill="none" strokeWidth="4" />
        <circle className="fill" cx="18" cy="18" r={r} fill="none" strokeWidth="4" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 18 18)" strokeLinecap="round" />
        <text x="18" y="23" textAnchor="middle" fontSize="14">⚙</text>
      </svg>
      {label}
    </button>
  );
}
