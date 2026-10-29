# FlowerCorn Land 🌸🦄

A gentle, bilingual (English / Español) ABC and 123 game for little learners, made for a 3-year-old who wants to
"work on the computer".

**Play:** https://cmccall95.github.io/flowercorn-abc/ (add it to a tablet's home screen to play full screen, even offline)

## What she can do

- **Find it:** a letter or number pops up, a friend (unicorns, bunnies, kitties, puppies, dinos…) says its name and
  **sounds it out** ("C! C says /k/, /k/. C is for Cat!"), and she presses the key on a computer or taps the matching
  bubble on a tablet. Big ABC, little abc, and numbers 0–10.
- **Hear it in either language:** the 🔊 English and 🔊 Español buttons under the letter work at any time.
- **Trace it:** follow the numbered dots with a finger; a rainbow trail follows along. Every letter (plus Ñ) and digit.
- **Cheers with her name**, sparkles and a blooming garden for every right answer. Never a buzzer: a wrong answer gets
  a soft boop, a wiggle, and a glowing hint after 3 tries.
- **Sticker book:** every 5 right answers opens a present with a new sticker (48 to collect across Flowers, Unicorns &
  Rainbows, Dinos and Animal Friends). Finishing a whole set earns a gold prize.
- **Levels** (Auto by default): 1 in order with the alphabet strip → 2 in order → 3 random with look-alike letters →
  4 listen-only.

## Grown-up corner

Hold the ⚙️ button on the first screen for 3 seconds.

- **Dashboard:** play time (only counts while she's actually playing), answers, first-try rate, typical time to
  answer, **letters that need practice** (with her usual mix-up, e.g. "often picks b"), mastered letters, a
  per-letter timing chart, and **Export CSV**. At Level 3 her trouble letters come up about twice as often.
- **Settings:** English / Español / Both, keyboard or bubbles, level, voice choice per language with speed and pitch,
  sound volume, calmer animations, break reminder, colors.
- **Letters & sounds:** hear every letter's name and sound as the game plays them, mark them 👍/👎, and record
  your own (one at a time or with the guided **Record all letters**).
- **Players:** add siblings, set "how to say it" so the voice pronounces each name right.

Everything (progress, stickers, stats, recordings) stays on the device. Nothing is sent anywhere.

## Development

```sh
npm install
npm run dev        # http://localhost:5173/flowercorn-abc/
npm test           # unit tests (game rules, speech lines, metrics, tracing)
npm run build      # production build in dist/
npm run preview    # serve the build, then: node e2e/smoke.mjs  (browser smoke test; needs Playwright)
```

Pushing to `main` runs lint, tests and the build, then deploys to GitHub Pages.

### Layout

| Path | What's there |
|---|---|
| `src/content/` | Alphabets, letter names, phonics, picture words, cheers, stickers, friends |
| `src/game/engine.ts` | Pure game rules: order, answer bubbles, key matching, levels |
| `src/audio/` | Speech (Web Speech API), "sound it out" sequences, recorded clips (IndexedDB), sound effects |
| `src/metrics/` | Attempt/session tracking and the trouble-letter analysis |
| `src/trace/` | Stroke data for every glyph and the forgiving tracer |
| `src/screens/` | Welcome, Home, Find, Trace, Sticker book, Grown-up corner |
| `scripts/gen-emoji.mjs` | Bundles the Fluent Emoji art used in `src/` (runs before dev/build) |

### Hosting and the server

The game and its API run together on **DigitalOcean App Platform** (`.do/app.yaml`): the game as a static site,
and `server/` as a small Node service at `/api`. The server signs grown-ups in and makes speech with ElevenLabs;
the ElevenLabs key is an encrypted App Platform secret and never reaches the browser. See
[server/README.md](server/README.md) for the security details, settings, and how to add an account.

### Voice

When signed in, the game's main voice is **ElevenLabs**, reading whole sentences. The voices below are the
fallbacks (offline, or not signed in).

Voices garble very short lines, and a single letter is the shortest line there is. So **letter names and phonics
sounds are separate clips**, joined to short phrases of words with a 200 ms gap ("A" · "is for Apple."). Each one
comes from the first of these that exists:

1. **Your recording**: Grown-up corner → **Letters & sounds** (one letter at a time, or **Record all letters**).
   Silence is trimmed and the volume matched automatically.
2. **A bundled recording** (`public/voice/letters/{en,es}/{name,sound}/`, listed in `index.json`):
   - Spanish names: a native speaker's recordings from Wikimedia Commons, by **Jynus (CC0)**. Not c and z, which
     the speaker says the Spain way (/θ/).
   - Everything else: Kokoro saying the name twice ("A. A.") with the first copy cut off.
   A 👎 in Letters & sounds skips the bundled clip for that letter.
3. **The in-app voice**, saying it twice and keeping the second copy (`src/audio/carrier.ts`).
4. **The device's own voice.**

Words are spoken by **Kokoro-82M** (Apache-2.0), a free open-source voice:

- **In the app** (`src/audio/engine/`): Kokoro runs on the device in a web worker (kokoro-js + ONNX Runtime). It
  downloads once (~90 MB, from Grown-up corner → Settings) and then works offline. English is turned into sounds
  with espeak-ng; Spanish with our own Latin American rules (`spanish.ts`). Everything it makes is saved on the device.
- **Bundled clips** (`public/voice/`): the same voice, pre-made by the **Generate voice clips** workflow, so the game
  talks before the in-app voice is downloaded.
- **Device voice**: the browser's own speech, as a last resort.

All clips are matched to the same loudness so the pieces join evenly. The **Generate voice clips** workflow builds
the letter clips and checks each with a phoneme recognizer (wav2vec2 espeak phonemes,
`facebook/wav2vec2-lv-60-espeak-cv-ft`), writing `scripts/voices/letters-report.md`. The **Check the in-app voice**
workflow does the same for the in-app voice and writes `scripts/voices/engine-report.md`. The reports are a first
pass; listening is the real test.

Spanish letter recordings: Jynus, Wikimedia Commons (CC0),
[Category:Spanish pronunciation of letters](https://commons.wikimedia.org/wiki/Category:Spanish_pronunciation_of_letters).

Art: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT). Fonts: Andika (made for early
readers, with the single-story a and g) and Fredoka, both SIL Open Font License.
