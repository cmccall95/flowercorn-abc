// Spanish spelling → phonemes for the Kokoro voice, Latin American style (c/z → s, ll/y → ʝ, h silent).
// Spanish spelling is regular enough that a short rule set covers it, and it gives exact control.

interface Tok {
  ph: string;
  vowel?: boolean;
  accent?: boolean;
  /** i/u without an accent: can glide into a neighbouring vowel. */
  weak?: boolean;
}

const VOWELS: Record<string, [string, boolean]> = {
  a: ['a', false], e: ['e', false], i: ['i', false], o: ['o', false], u: ['u', false],
  á: ['a', true], é: ['e', true], í: ['i', true], ó: ['o', true], ú: ['u', true], ü: ['u', false],
};
const FRONT = /[eiéí]/;
const isVowelChar = (c: string | undefined) => !!c && c in VOWELS;

// Short words said without stress, like "de" in "Ce de Conejo".
const UNSTRESSED = new Set(['de', 'la', 'el', 'a', 'y', 'en', 'que', 'los', 'las', 'un', 'una', 'con', 'por', 'mi', 'tu', 'se', 'le', 'lo', 'del', 'al', 'su', 'es']);

function tokens(word: string): Tok[] {
  const w = word.toLowerCase();
  const out: Tok[] = [];
  const prev = () => out[out.length - 1];
  const afterNasalOrStart = () => !prev() || ['m', 'n'].includes(prev()!.ph);
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const next = w[i + 1];
    if (isVowelChar(c)) {
      const [ph, accent] = VOWELS[c];
      out.push({ ph, vowel: true, accent, weak: !accent && (ph === 'i' || ph === 'u') });
      continue;
    }
    switch (c) {
      case 'c':
        if (next === 'h') { out.push({ ph: 'tʃ' }); i++; }
        else out.push({ ph: next && FRONT.test(next) ? 's' : 'k' });
        break;
      case 'q':
        out.push({ ph: 'k' });
        if (next === 'u') i++;
        break;
      case 'g':
        if (next === 'u' && w[i + 2] && FRONT.test(w[i + 2])) { out.push({ ph: afterNasalOrStart() ? 'ɡ' : 'ɣ' }); i++; }
        else if (next && FRONT.test(next)) out.push({ ph: 'x' });
        else out.push({ ph: afterNasalOrStart() ? 'ɡ' : 'ɣ' });
        break;
      case 'l':
        if (next === 'l') { out.push({ ph: 'ʝ' }); i++; } else out.push({ ph: 'l' });
        break;
      case 'r':
        if (next === 'r') { out.push({ ph: 'r' }); i++; }
        else out.push({ ph: !prev() || ['n', 'l', 's'].includes(prev()!.ph) ? 'r' : 'ɾ' });
        break;
      case 'b': case 'v':
        out.push({ ph: afterNasalOrStart() ? 'b' : 'β' });
        break;
      case 'd':
        out.push({ ph: !prev() || ['n', 'l'].includes(prev()!.ph) ? 'd' : 'ð' });
        break;
      case 'y':
        if (isVowelChar(next)) out.push({ ph: 'ʝ' });
        else out.push({ ph: 'i', vowel: true, weak: true });
        break;
      case 'h': break;
      case 'j': out.push({ ph: 'x' }); break;
      case 'ñ': out.push({ ph: 'ɲ' }); break;
      case 'z': out.push({ ph: 's' }); break;
      case 'x': out.push({ ph: 'ks' }); break;
      case 'w': out.push({ ph: 'w' }); break;
      case 'k': out.push({ ph: 'k' }); break;
      default:
        if (/[a-z]/.test(c)) out.push({ ph: c });
    }
  }
  return out;
}

/** Vowel groups (syllable nuclei): a weak i/u next to another vowel shares its syllable. */
function nuclei(t: Tok[]): number[][] {
  const groups: number[][] = [];
  for (let i = 0; i < t.length; i++) {
    if (!t[i].vowel) continue;
    const last = groups[groups.length - 1];
    const prevIdx = last?.[last.length - 1];
    if (last && prevIdx === i - 1 && (t[i].weak || t[prevIdx].weak)) last.push(i);
    else groups.push([i]);
  }
  return groups;
}

function wordToPhonemes(word: string): string {
  const t = tokens(word);
  const groups = nuclei(t);
  if (!groups.length) return t.map((x) => x.ph).join('');
  // Glides: a weak vowel sharing a syllable is j / w.
  for (const g of groups) {
    if (g.length < 2) continue;
    const strong = g.find((i) => !t[i].weak) ?? g[g.length - 1];
    for (const i of g) if (i !== strong && t[i].weak) t[i].ph = t[i].ph === 'i' ? 'j' : 'w';
  }
  let stressed = groups.findIndex((g) => g.some((i) => t[i].accent));
  if (stressed < 0) {
    const last = word.toLowerCase().slice(-1);
    stressed = groups.length === 1 ? 0 : /[aeiouns]/.test(last) ? groups.length - 2 : groups.length - 1;
  }
  const mark = !(groups.length === 1 && UNSTRESSED.has(word.toLowerCase()));
  // The stress mark goes right before the stressed vowel, as Kokoro's own phonemes do ("sˈe", "bjˈen").
  const g = groups[stressed];
  const at = g.find((i) => t[i].accent) ?? g.find((i) => !t[i].weak) ?? g[g.length - 1];
  return t.map((x, i) => (mark && i === at ? 'ˈ' : '') + x.ph).join('');
}

/** "¡Ce de Conejo!" → "¡sˈe de konˈexo!" (punctuation and spacing kept). */
export function spanishPhonemes(text: string): string {
  return text.replace(/[a-záéíóúüñ]+/gi, (w) => wordToPhonemes(w));
}
