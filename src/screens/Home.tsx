import { say } from '../audio/sayLetter';
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

  const open = (screen: Screen, spoken: string) => {
    sfx.pop();
    void say(spoken, lang);
    go(screen);
  };

  const find = (a: ActivityId, glyphs: string, flower: string, what: [string, string]) => (
    <button className="card" onClick={() => open({ id: 'find', activity: a }, lang === 'es' ? `¡Busca ${what[1]}!` : `Find the ${what[0]}!`)}>
      <span className="glyphs">{glyphs}</span>
      <span><Emoji e={flower} /> {t('find')}</span>
      <span className="stars" aria-label={`Level ${level(a)}`}>{stars(level(a))}</span>
    </button>
  );
  const trace = (a: ActivityId, glyphs: string, what: [string, string]) => (
    <button className="card" onClick={() => open({ id: 'trace', set: a }, lang === 'es' ? `¡Vamos a trazar ${what[1]}!` : `Let's trace ${what[0]}!`)}>
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
          {find('upper', 'ABC', '🌷', ['big letters', 'las letras grandes'])}
          {find('lower', 'abc', '🌼', ['little letters', 'las letras chiquitas'])}
          {find('numbers', '123', '🐣', ['numbers', 'los números'])}
          {trace('upper', 'ABC', ['big letters', 'letras grandes'])}
          {trace('lower', 'abc', ['little letters', 'letras chiquitas'])}
          {trace('numbers', '123', ['numbers', 'números'])}
        </div>
        <button className="card" style={{ flexDirection: 'row', gap: '1rem' }} onClick={() => open({ id: 'book' }, t('stickerBook'))}>
          <span className="big" style={{ fontSize: '2.4rem' }}><Emoji e="📖" /></span>
          {t('stickerBook')} · {owned} / {STICKERS.length}
        </button>
      </div>
      <Garden count={starCount} />
    </div>
  );
}
