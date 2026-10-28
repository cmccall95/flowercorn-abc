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
- **Record sounds:** record the real phonics sounds in your own voice (hold the mic, say "mmm"). Until a letter is
  recorded, the device voice makes its best guess.
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

Art: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT). Fonts: Andika (made for early
readers, with the single-story a and g) and Fredoka, both SIL Open Font License.
