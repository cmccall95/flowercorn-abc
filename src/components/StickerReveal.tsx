import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { say } from '../audio/sayLetter';
import { sfx } from '../audio/sfx';
import type { Lang } from '../content/sets';
import type { Sticker } from '../content/stickers';
import { tFor } from '../i18n/ui';
import { burst } from './Celebration';
import { Emoji } from './Emoji';

/** A shaking present; tapping it pops out the sticker she just won. */
export function StickerReveal({ sticker, name, lang, onBook, onDone }: {
  sticker: Sticker; name: string; lang: Lang; onBook: () => void; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => { void say(tFor(lang, sticker.gold ? 'setDoneSay' : 'tapPresent', { n: name }), lang); }, [lang, name, sticker.gold]);

  const openIt = () => {
    setOpen(true);
    sfx.fanfare();
    burst(true);
    void say(tFor(lang, 'gotStickerSay', { n: name, s: sticker[lang] }), lang);
  };

  return (
    <div className="overlay modal" role="dialog" aria-label={tFor(lang, 'gotSticker')}>
      {!open ? (
        <div className="reveal">
          <motion.button className="gift" aria-label={tFor(lang, 'tapPresent')} onClick={openIt}
            animate={{ rotate: [0, -8, 8, -4, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.6 }}>
            <Emoji e={sticker.gold ? '🏆' : '🎁'} />
          </motion.button>
          <h2>{tFor(lang, sticker.gold ? 'allDone' : 'tapPresent')}</h2>
        </div>
      ) : (
        <div className="reveal">
          <motion.div className="sticker-big" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 11 }}>
            <Emoji e={sticker.emoji} label={sticker[lang]} />
          </motion.div>
          <h2>{tFor(lang, 'gotSticker')}</h2>
          <div className="row">
            <button className="btn" onClick={onBook}><Emoji e="📖" /> {tFor(lang, 'seeBook')}</button>
            <button className="btn primary" onClick={onDone}><Emoji e="▶️" /> {tFor(lang, 'keepPlaying')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
