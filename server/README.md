# FlowerCorn API

A small Node server (no runtime dependencies) that signs grown-ups in and turns the game's lines into speech
with ElevenLabs. The ElevenLabs key lives only here, as an encrypted secret; the game never sees it.

| Route | |
|---|---|
| `GET /api/health` | For the host's health check |
| `GET /api/me` | Who's signed in (401 if nobody) |
| `POST /api/login` | `{email, password}` → session cookie |
| `POST /api/logout` | Ends the session on this device |
| `POST /api/speak` | `{text, lang}` → mp3 (signed in only) |

## Security

- **Passwords** are stored only as scrypt hashes in the `USERS` secret. The server refuses to start if an entry
  looks like a plain password.
- **Sessions** are HMAC-signed tokens in an `HttpOnly; Secure; SameSite=Strict` cookie, so page scripts can't read
  them and nobody can make one without `SESSION_SECRET`. They last 30 days. Changing a password ends that account's
  sessions; changing `SESSION_SECRET` ends everyone's.
- **Guessing passwords**: 10 sign-in tries per IP address and 5 wrong passwords per account in 15 minutes, then
  a 15-minute wait. A wrong email and a wrong password look and take the same.
- **Other websites** can't use a signed-in browser: every POST must come from the game's own address (`Origin`
  check) and be JSON.
- **Cost**: speech needs a signed-in account; 120 requests a minute and `DAILY_CHARS_PER_USER` characters a day
  per account (default 20,000). Lines already made are cached and don't count. Lines are at most 500 characters.
- Request bodies are capped at 4 KB, and errors never include the key or ElevenLabs' responses.

## Settings

| Name | Secret? | |
|---|---|---|
| `SESSION_SECRET` | yes | At least 32 random characters, e.g. `openssl rand -hex 32` |
| `USERS` | yes | `{"email":"scrypt$…", …}` from `npm run add-user` |
| `ELEVENLABS_API_KEY` | yes | From ElevenLabs → Developers → API keys. Give it only text-to-speech access |
| `ELEVEN_VOICE_EN`, `ELEVEN_VOICE_ES` | no | Voice IDs (ElevenLabs → Voices → ⋯ → Copy voice ID) |
| `ELEVEN_MODEL` | no | Default `eleven_multilingual_v2` |
| `ELEVEN_VOICE_SETTINGS` | no | Optional JSON, e.g. `{"stability":0.5,"similarity_boost":0.75,"speed":0.9}` |
| `DAILY_CHARS_PER_USER` | no | Default 20000 |
| `ALLOWED_ORIGINS` | no | The game's address, e.g. `https://flowercorn-xxxxx.ondigitalocean.app` (defaults to the request's host) |

## Adding an account

```sh
cd server && npm ci && npm run build && npm run add-user
```

Paste the current `USERS` value (or nothing), type the email and a password of at least 12 characters (it isn't
shown), and save the printed value as the new `USERS` secret. Removing an account: delete its entry from `USERS`.

## Running locally

Put the settings in `server/.env` (git-ignored), then `npm run dev` here and `npm run dev` in the repo root; the
game at http://localhost:5173 talks to the API through Vite's proxy.
