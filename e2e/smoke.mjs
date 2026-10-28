// Browser smoke test: node e2e/smoke.mjs [baseUrl]. Speech is stubbed so we can check what would be said.
import { createRequire } from 'node:module';
// Uses a project or globally installed Playwright (npm i -D playwright, then npx playwright install chromium).
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4173/flowercorn-abc/';
const OUT = process.env.SHOTS ?? 'e2e/shots';
mkdirSync(OUT, { recursive: true });

const stubSpeech = () => {
  window.__spoken = [];
  const fake = {
    speaking: false, pending: false, paused: false,
    getVoices: () => [{ name: 'Test EN', lang: 'en-US' }, { name: 'Test ES', lang: 'es-MX' }],
    speak(u) { window.__spoken.push({ text: u.text, lang: u.lang }); setTimeout(() => { u.onstart && u.onstart(); u.onend && u.onend(); }, 5); },
    cancel() {}, resume() {}, addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
};

const fail = (msg) => { console.error('FAIL:', msg); process.exitCode = 1; };
const check = (cond, msg) => (cond ? console.log('ok -', msg) : fail(msg));
const spoken = (page) => page.evaluate(() => window.__spoken.map((s) => `${s.lang}|${s.text}`));

const browser = await chromium.launch();
const errors = [];

// ---------- laptop: keyboard play ----------
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(stubSpeech);
// Laptop run: no bundled clips, so every line goes through the (stubbed) device voice and can be checked as text.
await page.route(/\/voice\/index\.json/, (r) => r.fulfill({ json: {} }));
await page.goto(BASE);
await page.screenshot({ path: `${OUT}/01-welcome-empty.png` });
await page.getByRole('button', { name: /New player/ }).click();
await page.fill('#p-name', 'Lily');
await page.screenshot({ path: `${OUT}/02-new-player.png` });
await page.getByRole('button', { name: 'Save' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/03-home.png` });
check((await spoken(page)).some((s) => s.endsWith('|Lily')) && (await spoken(page)).some((s) => s.endsWith('|Pick a game!')), 'greets her by name');

await page.getByRole('button', { name: /^ABC .*Find/ }).click();
await page.waitForTimeout(1800);
await page.screenshot({ path: `${OUT}/04-find-keyboard-start.png` });
check((await spoken(page)).some((s) => s.endsWith('|Ey is for Apple.')), 'introduces A: name, pause, picture word');
await page.getByRole('button', { name: 'Next' }).click();
await page.waitForTimeout(1600);
check((await spoken(page)).some((s) => s.endsWith('|B is for Butterfly.')), '▶ moves on to B');
await page.getByRole('button', { name: 'Previous' }).click();
await page.waitForTimeout(300);
check((await page.textContent('.letter-card'))?.trim() === 'A', '◀ goes back to A');
await page.getByRole('button', { name: 'Go to C' }).click();
await page.waitForTimeout(300);
check((await page.textContent('.letter-card'))?.trim() === 'C', 'tapping C in the strip jumps there');
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(300);
check((await page.textContent('.letter-card'))?.trim() === 'A', 'arrow keys move back');

await page.keyboard.press('b');
await page.waitForTimeout(400);
check((await spoken(page)).some((s) => s.includes('Find ey!')), 'wrong key asks again gently');
// After a key press on a laptop, the keyboard prompt replaces bubbles.
check(await page.locator('.prompt-row').isVisible(), 'shows the keyboard prompt after a key press');
await page.keyboard.press('a');
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/05-correct.png` });
check((await spoken(page)).some((s) => s.endsWith('|Lily')) && (await spoken(page)).some((s) => /\|Ey!$/.test(s)), 'cheers with her name, then says the letter');

await page.getByRole('button', { name: /Español/ }).click();
await page.waitForTimeout(1600);
const es = (await spoken(page)).filter((s) => s.startsWith('es-MX'));
check(es.length > 0, `Español button says it in Spanish (${es.join(' / ')})`);
await page.getByRole('button', { name: /Letter sound/ }).click();
await page.waitForTimeout(1500);
check((await spoken(page)).some((s) => / says$/.test(s)), 'Letter sound button plays the phonics sound');

for (const k of ['b', 'c', 'd']) { await page.waitForTimeout(1800); await page.keyboard.press(k); }
await page.waitForTimeout(1800);
await page.keyboard.press('e');
await page.waitForTimeout(2200);
check(await page.getByRole('dialog').isVisible(), 'a present appears after 5 right answers');
await page.screenshot({ path: `${OUT}/06-present.png` });
await page.getByRole('button', { name: /Tap the present/ }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/07-sticker.png` });
await page.getByRole('button', { name: /See my book/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/08-book.png` });
check((await page.locator('.slot:not(.empty)').count()) + (await page.locator('.book-tabs').count()) >= 1, 'sticker book opens');

await page.reload();
await page.getByRole('button', { name: /Lily/ }).click();
await page.getByRole('button', { name: /Sticker book/ }).click();
const owned = await page.locator('.pill').first().textContent();
check(owned?.startsWith('1 /'), `sticker is still there after reload (${owned})`);

// ---------- tracing ----------
await page.getByRole('button', { name: 'Home' }).click();
await page.getByRole('button', { name: /^ABC .*Trace/ }).click();
await page.waitForTimeout(400);
const beforeTrace = (await spoken(page)).length;
await page.screenshot({ path: `${OUT}/09-trace-start.png` });
const box = await page.locator('.trace-pad').boundingBox();
const toScreen = ([x, y]) => [box.x + (x / 100) * box.width, box.y + (y / 140) * box.height];
const A = [[[50, 20], [18, 120]], [[50, 20], [82, 120]], [[30, 82], [70, 82]]];
for (const [i, stroke] of A.entries()) {
  const [sx, sy] = toScreen(stroke[0]);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let t = 1; t <= 20; t++) {
    const [ex, ey] = toScreen([stroke[0][0] + ((stroke[1][0] - stroke[0][0]) * t) / 20, stroke[0][1] + ((stroke[1][1] - stroke[0][1]) * t) / 20]);
    await page.mouse.move(ex, ey);
  }
  await page.mouse.up();
  if (i === 0) await page.screenshot({ path: `${OUT}/10-trace-stroke1.png` });
}
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/11-trace-done.png` });
const afterTrace = (await spoken(page)).slice(beforeTrace);
check(afterTrace.some((s) => s.endsWith('|Lily')), `tracing A gets a cheer with her name (${afterTrace.join(' / ')})`);

// ---------- grown-up dashboard ----------
await page.getByRole('button', { name: 'Home' }).click();
await page.getByRole('button', { name: 'Change player' }).click();
const gate = page.getByRole('button', { name: /Grown-ups: hold/ });
const g = await gate.boundingBox();
await page.mouse.move(g.x + 10, g.y + 10);
await page.mouse.down();
await page.waitForTimeout(3300);
await page.mouse.up();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/12-dashboard.png`, fullPage: true });
const dash = await page.textContent('.parent');
check(/answers/.test(dash) && /Needs practice/.test(dash), 'dashboard shows stats');
await page.getByRole('tab', { name: /Settings/ }).click();
const soundCheck = await page.textContent('.settings-grid');
check(/Sound check/.test(soundCheck) && /This device's voice\s*working/.test(soundCheck), 'Sound check reports the device voice working');
await page.screenshot({ path: `${OUT}/13-settings.png`, fullPage: true });
check(/In-app voice/.test(soundCheck) && /Download voice/.test(soundCheck), 'Settings offers the in-app voice download');
await page.getByRole('tab', { name: /Fix letters/ }).click();
check(/Download it above first/.test(await page.textContent('.parent')), 'Fix letters asks for the in-app voice first');
await page.getByRole('tab', { name: /What's new/ }).click();
await page.screenshot({ path: `${OUT}/14b-whats-new.png`, fullPage: true });
const news = await page.textContent('.parent');
check(/Version \d+\.\d+\.\d+/.test(news) && /you're on this one/.test(news), "What's new lists versions and marks the current one");
check(/You're on the newest version/.test(news), 'says the running version is the newest');
await page.getByRole('tab', { name: /Record sounds/ }).click();
await page.screenshot({ path: `${OUT}/14-record.png`, fullPage: true });

// ---------- tablet: bubbles, Spanish ----------
const tab = await browser.newPage({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });
tab.on('pageerror', (e) => errors.push(e.message));
await tab.addInitScript(stubSpeech);
// Tablet run: real bundled clips.
const clips = [];
tab.on('request', (r) => { if (r.url().includes('/voice/') && r.url().endsWith('.mp3')) clips.push(r.url()); });
await tab.goto(BASE);
await tab.getByRole('button', { name: 'Español', exact: true }).click();
await tab.getByRole('button', { name: /Nuevo jugador/ }).tap();
await tab.fill('#p-name', 'Lily');
await tab.getByRole('button', { name: 'Save' }).tap();
await tab.getByRole('button', { name: /^123 .*Busca/ }).tap();
await tab.waitForTimeout(600);
await tab.screenshot({ path: `${OUT}/15-tablet-numbers-es.png` });
check(await tab.locator('.choice').count() === 3, 'tablet shows 3 bubbles at level 1');
check(clips.some((u) => u.includes('/voice/es/intro-n0-')) || (await spoken(tab)).some((s) => s.includes('¡Cero!')), 'numbers start at zero in Spanish (bundled clip or device voice)');
await tab.locator('.choice', { hasText: /^0$/ }).tap({ force: true });
await tab.waitForTimeout(3500);
check((await spoken(tab)).some((s) => s.includes('Lily') && s.startsWith('es-MX')), 'Spanish cheer with her name');
await tab.waitForTimeout(1600);
await tab.screenshot({ path: `${OUT}/16-tablet-next.png` });
await tab.goto(BASE);
await tab.getByRole('button', { name: /Lily/ }).tap();
await tab.getByRole('button', { name: /^abc .*Busca/ }).tap();
await tab.waitForTimeout(600);
await tab.screenshot({ path: `${OUT}/17-tablet-lower-es.png` });

const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
phone.on('pageerror', (e) => errors.push(e.message));
await phone.addInitScript(stubSpeech);
await phone.goto(BASE);
await phone.getByRole('button', { name: /New player/ }).tap();
await phone.fill('#p-name', 'Lily');
await phone.getByRole('button', { name: 'Save' }).tap();
await phone.screenshot({ path: `${OUT}/18-phone-home.png` });
await phone.getByRole('button', { name: /^ABC .*Find/ }).tap();
await phone.waitForTimeout(600);
await phone.screenshot({ path: `${OUT}/19-phone-find.png` });
const sw = await phone.evaluate(() => document.documentElement.scrollWidth);
check(sw <= 390, `no sideways scroll on a phone (${sw}px)`);

// ---------- Samsung-style phone: no device voices at all, so everything must come from clips ----------
const sam = await browser.newPage({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
sam.on('pageerror', (e) => errors.push(e.message));
await sam.addInitScript(() => {
  window.__spoken = [];
  Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [], speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onerror && u.onerror({ error: 'synthesis-failed' }), 5); }, cancel() {}, resume() {}, addEventListener() {}, removeEventListener() {} } });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
});
const samClips = [];
sam.on('request', (r) => { if (r.url().endsWith('.mp3')) samClips.push(r.url().split('/voice/')[1]); });
await sam.goto(BASE);
await sam.getByRole('button', { name: /New player/ }).tap();
await sam.fill('#p-name', 'Lily');
await sam.getByRole('button', { name: 'Save' }).tap();
await sam.waitForTimeout(800);
check(samClips.some((c) => c.startsWith('en/p-')), `greeting plays from clips with no device voice (${samClips.join(', ')})`);
await sam.getByRole('button', { name: /^ABC .*Find/ }).tap();
await sam.waitForTimeout(2500);
check(samClips.some((c) => c.startsWith('en/intro-ua-')) && samClips.some((c) => c.startsWith('en/word-a-')), 'letter A plays name clip, then picture-word clip');
const before = samClips.length;
await sam.locator('.choice', { hasText: /^A$/ }).tap({ force: true });
await sam.waitForTimeout(1500);
check(samClips.slice(before).some((c) => c.startsWith('en/p-')), 'cheer plays from clips with no device voice');

check(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
