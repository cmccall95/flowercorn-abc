import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Attempt, countsAsActive, prune, type Session } from './analyze';

interface MetricsState {
  attempts: Attempt[];
  sessions: Session[];
  addAttempt: (a: Attempt) => void;
  startSession: (profileId: string) => void;
  addActiveTime: (ms: number) => void;
  reset: (profileId: string) => void;
}

export const useMetrics = create<MetricsState>()(
  persist(
    (set) => ({
      attempts: [],
      sessions: [],
      addAttempt: (a) => set((s) => ({ attempts: [...s.attempts, a] })),
      startSession: (profileId) =>
        set((s) => ({ sessions: [...s.sessions, { profileId, start: Date.now(), end: Date.now(), activeMs: 0 }] })),
      addActiveTime: (ms) =>
        set((s) => {
          const last = s.sessions[s.sessions.length - 1];
          if (!last) return s;
          return { sessions: [...s.sessions.slice(0, -1), { ...last, end: Date.now(), activeMs: last.activeMs + ms }] };
        }),
      reset: (profileId) =>
        set((s) => ({
          attempts: s.attempts.filter((a) => a.profileId !== profileId),
          sessions: s.sessions.filter((x) => x.profileId !== profileId),
        })),
    }),
    {
      name: 'flowercorn-metrics',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.attempts = prune(state.attempts);
        state.sessions = prune(state.sessions).filter((x) => x.activeMs > 0);
      },
    },
  ),
);

/**
 * Track real play time for the active profile: a new session starts when a child is picked, and a second only
 * counts while the page is visible and she touched something in the last minute. Saved every 5 seconds.
 */
export function useSessionTimer(profileId: string | null) {
  useEffect(() => {
    if (!profileId) return;
    useMetrics.getState().startSession(profileId);
    let lastInput = Date.now();
    let pending = 0;
    const onInput = () => { lastInput = Date.now(); };
    const flush = () => {
      if (pending) useMetrics.getState().addActiveTime(pending);
      pending = 0;
    };
    const timer = setInterval(() => {
      if (countsAsActive(Date.now(), lastInput, document.hidden)) pending += 1000;
      if (pending >= 5000) flush();
    }, 1000);
    window.addEventListener('keydown', onInput, true);
    window.addEventListener('pointerdown', onInput, true);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      clearInterval(timer);
      window.removeEventListener('keydown', onInput, true);
      window.removeEventListener('pointerdown', onInput, true);
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [profileId]);
}
