import { BUILD, newerThan, useUpdate } from '../update';

const built = () => new Date(BUILD.builtAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Small version tag, plus an Update button once a newer version has downloaded. */
export function VersionTag() {
  const ready = useUpdate((s) => s.ready);
  const apply = useUpdate((s) => s.apply);
  return (
    <span className="version-tag">
      {ready && <button className="btn small primary" onClick={apply}>✨ New version ready · Update</button>}
      <span>v{BUILD.version}</span>
    </span>
  );
}

/** Grown-up corner: which version this is, and whether it's the newest. */
export function VersionStatus() {
  const { ready, latest, checking, apply, check } = useUpdate();
  const behind = latest && newerThan(latest, BUILD.version);
  return (
    <div className="panel version-status">
      <div>
        <b>Version {BUILD.version}</b> <span className="muted">· built {built()} · {BUILD.commit}</span>
        <div className="muted">
          {ready ? 'A newer version is installed. Tap Update to switch to it.'
            : checking ? 'Checking for a newer version…'
            : behind ? `Version ${latest} is out and downloading. An Update button will appear in a moment (or close and reopen the app).`
            : latest ? "You're on the newest version."
            : "Couldn't check for a newer version (offline?)."}
        </div>
      </div>
      {ready ? <button className="btn small primary" onClick={apply}>✨ Update now</button>
        : <button className="btn small" onClick={() => void check()} disabled={checking}>Check for updates</button>}
    </div>
  );
}
