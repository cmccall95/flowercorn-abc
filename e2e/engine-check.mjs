// Downloads the in-app voice in a real browser, has it say every letter line, and saves the audio for checking.
// Usage: node e2e/engine-check.mjs <app url> <out dir>    (needs Playwright; run on a machine with internet)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => console.log(`console.${m.type()}:`, m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('requestfailed', (r) => console.log('requestfailed:', r.url(), r.failure()?.errorText));
page.on('worker', (w) => console.log('worker started:', w.url()));
await page.goto(url);
await page.waitForFunction(() => window.__fcEngine);

const t0 = Date.now();
await page.evaluate(() => window.__fcEngine.start());
await page.waitForFunction(() => ['ready', 'failed'].includes(window.__fcEngine.state().status), null, { timeout: 15 * 60_000, polling: 1000 });
const state = await page.evaluate(() => window.__fcEngine.state());
const loadSeconds = (Date.now() - t0) / 1000;
console.log('voice', state.status, state.error || '', `${loadSeconds.toFixed(1)}s`);
if (state.status !== 'ready') process.exit(1);

const timings = [];
const letters = { en: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], es: [...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'] };
for (const [lang, list] of Object.entries(letters)) {
  for (const letter of list) {
    // The two lines a letter is introduced with: "A." … "A is for Apple."
    const lines = await page.evaluate(([l, lg]) => {
      const fc = window.__fcEngine;
      return fc.introSequence(l, lg).filter((s) => s.engine).map((s) => fc.resolvePieces(s.engine, lg));
    }, [letter, lang]);
    for (const [i, parts] of lines.entries()) {
      const t = Date.now();
      const wav = await page.evaluate(([p, lg]) => window.__fcEngine.wavBase64(p, lg), [parts, lang]);
      timings.push((Date.now() - t) / 1000);
      const name = `${lang}-${letter === 'Ñ' ? 'NY' : letter}-${i === 0 ? 'name' : 'word'}`;
      writeFileSync(`${out}/${name}.wav`, Buffer.from(wav, 'base64'));
      writeFileSync(`${out}/${name}.json`, JSON.stringify(parts));
    }
  }
}
// Experiment: the same letter names said a few different ways, to find the clearest (see engine-report.md).
const VARIANTS = {
  plain: (n) => [n, { text: '.' }],
  pause: (n) => [{ text: '… ' }, n, { text: '.' }],
  bang: (n) => [n, { text: '!' }],
  twice: (n) => [n, { text: '. ' }, n, { text: '.' }],
};
for (const [lang, list] of Object.entries(letters)) {
  for (const letter of list) {
    const name = await page.evaluate(([l, lg]) => window.__fcEngine.resolvePieces([{ item: l, long: false }], lg)[0], [letter, lang]);
    for (const [v, make] of Object.entries(VARIANTS)) {
      const wav = await page.evaluate(([p, lg]) => window.__fcEngine.wavBase64(p, lg), [make(name), lang]);
      writeFileSync(`${out}/exp-${v}-${lang}-${letter === 'Ñ' ? 'NY' : letter}.wav`, Buffer.from(wav, 'base64'));
    }
  }
}

// A cheer with a name, in both languages.
for (const [lang, text] of [['en', 'Great job, Charlotte!'], ['es', '¡Muy bien, Charlotte!']]) {
  const wav = await page.evaluate(([t, lg]) => window.__fcEngine.wavBase64([{ text: t }], lg), [text, lang]);
  writeFileSync(`${out}/${lang}-cheer.wav`, Buffer.from(wav, 'base64'));
}
const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
writeFileSync(`${out}/timing.json`, JSON.stringify({ loadSeconds, lines: timings.length, avgSeconds: avg, maxSeconds: Math.max(...timings) }));
console.log(`made ${timings.length} lines, ${avg.toFixed(2)}s each on average`);
await browser.close();
