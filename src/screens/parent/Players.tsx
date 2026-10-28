import { useEffect, useState } from 'react';
import { nameRecordingKey } from '../../audio/lines';
import { deleteRecording, hasRecording, loadRecordingKeys, playClip, saveRecording } from '../../audio/recordings';
import { Emoji } from '../../components/Emoji';
import { HoldToRecord } from '../../components/HoldToRecord';
import { ProfileSheet } from '../../components/ProfileSheet';
import { useMetrics } from '../../metrics/store';
import { type Profile, useApp } from '../../state/store';

export function Players() {
  const profiles = useApp((s) => s.profiles);
  const stickers = useApp((s) => s.stickers);
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; what: 'stickers' | 'delete' } | null>(null);
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  useEffect(() => { void loadRecordingKeys().then(refresh); }, []);

  const doConfirm = () => {
    if (!confirm) return;
    if (confirm.what === 'stickers') useApp.getState().resetStickers(confirm.id);
    else {
      useApp.getState().removeProfile(confirm.id);
      useMetrics.getState().reset(confirm.id);
      void deleteRecording(nameRecordingKey(confirm.id));
    }
    setConfirm(null);
  };

  return (
    <div className="panel">
      <h3>Players</h3>
      {profiles.map((p) => (
        <div key={p.id} className="profile-row">
          <span style={{ fontSize: '2.4rem' }}><Emoji e={p.avatar} /></span>
          <div style={{ flex: 1, minWidth: '10rem' }}>
            <b>{p.name}</b>{p.sayAs && <span className="muted"> · said “{p.sayAs}”</span>}
            <div className="muted">
              {stickers[p.id]?.length ?? 0} stickers · {hasRecording(nameRecordingKey(p.id)) ? '✓ name recorded' : 'name not recorded yet'}
            </div>
          </div>
          {confirm?.id === p.id ? (
            <div className="row">
              <span>{confirm.what === 'stickers' ? `Clear ${p.name}'s stickers?` : `Delete ${p.name} and their stats?`}</span>
              <button className="btn small pink" onClick={doConfirm}>Yes</button>
              <button className="btn small" onClick={() => setConfirm(null)}>No</button>
            </div>
          ) : (
            <div className="row">
              <button className="btn small" onClick={() => setRecordingFor(recordingFor === p.id ? null : p.id)}>🎙️ Record name</button>
              {hasRecording(nameRecordingKey(p.id)) && <button className="btn small" onClick={() => void playClip(nameRecordingKey(p.id))}>▶ Name</button>}
              <button className="btn small" onClick={() => setEditing(p)}>Edit</button>
              <button className="btn small" onClick={() => setConfirm({ id: p.id, what: 'stickers' })}>Reset stickers</button>
              <button className="btn small" onClick={() => setConfirm({ id: p.id, what: 'delete' })}>Delete</button>
            </div>
          )}
          {recordingFor === p.id && (
            <div style={{ flexBasis: '100%' }}>
              <HoldToRecord
                maxMs={2000}
                resetKey={p.id}
                onKeep={async (clip) => { await saveRecording(nameRecordingKey(p.id), clip); setRecordingFor(null); refresh(); }}
                hint={<div><b>Say “{p.name}”</b> the way you'd cheer it. The game uses it in “Great job, {p.name}!” and other cheers.</div>}
              />
              {hasRecording(nameRecordingKey(p.id)) && (
                <button className="btn small" onClick={() => void deleteRecording(nameRecordingKey(p.id)).then(refresh)}>Delete recorded name</button>
              )}
            </div>
          )}
        </div>
      ))}
      <button className="btn primary small" style={{ marginTop: '1rem' }} onClick={() => setEditing('new')}>＋ Add player</button>
      {editing && (
        <ProfileSheet
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === 'new') useApp.getState().addProfile(data);
            else useApp.getState().updateProfile(editing.id, data);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
