import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createHandler } from './app.js';
import { parseUsers } from './auth.js';
import { elevenLabs } from './elevenlabs.js';

// Settings come from the environment. On DigitalOcean App Platform, SESSION_SECRET, USERS and ELEVENLABS_API_KEY are
// encrypted secrets; the rest are plain settings. See server/README.md.
const env = process.env;

function required(name: string): string {
  const v = env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

const sessionSecret = required('SESSION_SECRET');
if (sessionSecret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');

const voices = { en: required('ELEVEN_VOICE_EN'), es: env.ELEVEN_VOICE_ES || required('ELEVEN_VOICE_EN') };
const model = env.ELEVEN_MODEL || 'eleven_multilingual_v2';
const settings = env.ELEVEN_VOICE_SETTINGS ? JSON.parse(env.ELEVEN_VOICE_SETTINGS) : undefined;
// Devices keep audio they've been given; this changes whenever the voice setup does, so they fetch it fresh.
const voiceVersion = createHash('sha256').update(JSON.stringify([voices, model, settings])).digest('base64url').slice(0, 10);

const handle = createHandler({
  users: parseUsers(env.USERS),
  sessionSecret,
  allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  voiceVersion,
  synthesize: elevenLabs({ apiKey: required('ELEVENLABS_API_KEY'), voices, model, settings }),
  dailyChars: Number(env.DAILY_CHARS_PER_USER || 20_000),
  cacheBytes: Number(env.CACHE_MB || 64) * 1024 * 1024,
  secureCookies: env.INSECURE_COOKIES !== '1',
});

const port = Number(env.PORT || 8080);
createServer((req, res) => void handle(req, res)).listen(port, () => console.log(`FlowerCorn API on port ${port}`));
