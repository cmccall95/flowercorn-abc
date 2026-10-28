import { useState } from 'react';
import { phrase, playSequence } from '../audio/sayLetter';
import { CHEERS } from '../content/cheers';
import { AVATARS } from '../content/friends';
import type { Profile } from '../state/store';
import { Emoji } from './Emoji';

/** Grown-up form for a new player (or editing one): name, how the voice should say it, and an animal. */
export function ProfileSheet({ initial, onSave, onClose }: {
  initial?: Omit<Profile, 'id'> & { id?: string }; onSave: (p: Omit<Profile, 'id'>) => void; onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sayAs, setSayAs] = useState(initial?.sayAs ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATARS[0]);
  const spoken = sayAs.trim() || name.trim();

  return (
    <div className="overlay modal">
      <form className="sheet" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave({ name: name.trim(), sayAs: sayAs.trim(), avatar }); }}>
        <h2>{initial ? 'Edit player' : 'New player'}</h2>
        <div className="field">
          <label htmlFor="p-name">Name</label>
          <input id="p-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={20} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="p-say">How to say it (optional)</label>
          <input id="p-say" type="text" value={sayAs} onChange={(e) => setSayAs(e.target.value)} placeholder="Spell it the way it sounds" maxLength={30} autoComplete="off" />
          <span className="muted">
            If the voice says her name wrong, spell it the way it sounds, like “Soff-ee-ah”. You can also record her name in your own
            voice: Grown-up corner → Players → Record name.
          </span>
        </div>
        <div className="field">
          <span className="lbl">Animal</span>
          <div className="avatar-pick">
            {AVATARS.map((a) => (
              <button type="button" key={a} aria-pressed={a === avatar} onClick={() => setAvatar(a)}><Emoji e={a} /></button>
            ))}
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <button type="button" className="btn small" disabled={!spoken} onClick={() => void playSequence(phrase(CHEERS.en[0], 'en', {}, { spoken, profileId: initial?.id ?? '' }))}><Emoji e="🔊" /> Test</button>
            <button type="button" className="btn small" disabled={!spoken} onClick={() => void playSequence(phrase(CHEERS.es[0], 'es', {}, { spoken, profileId: initial?.id ?? '' }))}><Emoji e="🔊" /> Prueba</button>
          </div>
          <div className="row">
            <button type="button" className="btn small" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn small primary" disabled={!name.trim()}>Save</button>
          </div>
        </div>
      </form>
    </div>
  );
}
