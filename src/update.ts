import { create } from 'zustand';

export const BUILD = __BUILD__;

interface UpdateState {
  /** A newer version has installed; tapping Update reloads into it. */
  ready: boolean;
  /** Newest version on the website, or null if it couldn't be checked (e.g. offline). */
  latest: string | null;
  checking: boolean;
  apply: () => void;
  check: () => Promise<void>;
}

let registration: ServiceWorkerRegistration | undefined;

export const useUpdate = create<UpdateState>()((set) => ({
  ready: false,
  latest: null,
  checking: false,
  apply: () => location.reload(),
  check: async () => {
    set({ checking: true });
    try {
      await registration?.update();
      const res = await fetch(`${import.meta.env.BASE_URL}version.json?fresh=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) set({ latest: (await res.json()).version });
    } catch {
      // offline: keep what we know
    }
    set({ checking: false });
  },
}));

/**
 * Register the offline copy. A new version installs in the background and takes over right away; when that
 * happens on a page that was already running, show the Update button. Checks now, every 5 minutes, and
 * whenever the app comes back to the front.
 */
export function startUpdates() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) useUpdate.setState({ ready: true });
  });
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .then((r) => {
      registration = r;
      void useUpdate.getState().check();
      setInterval(() => void useUpdate.getState().check(), 5 * 60_000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) void useUpdate.getState().check(); });
    })
    .catch(() => { /* no offline copy; the app still works online */ });
}

/** Compare "0.10.2" style versions. */
export function newerThan(a: string, b: string) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
}
