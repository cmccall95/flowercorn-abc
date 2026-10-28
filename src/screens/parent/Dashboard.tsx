import { useMemo, useState } from 'react';
import { type ActivityId, itemsFor, type Lang } from '../../content/sets';
import { type MetricActivity, rangeStart, type Range, summarize, toCsv } from '../../metrics/analyze';
import { useMetrics } from '../../metrics/store';
import { useApp } from '../../state/store';

const ACTIVITY_LABEL: Record<MetricActivity, string> = { upper: 'ABC', lower: 'abc', numbers: '123', trace: 'Tracing' };

const duration = (ms: number) => {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export function Dashboard() {
  const profiles = useApp((s) => s.profiles);
  const activeId = useApp((s) => s.activeId);
  const attempts = useMetrics((s) => s.attempts);
  const sessions = useMetrics((s) => s.sessions);
  const [profileId, setProfileId] = useState(activeId ?? profiles[0]?.id ?? '');
  const [lang, setLang] = useState<Lang>(useApp.getState().settings.lang === 'es' ? 'es' : 'en');
  const [activity, setActivity] = useState<MetricActivity>('upper');
  const [range, setRange] = useState<Range>('week');
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const since = rangeStart(range);
  const mine = useMemo(() => attempts.filter((a) => a.profileId === profileId && a.shownAt >= since), [attempts, profileId, since]);
  const scoped = useMemo(() => mine.filter((a) => a.lang === lang && a.activity === activity), [mine, lang, activity]);
  const mySessions = useMemo(() => sessions.filter((s) => s.profileId === profileId && s.start >= since), [sessions, profileId, since]);
  const all = summarize(mine, mySessions);
  const s = summarize(scoped, []);
  const setItems = itemsFor(activity === 'trace' ? 'upper' : (activity as ActivityId), lang);
  const traced = activity === 'trace' ? [...new Set(scoped.map((a) => a.target))] : [];
  const barItems = activity === 'trace' ? traced : setItems;
  const max = Math.max(1, ...barItems.map((x) => s.stats.get(x)?.medianMs ?? 0));
  const sel = selected ? s.stats.get(selected) : undefined;
  const name = profiles.find((p) => p.id === profileId)?.name ?? '';

  const exportCsv = () => {
    const names = Object.fromEntries(profiles.map((p) => [p.id, p.name]));
    const blob = new Blob([toCsv(attempts.filter((a) => a.profileId === profileId), names)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flowercorn-${name.toLowerCase() || 'player'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (!profiles.length) return <div className="panel">Add a player first, then play a little. Stats show up here.</div>;

  return (
    <>
      <div className="panel">
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <div className="field"><label htmlFor="d-p">Child</label>
            <select id="d-p" value={profileId} onChange={(e) => setProfileId(e.target.value)}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <div className="field"><span className="lbl">When</span>
            <div className="seg">{(['today', 'week', 'all'] as Range[]).map((r) => <button key={r} aria-pressed={r === range} onClick={() => setRange(r)}>{r === 'today' ? 'Today' : r === 'week' ? 'This week' : 'All time'}</button>)}</div>
          </div>
        </div>
        <div className="stats" style={{ marginTop: '1rem' }}>
          <div className="stat"><b>{duration(all.activeMs)}</b><span>played ({all.sessions} sessions)</span></div>
          <div className="stat"><b>{all.answers}</b><span>answers</span></div>
          <div className="stat"><b>{all.firstTryPct}%</b><span>right on first try</span></div>
          <div className="stat"><b>{secs(all.medianMs)}</b><span>typical time to answer</span></div>
        </div>
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <div className="seg">{(['upper', 'lower', 'numbers', 'trace'] as MetricActivity[]).map((a) => <button key={a} aria-pressed={a === activity} onClick={() => { setActivity(a); setSelected(null); }}>{ACTIVITY_LABEL[a]}</button>)}</div>
          <div className="seg">{(['en', 'es'] as Lang[]).map((l) => <button key={l} aria-pressed={l === lang} onClick={() => { setLang(l); setSelected(null); }}>{l === 'en' ? 'English' : 'Español'}</button>)}</div>
        </div>
      </div>

      <div className="dash-cols">
        <div className="panel">
          <h3>Needs practice</h3>
          {s.needsPractice.length ? (
            <ul className="trouble">
              {s.needsPractice.map((x) => (
                <li key={x.item}>
                  <span className="glyph">{x.item}</span>
                  <span>
                    {x.wrongFirstTry} of {x.tries} wrong on first try
                    {x.usualMixup && <> · often picks <b>{x.usualMixup}</b></>}
                    {x.slow && <> · slow ({secs(x.medianMs)})</>}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="muted">{scoped.length ? 'Nothing stands out. Great going!' : 'No answers here yet.'}</p>}
        </div>
        <div className="panel">
          <h3>Mastered</h3>
          {s.mastered.length ? <div className="mastered">{setItems.filter((x) => s.mastered.includes(x)).concat(traced.filter((x) => s.mastered.includes(x))).join(' ')}</div> : <p className="muted">Right first try 4 of the last 5 times, under 4 seconds.</p>}
        </div>
      </div>

      <div className="panel">
        <h3>Time to find each {activity === 'numbers' ? 'number' : activity === 'trace' ? 'traced letter' : 'letter'}</h3>
        <div className="bars-wrap">
          <div className="bars" role="group" aria-label="Typical seconds per item">
            {barItems.map((x) => {
              const st = s.stats.get(x);
              const h = st ? Math.max(4, (st.medianMs / max) * 100) : 4;
              return (
                <button key={x} aria-pressed={x === selected} className={!st ? 'empty' : st.needsPractice ? 'trouble-bar' : ''} onClick={() => setSelected(x)} aria-label={`${x}: ${st ? secs(st.medianMs) : 'not tried yet'}`}>
                  <i style={{ height: `${h}%` }} />{x}
                </button>
              );
            })}
          </div>
        </div>
        <p className="muted" style={{ minHeight: '1.4em' }}>
          {selected ? (sel ? <><b>{selected}</b>: {sel.tries} tries · typically {secs(sel.medianMs)} · {sel.wrongFirstTry} wrong on first try{sel.usualMixup && <> · mixed up with <b>{sel.usualMixup}</b></>}</> : <><b>{selected}</b>: not tried yet</>) : 'Tap a bar for details.'}
        </p>
        <div className="legend">
          <span><i style={{ background: 'var(--p1)' }} />typical seconds</span>
          <span><i style={{ background: 'var(--p2)' }} />needs practice</span>
          <span><i style={{ background: 'color-mix(in srgb, var(--ink) 10%, transparent)' }} />not tried yet</span>
        </div>
      </div>

      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <span className="muted">Stats stay on this device. The last 90 days are kept.</span>
        <div className="row">
          <button className="btn small" onClick={exportCsv} disabled={!mine.length && !attempts.some((a) => a.profileId === profileId)}>Export CSV</button>
          {confirmReset ? (
            <>
              <span>Erase all of {name}'s stats?</span>
              <button className="btn small pink" onClick={() => { useMetrics.getState().reset(profileId); setConfirmReset(false); }}>Erase</button>
              <button className="btn small" onClick={() => setConfirmReset(false)}>Keep</button>
            </>
          ) : <button className="btn small" onClick={() => setConfirmReset(true)}>Reset stats</button>}
        </div>
      </div>
    </>
  );
}
