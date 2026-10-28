import { EMOJI_ART } from '../content/emojiArt.gen';

const urls = new Map<string, string>();
const urlFor = (e: string) => {
  const key = e.replace('️', '');
  const svg = EMOJI_ART[key];
  if (!svg) return null;
  if (!urls.has(key)) urls.set(key, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  return urls.get(key)!;
};

/** Fluent Emoji art (same look on every device); falls back to the system emoji. Sized by font-size. */
export function Emoji({ e, label, className = '' }: { e: string; label?: string; className?: string }) {
  const src = urlFor(e);
  if (!src) return <span className={`emoji-text ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>{e}</span>;
  return <img className={`emoji ${className}`} src={src} alt={label ?? ''} aria-hidden={label ? undefined : true} draggable={false} />;
}
