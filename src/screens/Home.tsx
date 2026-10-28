import { phrase, playSequence } from '../audio/sayLetter';
import { SPOKEN, type SpokenKey } from '../content/phrases';
import { sfx } from '../audio/sfx';
import { Emoji } from '../components/Emoji';
import { Garden, IconButton, TopBar } from '../components/bits';
import type { ActivityId, Lang } from '../content/sets';
import { STICKERS } from '../content/stickers';
import { uiLang, useT } from '../i18n/ui';
import type { Go, Screen } from '../nav';
import { useActiveProfile, useApp } from '../state/store';

const stars = (level: number) => '⭐'.repeat(Math.min(level, 3)) + '☆'.repeat(Math.max(0, 3 - level));

export function Home({ go }: { go: Go }) {
  const t = useT();
  const profile = useActiveProfile();
  const settings = useApp((s) => s.settings);
  const progress = useApp((s) => (s.activeId ? s.progress[s.activeId] : undefined));
  const starCount = useApp((s) => (s.activeId ? s.stars[s.activeId] ?? 0 : 0));
  const owned = useApp((s) => (s.activeId ? s.stickers[s.activeId]?.length ?? 0 : 0));
  const setLang: Lang = settings.lang === 'en' ? 'en' : 'es';
  const lang = uiLang(settings.lang);
  const level = (a: ActivityId) => progress?.[`${a}:${setLang}`]?.level ?? 1;

  const open = (screen: Screen, spoken: SpokenKey) => {
    sfx.pop();
    void playSequence(phrase(SPOKEN[lang][spoken], lang));
    go(screen);
  };
  const key = (verb: 'find' | 'trace', a: ActivityId) =>
    `${verb}${a === 'upper' ? 'Upper' : a === 'lower' ? 'Lower' : 'Numbers'}` as SpokenKey;

  const find = (a: ActivityId, glyphs: string, flower: string) => (
    <button className="card" onClick={() => open({ id: 'find', activity: a }, key('find', a))}>
      <span className="glyphs">{glyphs}</span>
      <span><Emoji e={flower} /> {t('find')}</span>
      <span className="stars" aria-label={`Level ${level(a)}`}>{stars(level(a))}</span>
    </button>
  );
  const trace = (a: ActivityId, glyphs: string) => (
    <button className="card" onClick={() => open({ id: 'trace', set: a }, key('trace', a))}>
      <span className="glyphs">{glyphs}</span>
      <span><Emoji e="✏️" /> {t('trace')}</span>
    </button>
  );

  return (
    <div className="scene">
      <TopBar
        left={<><IconButton e={profile?.avatar ?? '🦄'} label="Change player" onClick={() => go({ id: 'welcome' })} /><span className="title">{t('hi', { n: profile?.name ?? '' })}</span></>}
        right={<span className="pill"><Emoji e="⭐" /> {starCount}</span>}
      />
      <div className="center-col">
        <div className="home-grid">
          {find('upper', 'ABC', '🌷')}
          {find('lower', 'abc', '🌼')}
          {find('numbers', '123', '🐣')}
          {trace('upper', 'ABC')}
          {trace('lower', 'abc')}
          {trace('numbers', '123')}
        </div>
        <button className="card" style={{ flexDirection: 'row', gap: '1rem' }} onClick={() => open({ id: 'book' }, 'stickerBook')}>
          <span className="big" style={{ fontSize: '2.4rem' }}><Emoji e="📖" /></span>
          {t('stickerBook')} · {owned} / {STICKERS.length}
        </button>
      </div>
      <Garden count={starCount} />
    </div>
  );
}
