import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Passwords are never stored: only scrypt hashes, kept in the USERS secret as {"email": "scrypt$N$r$p$salt$hash"}.
// Sessions are signed tokens in an HttpOnly cookie, so the page's scripts can't read them and nobody can forge one
// without SESSION_SECRET. A password change ends that user's sessions (the token carries a fingerprint of the hash).

const N = 32768;
const R = 8;
const P = 1;
const KEY_LEN = 32;
const MAX_MEM = 64 * 1024 * 1024;

const b64 = (b: Buffer) => b.toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url');

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEY_LEN, { N: n, r, p, maxmem: MAX_MEM }, (err, key) => (err ? reject(err) : resolve(key))));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${N}$${R}$${P}$${b64(salt)}$${b64(await derive(password, salt, N, R, P))}`;
}

/** Checks a password against a stored hash in constant time. Malformed hashes never match. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, n, r, p, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const want = unb64(hash);
  const got = await derive(password, unb64(salt), Number(n), Number(r), Number(p));
  return want.length === got.length && timingSafeEqual(want, got);
}

/** A real hash to check unknown emails against, so a wrong email takes as long as a wrong password. */
let dummy: Promise<string> | null = null;
export const dummyHash = () => (dummy ??= hashPassword(randomBytes(16).toString('hex')));

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** USERS secret → map of email to hash. Throws on anything malformed, so a typo can't silently lock everyone out. */
export function parseUsers(json: string | undefined): Map<string, string> {
  if (!json) throw new Error('USERS is not set');
  const raw = JSON.parse(json) as Record<string, unknown>;
  const users = new Map<string, string>();
  for (const [email, hash] of Object.entries(raw)) {
    if (typeof hash !== 'string' || !hash.startsWith('scrypt$') || hash.split('$').length !== 6) {
      throw new Error(`USERS: the entry for ${email} is not a password hash (use npm run add-user)`);
    }
    users.set(normalizeEmail(email), hash);
  }
  if (!users.size) throw new Error('USERS has no accounts');
  return users;
}

const fingerprint = (hash: string) => createHash('sha256').update(hash).digest('base64url').slice(0, 12);

interface Payload { e: string; x: number; f: string }

export function signSession(secret: string, email: string, hash: string, ttlMs: number, now = Date.now()): string {
  const body = b64(Buffer.from(JSON.stringify({ e: email, x: now + ttlMs, f: fingerprint(hash) } satisfies Payload)));
  return `${body}.${b64(createHmac('sha256', secret).update(body).digest())}`;
}

/** The signed-in email, or null if the token is missing, forged, expired, or from before a password change. */
export function readSession(secret: string, token: string | undefined, users: Map<string, string>, now = Date.now()): string | null {
  if (!token || token.length > 1024) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = createHmac('sha256', secret).update(body).digest();
  const got = unb64(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  let p: Payload;
  try {
    p = JSON.parse(unb64(body).toString('utf8')) as Payload;
  } catch {
    return null;
  }
  const hash = users.get(p.e);
  if (!hash || typeof p.x !== 'number' || p.x < now || p.f !== fingerprint(hash)) return null;
  return p.e;
}
