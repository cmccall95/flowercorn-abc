import { useState } from 'react';
import { signIn } from '../audio/cloud';
import { Emoji } from '../components/Emoji';

/** Grown-ups sign in once per device; the game's voice comes from our server, which only talks to known accounts. */
export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(await signIn(email, password));
    setBusy(false);
  };

  return (
    <div className="scene">
      <div className="overlay modal">
        <form className="sheet" onSubmit={(e) => void submit(e)}>
          <h2><Emoji e="🦄" /> FlowerCorn Land</h2>
          <p className="muted" style={{ margin: 0 }}>Grown-ups: sign in once on this device.</p>
          <div className="field">
            <label htmlFor="si-email">Email</label>
            <input id="si-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="si-password">Password</label>
            <input id="si-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div role="alert" style={{ color: '#c2185b' }}>{error}</div>}
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
