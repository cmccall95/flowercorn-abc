/* eslint-disable react-refresh/only-export-components -- burst() lives beside the bubble it pairs with */
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useApp } from '../state/store';

const colors = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--confetti').split(',').map((c) => c.trim()).filter(Boolean);

/** Sparkle burst; a bigger shower for finishing a set. */
export function burst(big = false) {
  if (useApp.getState().settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const opts = { colors: colors(), shapes: ['circle', 'star'] as confetti.Shape[], disableForReducedMotion: true };
  if (big) {
    confetti({ ...opts, particleCount: 160, spread: 120, startVelocity: 45, origin: { y: 0.6 } });
    setTimeout(() => confetti({ ...opts, particleCount: 80, angle: 60, spread: 70, origin: { x: 0 } }), 250);
    setTimeout(() => confetti({ ...opts, particleCount: 80, angle: 120, spread: 70, origin: { x: 1 } }), 400);
  } else {
    confetti({ ...opts, particleCount: 70, spread: 80, startVelocity: 32, scalar: 1.1, origin: { y: 0.55 } });
  }
}

/** The name-cheer bubble that pops up over the play area. */
export function CheerBubble({ text, onDone }: { text: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(onDone, 1700);
    return () => clearTimeout(t);
  }, [text, onDone]);
  return (
    <div className="overlay">
      <AnimatePresence>
        {text && (
          <motion.div className="cheer-msg" initial={{ scale: 0.3, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
