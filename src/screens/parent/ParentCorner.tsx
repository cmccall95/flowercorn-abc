import { hush } from '../../audio/sayLetter';
import { Emoji } from '../../components/Emoji';
import { IconButton, TopBar } from '../../components/bits';
import type { Go, ParentTab } from '../../nav';
import { useApp } from '../../state/store';
import { Dashboard } from './Dashboard';
import { Players } from './Players';
import { RecordSounds } from './RecordSounds';
import { SettingsPanel } from './SettingsPanel';
import { WhatsNew } from './WhatsNew';
import { FixLetters } from './FixLetters';
import { VersionStatus } from '../../components/VersionInfo';

const TABS: { id: ParentTab; label: string; e: string }[] = [
  { id: 'dashboard', label: 'Dashboard', e: '📊' },
  { id: 'settings', label: 'Settings', e: '⚙️' },
  { id: 'letters', label: 'Fix letters', e: '🔤' },
  { id: 'record', label: 'Record sounds', e: '🎙️' },
  { id: 'players', label: 'Players', e: '👧' },
  { id: 'news', label: "What's new", e: '✨' },
];

export function ParentCorner({ tab = 'dashboard', go }: { tab?: ParentTab; go: Go }) {
  const hasPlayer = useApp((s) => !!s.activeId);
  return (
    <div className="scene plain">
      <div className="parent">
        <TopBar
          left={<><IconButton e="⬅️" label="Back to the game" onClick={() => { hush(); go({ id: hasPlayer ? 'home' : 'welcome' }); }} /><span className="title">Grown-up corner</span></>}
        />
        <VersionStatus />
        <nav className="tabs" role="tablist">
          {TABS.map((x) => (
            <button key={x.id} role="tab" aria-selected={x.id === tab} onClick={() => go({ id: 'parent', tab: x.id })}>
              <Emoji e={x.e} /> {x.label}
            </button>
          ))}
        </nav>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'settings' && <SettingsPanel />}
        {tab === 'record' && <RecordSounds />}
        {tab === 'players' && <Players />}
        {tab === 'news' && <WhatsNew />}
        {tab === 'letters' && <FixLetters />}
      </div>
    </div>
  );
}
