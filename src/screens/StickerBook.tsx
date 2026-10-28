import { motion } from 'framer-motion';
import { useState } from 'react';
import { say } from '../audio/sayLetter';
import { sfx } from '../audio/sfx';
import { Emoji } from '../components/Emoji';
import { IconButton, TopBar } from '../components/bits';
import { GOLD_STICKERS, STICKER_PAGES, STICKERS, type Sticker } from '../content/stickers';
import { uiLang, useT } from '../i18n/ui';
import type { Go } from '../nav';
import { useActiveProfile, useApp } from '../state/store';

export function StickerBook({ go }: { go: Go }) {
  const t = useT();
  const profile = useActiveProfile();
  const lang = uiLang(useApp((s) => s.settings.lang));
  const owned = useApp((s) => (s.activeId ? s.stickers[s.activeId] ?? [] : []));
  // Open to the page with her newest sticker.
  const [page, setPage] = useState(() => Math.max(0, STICKER_PAGES.findIndex((p) => p.stickers.some((x) => x.id === owned[owned.length - 1]))));
  const [bounce, setBounce] = useState<{ id: string; n: number } | null>(null);

  const tap = (s: Sticker) => {
    sfx.pop();
    setBounce({ id: s.id, n: (bounce?.n ?? 0) + 1 });
    void say(`${s[lang]}!`, lang);
  };

  return (
    <div className="scene plain">
      <TopBar
        left={<><IconButton e="🏠" label={t('home')} onClick={() => go({ id: 'home' })} /><span className="title">{t('bookTitle', { n: profile?.name ?? '' })} <Emoji e="📖" /></span></>}
        right={<span className="pill">{owned.filter((id) => STICKERS.some((s) => s.id === id)).length} / {STICKERS.length}</span>}
      />
      <div className="book-tabs" role="group" aria-label="Pages">
        {STICKER_PAGES.map((p, i) => (
          <button key={p.en} className="btn small" aria-pressed={i === page} onClick={() => { sfx.pop(); setPage(i); void say(p[lang], lang); }}>
            <Emoji e={p.stickers[0].emoji} /> {p[lang]}
          </button>
        ))}
      </div>
      <div className="book">
        {STICKER_PAGES[page].stickers.map((s) =>
          owned.includes(s.id) ? (
            <motion.button key={s.id + (bounce?.id === s.id ? bounce.n : '')} className="slot" aria-label={s[lang]} onClick={() => tap(s)}
              initial={bounce?.id === s.id ? { scale: 0.5, rotate: -15 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 10 }}>
              <Emoji e={s.emoji} />
            </motion.button>
          ) : (
            <span key={s.id} className="slot empty" aria-label="Not found yet">?</span>
          ),
        )}
      </div>
      <div className="gold-row" aria-label="Gold prizes">
        {GOLD_STICKERS.map((g) => (
          <button key={g.id} className={`icon-btn ${owned.includes(g.id) ? '' : 'locked'}`} style={{ width: '4.2rem', height: '4.2rem', fontSize: '2.4rem' }}
            aria-label={g[lang]} onClick={() => owned.includes(g.id) && tap(g)}>
            <Emoji e={g.emoji} />
          </button>
        ))}
      </div>
    </div>
  );
}
