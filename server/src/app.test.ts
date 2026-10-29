import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHandler, type Config } from './app';
import { hashPassword, parseUsers, readSession, signSession, verifyPassword } from './auth';

const ORIGIN = 'https://flowercorn.example';
let server: Server;
let base = '';
let calls: string[] = [];
let users: Map<string, string>;

const config = (): Config => ({
  users,
  sessionSecret: 'x'.repeat(40),
  allowedOrigins: [ORIGIN],
  voiceVersion: 'v1',
  synthesize: async (text) => { calls.push(text); return Buffer.from(`mp3:${text}`); },
  dailyChars: 60,
  cacheBytes: 1024 * 1024,
  secureCookies: true,
});

beforeAll(async () => {
  users = parseUsers(JSON.stringify({ 'Mom@Example.com': await hashPassword('correct horse battery') }));
  const handle = createHandler(config());
  server = createServer((req, res) => void handle(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers }, body: JSON.stringify(body) });

async function signIn(ip: string): Promise<string> {
  const res = await post('/api/login', { email: 'mom@example.com', password: 'correct horse battery' }, { 'do-connecting-ip': ip });
  expect(res.status).toBe(200);
  return res.headers.get('set-cookie')!.split(';')[0];
}

describe('passwords', () => {
  it('hashes and checks, and never stores the password', async () => {
    const hash = await hashPassword('hunter2 hunter2');
    expect(hash).not.toContain('hunter2');
    expect(await verifyPassword('hunter2 hunter2', hash)).toBe(true);
    expect(await verifyPassword('hunter2 hunter3', hash)).toBe(false);
    expect(await verifyPassword('x', 'plain-text')).toBe(false);
  });

  it('refuses a USERS value with a plain password in it', () => {
    expect(() => parseUsers('{"a@b.c":"password123"}')).toThrow(/not a password hash/);
    expect(() => parseUsers('{}')).toThrow();
  });
});

describe('sessions', () => {
  it('rejects forged, tampered, expired and stale tokens', () => {
    const hash = users.get('mom@example.com')!;
    const token = signSession('s'.repeat(40), 'mom@example.com', hash, 1000, 0);
    expect(readSession('s'.repeat(40), token, users, 500)).toBe('mom@example.com');
    expect(readSession('t'.repeat(40), token, users, 500)).toBeNull(); // other secret
    expect(readSession('s'.repeat(40), token, users, 2000)).toBeNull(); // expired
    const [body, sig] = token.split('.');
    const forged = Buffer.from(Buffer.from(body, 'base64url').toString().replace('mom', 'dad')).toString('base64url');
    expect(readSession('s'.repeat(40), `${forged}.${sig}`, users, 500)).toBeNull();
    const changed = new Map([['mom@example.com', `${hash}x`]]);
    expect(readSession('s'.repeat(40), token, changed, 500)).toBeNull(); // password changed since
  });
});

describe('API', () => {
  it('signs in with an HttpOnly, Secure, SameSite=Strict cookie', async () => {
    const res = await post('/api/login', { email: ' MOM@example.com ', password: 'correct horse battery' }, { 'do-connecting-ip': '1.1.1.1' });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api/);
  });

  it('gives the same answer for a wrong email and a wrong password', async () => {
    const a = await post('/api/login', { email: 'nobody@example.com', password: 'whatever whatever' }, { 'do-connecting-ip': '2.2.2.2' });
    const b = await post('/api/login', { email: 'mom@example.com', password: 'whatever whatever' }, { 'do-connecting-ip': '2.2.2.2' });
    expect(a.status).toBe(401);
    expect(await a.json()).toEqual(await b.json());
  });

  it('locks an account after 5 wrong passwords, even from different addresses', async () => {
    for (let i = 0; i < 5; i++) {
      await post('/api/login', { email: 'other@example.com', password: 'nope nope nope' }, { 'do-connecting-ip': `3.3.3.${i}` });
    }
    const res = await post('/api/login', { email: 'other@example.com', password: 'nope nope nope' }, { 'do-connecting-ip': '3.3.4.1' });
    expect(res.status).toBe(429);
  });

  it('limits sign-in attempts from one address', async () => {
    const codes = [];
    for (let i = 0; i < 11; i++) {
      codes.push((await post('/api/login', { email: `x${i}@example.com`, password: 'nope nope nope' }, { 'do-connecting-ip': '4.4.4.4' })).status);
    }
    expect(codes.at(-1)).toBe(429);
  });

  it('refuses requests from other websites and non-JSON posts', async () => {
    expect((await post('/api/login', { email: 'mom@example.com', password: 'correct horse battery' }, { Origin: 'https://evil.example' })).status).toBe(403);
    const noOrigin = await fetch(`${base}/api/logout`, { method: 'POST' });
    expect(noOrigin.status).toBe(403);
    const form = await fetch(`${base}/api/login`, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'text/plain' }, body: 'x' });
    expect(form.status).toBe(415);
  });

  it('refuses oversized requests', async () => {
    const res = await post('/api/login', { email: 'a@b.c', password: 'x'.repeat(5000) }, { 'do-connecting-ip': '5.5.5.5' });
    expect(res.status).toBe(413);
  });

  it('only speaks for signed-in users', async () => {
    expect((await post('/api/speak', { text: 'Hello', lang: 'en' })).status).toBe(401);
    expect((await post('/api/speak', { text: 'Hello', lang: 'en' }, { Cookie: 'fc_session=abc.def' })).status).toBe(401);
    expect((await fetch(`${base}/api/me`)).status).toBe(401);
  });

  it('speaks, caches repeated lines, and keeps to the daily budget', async () => {
    const cookie = await signIn('6.6.6.6');
    calls = [];
    const first = await post('/api/speak', { text: 'Great job, Lily!', lang: 'en' }, { Cookie: cookie });
    expect(first.status).toBe(200);
    expect(first.headers.get('content-type')).toBe('audio/mpeg');
    expect(await first.text()).toBe('mp3:Great job, Lily!');
    await post('/api/speak', { text: 'Great job,   Lily!', lang: 'en' }, { Cookie: cookie });
    expect(calls).toEqual(['Great job, Lily!']);
    // 60 characters a day in this test: a long new line is refused, cached ones still play.
    expect((await post('/api/speak', { text: 'x'.repeat(50), lang: 'en' }, { Cookie: cookie })).status).toBe(429);
    expect((await post('/api/speak', { text: 'Great job, Lily!', lang: 'en' }, { Cookie: cookie })).status).toBe(200);
  });

  it('checks what it is asked to say', async () => {
    const cookie = await signIn('7.7.7.7');
    expect((await post('/api/speak', { text: 'Hi', lang: 'fr' }, { Cookie: cookie })).status).toBe(400);
    expect((await post('/api/speak', { text: '   ', lang: 'en' }, { Cookie: cookie })).status).toBe(400);
    expect((await post('/api/speak', { text: 'x'.repeat(501), lang: 'en' }, { Cookie: cookie })).status).toBe(400);
  });

  it('signs out', async () => {
    const res = await post('/api/logout', {});
    expect(res.headers.get('set-cookie')).toMatch(/fc_session=;.*Max-Age=0/);
  });
});
