import changelog from '../../../CHANGELOG.md?raw';
import { BUILD } from '../../update';

interface Release { version: string; date: string; groups: { title: string; items: string[] }[] }

/** Reads CHANGELOG.md: "## [x.y.z] - date", "### Added", "- item" (continuation lines are indented). */
function parse(md: string): Release[] {
  const out: Release[] = [];
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const rel = line.match(/^## \[(.+?)\] - (.+)$/);
    if (rel) { out.push({ version: rel[1], date: rel[2], groups: [] }); continue; }
    const cur = out[out.length - 1];
    if (!cur) continue;
    const group = line.match(/^### (.+)$/);
    if (group) { cur.groups.push({ title: group[1], items: [] }); continue; }
    const g = cur.groups[cur.groups.length - 1];
    if (!g) continue;
    if (line.startsWith('- ')) g.items.push(line.slice(2));
    else if (line.startsWith('  ') && g.items.length) g.items[g.items.length - 1] += ' ' + line.trim();
  }
  return out;
}

const inline = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));

export function WhatsNew() {
  return (
    <div className="changelog">
      {parse(changelog).map((r) => (
        <section key={r.version} className="panel">
          <h3>
            Version {r.version} <span className="muted">· {r.date}</span>
            {r.version === BUILD.version && <span className="you-are-here">you're on this one</span>}
          </h3>
          {r.groups.map((g) => (
            <div key={g.title}>
              <b>{g.title}</b>
              <ul>{g.items.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

