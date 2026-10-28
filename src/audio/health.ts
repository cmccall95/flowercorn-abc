import { create } from 'zustand';

type Status = 'unknown' | 'ok' | 'failed';

interface AudioHealth {
  /** The device's own voice (used for lines with the child's name, and when a clip is missing). */
  deviceVoice: Status;
  deviceError: string;
  /** The bundled voice clips. */
  clips: Status;
  clipCount: number;
  set: (patch: Partial<Omit<AudioHealth, 'set'>>) => void;
}

/** What's working right now, so the Sound check page and the on-screen warning can say so. */
export const useAudioHealth = create<AudioHealth>()((set) => ({
  deviceVoice: 'unknown',
  deviceError: '',
  clips: 'unknown',
  clipCount: 0,
  set: (patch) => set(patch),
}));

export const reportHealth = (patch: Partial<Omit<AudioHealth, 'set'>>) => useAudioHealth.getState().set(patch);
