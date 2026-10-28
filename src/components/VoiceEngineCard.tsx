import { startEngine, useEngine } from '../audio/engine/engine';
import { useApp } from '../state/store';

/** Download / status card for the in-app voice. */
export function VoiceEngineCard() {
  const { status, progress, error } = useEngine();
  const enabled = useApp((s) => s.settings.engine);
  const turnOn = () => { useApp.getState().updateSettings({ engine: true }); startEngine(); };
  return (
    <div className="panel field" style={{ gridColumn: '1 / -1' }}>
      <span className="lbl">In-app voice</span>
      {status === 'ready' ? (
        <div><b>✅ Ready.</b> <span className="muted">Says every letter, word and her name on this device, even offline.</span></div>
      ) : status === 'loading' ? (
        <div>
          <b>{enabled && progress === 0 ? 'Starting the voice…' : `Downloading the voice… ${Math.round(progress * 100)}%`}</b>
          <div className="progress"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <span className="muted">About 90 MB, one time. You can keep using the app meanwhile.</span>
        </div>
      ) : (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted" style={{ flex: 1, minWidth: '14rem' }}>
            {status === 'failed'
              ? `The voice couldn't load (${error}). Check the internet connection and try again.`
              : 'A free, open-source voice (Kokoro) that runs on this device: letters said exactly right, her name in every cheer, and anything new we add. One-time download of about 90 MB; Wi-Fi recommended.'}
          </span>
          <button className="btn small primary" onClick={turnOn}>{status === 'failed' ? 'Try again' : 'Download voice'}</button>
        </div>
      )}
    </div>
  );
}
