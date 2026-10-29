import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dummyHash, normalizeEmail, readSession, signSession, verifyPassword } from './auth.js';
import { AudioCache, DailyBudget, RateLimiter } from './limits.js';

export type Lang = 'en' | 'es';

/** Makes speech audio (mp3). Throws if the voice service fails. */
export type Synthesize = (text: string, lang: Lang) => Promise<Buffer>;

export interface Config {
  users: Map<string, string>;
  sessionSecret: string;
  /** Origins allowed to call the API (e.g. https://flowercorn-xxxx.ondigitalocean.app). Empty: the request's own host. */
  allowedOrigins: string[];
  /** Identifies the current voice setup, so devices know when their saved audio is out of date. */
  voiceVersion: string;
  synthesize: Synthesize;
  dailyChars: number;
  cacheBytes: number;
  /** Secure cookies need https; off only for local development. */
  secureCookies: boolean;
}

const COOKIE = 'fc_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BODY = 4096;
const MAX_TEXT = 500;
const LOCK_MINUTES = 15;

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function createHandler(config: Config) {
  // Sign-in: 10 tries per IP and 5 failures per account in 15 minutes, then wait.
  const loginByIp = new RateLimiter(10, LOCK_MINUTES * 60_000);
  const failsByEmail = new RateLimiter(5, LOCK_MINUTES * 60_000);
  const speakByUser = new RateLimiter(120, 60_000);
  const budget = new DailyBudget(config.dailyChars);
  const cache = new AudioCache(config.cacheBytes);
  const inflight = new Map<string, Promise<Buffer>>();

  const cookie = (value: string, maxAgeS: number) =>
    `${COOKIE}=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAgeS}${config.secureCookies ? '; Secure' : ''}`;

  function sessionEmail(req: IncomingMessage): string | null {
    const token = (req.headers.cookie ?? '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    return readSession(config.sessionSecret, token, config.users);
  }

  function requireUser(req: IncomingMessage): string {
    const email = sessionEmail(req);
    if (!email) throw new HttpError(401, 'Please sign in.');
    return email;
  }

  /** Blocks other sites from making a signed-in browser call the API (on top of SameSite=Strict cookies). */
  function checkOrigin(req: IncomingMessage) {
    const origin = req.headers.origin;
    const allowed = config.allowedOrigins.length ? config.allowedOrigins : [`https://${req.headers.host}`];
    if (!origin || !allowed.includes(origin)) throw new HttpError(403, 'Not allowed.');
  }

  async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
    if (!(req.headers['content-type'] ?? '').startsWith('application/json')) throw new HttpError(415, 'Expected JSON.');
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += (chunk as Buffer).length;
      if (size > MAX_BODY) throw new HttpError(413, 'Too large.');
      chunks.push(chunk as Buffer);
    }
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
      return body;
    } catch {
      throw new HttpError(400, 'Bad request.');
    }
  }

  async function login(req: IncomingMessage, res: ServerResponse) {
    const ip = clientIp(req);
    const body = await readJson(req);
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password || email.length > 200 || password.length > 200) throw new HttpError(400, 'Enter your email and password.');
    if (!loginByIp.take(ip) || failsByEmail.blocked(email)) throw new HttpError(429, `Too many tries. Wait ${LOCK_MINUTES} minutes and try again.`);
    const hash = config.users.get(email);
    // Unknown emails are checked against a dummy hash, so the answer takes the same time either way.
    const ok = await verifyPassword(password, hash ?? (await dummyHash()));
    if (!hash || !ok) {
      failsByEmail.add(email);
      throw new HttpError(401, 'That email and password don’t match.');
    }
    failsByEmail.clear(email);
    res.setHeader('Set-Cookie', cookie(signSession(config.sessionSecret, email, hash, SESSION_MS), SESSION_MS / 1000));
    send(res, 200, { email, voiceVersion: config.voiceVersion });
  }

  async function speak(req: IncomingMessage, res: ServerResponse) {
    const email = requireUser(req);
    const body = await readJson(req);
    const lang = body.lang === 'en' || body.lang === 'es' ? body.lang : null;
    // Control characters out, spaces tidied: only plain words go to the voice service.
    const text = typeof body.text === 'string' ? body.text.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim() : '';
    if (!lang || !text || text.length > MAX_TEXT) throw new HttpError(400, 'Bad request.');
    if (!speakByUser.take(email)) throw new HttpError(429, 'Slow down a little.');

    const key = createHash('sha256').update(`${config.voiceVersion}\n${lang}\n${text}`).digest('hex');
    let audio = cache.get(key);
    if (!audio) {
      let job = inflight.get(key);
      if (!job) {
        if (!budget.spend(email, text.length)) throw new HttpError(429, 'Today’s speech budget is used up.');
        job = config.synthesize(text, lang)
          .catch((err) => { budget.refund(email, text.length); throw err; })
          .finally(() => inflight.delete(key));
        inflight.set(key, job);
      }
      try {
        audio = await job;
      } catch (err) {
        console.error('voice service failed:', err instanceof Error ? err.message : err);
        throw new HttpError(502, 'The voice is unavailable right now.');
      }
      cache.set(key, audio);
    }
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': audio.length, 'Cache-Control': 'private, max-age=86400' });
    res.end(audio);
  }

  return async function handle(req: IncomingMessage, res: ServerResponse) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    const path = (req.url ?? '').split('?')[0];
    const route = `${req.method} ${path}`;
    try {
      if (req.method === 'POST') checkOrigin(req);
      switch (route) {
        case 'GET /api/health': return send(res, 200, { ok: true });
        case 'GET /api/me': return send(res, 200, { email: requireUser(req), voiceVersion: config.voiceVersion });
        case 'POST /api/login': return await login(req, res);
        case 'POST /api/logout':
          res.setHeader('Set-Cookie', cookie('', 0));
          return send(res, 200, { ok: true });
        case 'POST /api/speak': return await speak(req, res);
        default: throw new HttpError(404, 'Not found.');
      }
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error(err);
      return send(res, 500, { error: 'Something went wrong.' });
    }
  };
}

function send(res: ServerResponse, status: number, body: unknown) {
  if (res.headersSent) return;
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

/** The caller's IP. App Platform puts the real one in do-connecting-ip; other proxy headers can be forged. */
function clientIp(req: IncomingMessage): string {
  const fromDo = req.headers['do-connecting-ip'];
  return (typeof fromDo === 'string' && fromDo) || req.socket.remoteAddress || 'unknown';
}
