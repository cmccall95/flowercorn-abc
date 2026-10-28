"""Pick how to write each letter name so the Kokoro voice says it correctly.

Usage: python scripts/voices/letters.py src/content/letterVoice.gen.json scripts/voices/letters-report.md

For every letter it tries several spellings (phonetic words like "Ay" and "Bee", the bare letter, exact phonemes),
listens to each with Whisper, and keeps the first one heard as the right letter. The game then uses that spelling in
every clip that names the letter.
"""
import json
import sys

from common import heard_letter, hear, synthesize

CANDIDATES = {
    'en': {
        'A': ['Ay', 'Ey', 'A', '[A](/ˈA/)'], 'B': ['Bee', 'B'], 'C': ['See', 'C', 'Sea'], 'D': ['Dee', 'D'],
        'E': ['Ee', 'E', 'Eee'], 'F': ['Eff', 'F'], 'G': ['Gee', 'G', 'Jee'], 'H': ['Aitch', 'H', 'Aych'],
        'I': ['Eye', 'I'], 'J': ['Jay', 'J'], 'K': ['Kay', 'K'], 'L': ['Ell', 'L', 'El'], 'M': ['Em', 'M'],
        'N': ['En', 'N'], 'O': ['Oh', 'O'], 'P': ['Pee', 'P'], 'Q': ['Cue', 'Q', 'Queue'], 'R': ['Ar', 'R', 'Are'],
        'S': ['Ess', 'S', 'Es'], 'T': ['Tee', 'T'], 'U': ['You', 'U', 'Yoo'], 'V': ['Vee', 'V'],
        'W': ['Double you', 'W', 'Dubble you'], 'X': ['Ex', 'X', 'Ecks'], 'Y': ['Why', 'Y', 'Wye'],
        'Z': ['Zee', 'Z'], 'Ñ': ['Enye', 'Enya', 'En-yay'],
    },
    'es': {
        'A': ['a', 'ah'], 'B': ['be', 'bé'], 'C': ['ce', 'se'], 'D': ['de', 'dé'], 'E': ['e', 'eh'], 'F': ['efe'],
        'G': ['ge', 'je'], 'H': ['hache', 'ache'], 'I': ['i', 'ii'], 'J': ['jota'], 'K': ['ka', 'ca'], 'L': ['ele'],
        'M': ['eme'], 'N': ['ene'], 'Ñ': ['eñe', 'enye'], 'O': ['o', 'oh'], 'P': ['pe', 'pé'], 'Q': ['cu', 'ku'],
        'R': ['erre', 'ere'], 'S': ['ese'], 'T': ['te', 'té'], 'U': ['u', 'uu'], 'V': ['uve', 've'],
        'W': ['uve doble', 'doble u'], 'X': ['equis'], 'Y': ['ye', 'i griega'], 'Z': ['zeta', 'seta'],
    },
}

out_path, report_path = sys.argv[1], sys.argv[2]
chosen = {'en': {}, 'es': {}}
rows = []
for lang, letters in CANDIDATES.items():
    for letter, options in letters.items():
        tried = []
        pick = None
        for text in options:
            # Same shape as the game's first line: "A."
            heard = hear(lang, synthesize(lang, text=f'{text}.'))
            ok = heard_letter(lang, letter, heard)
            tried.append(f'{text} → “{heard}”{" ✓" if ok else ""}')
            if ok:
                pick = text
                break
        chosen[lang][letter] = pick or options[0]
        rows.append(f"| {lang} | {letter} | {pick or options[0]} | {'✅' if pick else '⚠️ none heard right'} | {'; '.join(tried)} |")
        print(rows[-1], flush=True)

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(chosen, f, ensure_ascii=False, indent=1)
    f.write('\n')
with open(report_path, 'w', encoding='utf-8') as f:
    f.write('# Letter name spellings\n\nPicked by listening to each candidate with Whisper.\n\n')
    f.write('| lang | letter | spelling used | result | tried → heard |\n|---|---|---|---|---|\n')
    f.write('\n'.join(rows) + '\n')
