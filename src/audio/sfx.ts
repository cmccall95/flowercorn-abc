// Little sound effects made with the Web Audio API, so there are no audio files to load or license.
let ctx: AudioContext | null = null;
let volume = 0.8;

export const setSfxVolume = (v: number) => { volume = v; };

/** The shared audio context; created and resumed on demand (it starts working after the first tap). */
export function audio(): AudioContext | null {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const a = audio();
  if (!a || volume <= 0) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = a.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol * volume, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  /** Correct answer: a rising sparkle arpeggio. */
  chime: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.09, 0.45, 'triangle')),
  /** Wrong answer: a soft low boop, never a buzzer. */
  boop: () => tone(220, 0, 0.25, 'sine', 0.12),
  pop: () => tone(880, 0, 0.12, 'triangle', 0.15),
  /** Sticker or set finished: a longer fanfare. */
  fanfare: () => [784, 988, 1175, 1568, 1175, 1568, 2093].forEach((f, i) => tone(f, i * 0.12, 0.5, 'triangle', 0.16)),
  unlock: () => { audio(); },
};
