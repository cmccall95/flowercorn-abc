import { get, set } from 'idb-keyval';
import { create } from 'zustand';
import type { Lang } from '../content/sets';

// The game's main voice: ElevenLabs, through our own server (server/), which holds the API key and checks who's
// signed in. Audio is saved on the device, so a line is only ever fetched once and still plays offline.

type Status = 'checking' | 'in' | 'out' | 'offline' | 'none';

interface AccountState {
  /** in: signed in · out: needs to sign in · offline: couldn't reach the server · none: no server (local build). */
  status: Status;
  email: string;
  voiceVersion: string;
}

export const useAccount = create<AccountState>()(() => ({ status: 'checking', email: '', voiceVersion: '' }));

const api = (path: string) => `/api/${path}`;
const VERSION_KEY = 'cloud-voice-version';

async function call(path: string, body?: unknown): Promise<Response> {
  return fetch(api(path), body === undefined
    ? { credentials: 'same-origin', cache: 'no-store' }
    : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

function signedIn(email: string, voiceVersion: string) {
  useAccount.setState({ status: 'in', email, voiceVersion });
  try { localStorage.setItem(VERSION_KEY, voiceVersion); } catch { /* private mode */ }
}

/** Ask the server who's signed in. Offline, the game keeps going with what's saved on the device. */
export async function checkAccount() {
  try {
    const res = await call('me');
    if (res.ok) { const me = await res.json(); signedIn(me.email, me.voiceVersion); return; }
    // A static copy of the game with no server behind it (local preview).
    if (res.status === 404 || !(res.headers.get('content-type') ?? '').includes('json')) { useAccount.setState({ status: 'none' }); return; }
    useAccount.setState({ status: 'out', email: '' });
  } catch {
    let voiceVersion = '';
    try { voiceVersion = localStorage.getItem(VERSION_KEY) ?? ''; } catch { /* private mode */ }
    useAccount.setState({ status: 'offline', voiceVersion });
  }
}

/** Sign in; resolves to an error message, or '' on success. */
export async function signIn(email: string, password: string): Promise<string> {
  try {
    const res = await call('login', { email, password });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return body.error ?? 'Could not sign in.';
    signedIn(body.email, body.voiceVersion);
    return '';
  } catch {
    return 'Could not reach the server. Check the connection and try again.';
  }
}

export async function signOut() {
  await call('logout', {}).catch(() => {});
  useAccount.setState({ status: 'out', email: '' });
}

/** The cloud voice can be used: signed in, or offline with saved audio. */
export const cloudReady = () => {
  const s = useAccount.getState();
  return s.status === 'in' || (s.status === 'offline' && !!s.voiceVersion);
};

const key = (text: string, lang: Lang) => `cloud:${useAccount.getState().voiceVersion}:${lang}:${text}`;
const pending = new Map<string, Promise<ArrayBuffer | null>>();

/** Audio for a line: saved on this device, or fetched from the server (and saved). Null if unavailable. */
export function cloudAudio(text: string, lang: Lang): Promise<ArrayBuffer | null> {
  const k = key(text, lang);
  let job = pending.get(k);
  if (!job) {
    job = (async () => {
      try {
        const saved = (await get(k)) as ArrayBuffer | undefined;
        if (saved) return saved;
      } catch { /* storage unavailable */ }
      if (useAccount.getState().status !== 'in') return null;
      try {
        const res = await call('speak', { text, lang });
        if (res.status === 401) { useAccount.setState({ status: 'out' }); return null; }
        if (!res.ok) return null;
        const audio = await res.arrayBuffer();
        void set(k, audio).catch(() => {});
        return audio;
      } catch {
        return null;
      }
    })().finally(() => pending.delete(k));
    pending.set(k, job);
  }
  // Each caller gets its own copy: decoding audio consumes the buffer.
  return job.then((a) => (a ? a.slice(0) : null));
}

/** Fetch lines ahead of time so they play instantly. Kept small: each new line costs speech credits. */
export function prefetchCloud(lines: { text: string; lang: Lang }[], max = 30) {
  if (useAccount.getState().status !== 'in') return;
  for (const l of lines.slice(0, max)) void cloudAudio(l.text, l.lang);
}
