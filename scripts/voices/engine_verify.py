"""Listen (with Whisper) to the in-app voice's letter lines saved by e2e/engine-check.mjs and write a report.

Usage: python scripts/voices/engine_verify.py <dir with wav files> scripts/voices/engine-report.md
"""
import json
import os
import sys
import wave

import numpy as np

from common import hear, heard_letter

src, report = sys.argv[1], sys.argv[2]
timing = json.load(open(os.path.join(src, 'timing.json')))
rows, misses, checked = [], 0, 0
experiment = {}
for f in sorted(os.listdir(src)):
    if not f.endswith('.wav'):
        continue
    if f.startswith('exp-'):
        _, variant, lang, letter = f[:-4].split('-')
        letter = 'Ñ' if letter == 'NY' else letter
        with wave.open(os.path.join(src, f)) as w:
            audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
            rate = w.getframerate()
        heard = hear(lang, audio, rate=rate)
        ok = heard_letter(lang, letter, heard)
        experiment.setdefault((lang, variant), []).append((letter, ok, heard))
        continue
    with wave.open(os.path.join(src, f)) as w:
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        rate = w.getframerate()
    lang = f[:2]
    heard = hear(lang, audio, rate=rate)
    letter = f.split('-')[1]
    letter = 'Ñ' if letter == 'NY' else letter
    if 'cheer' in f:
        rows.append(f'| {f} | — | “{heard}” | |')
        continue
    checked += 1
    ok = heard_letter(lang, letter, heard)
    misses += not ok
    rows.append(f"| {f} | {letter} | “{heard}” | {'✅' if ok else '⚠️'} |")
    print(rows[-1], flush=True)

with open(report, 'w', encoding='utf-8') as out:
    out.write('# In-app voice check\n\n')
    out.write(f"Voice loaded in {timing['loadSeconds']:.0f}s on the build machine; {timing['lines']} lines took "
              f"{timing['avgSeconds']:.2f}s each on average (max {timing['maxSeconds']:.2f}s).\n\n")
    out.write(f'Listened with Whisper: {checked - misses} of {checked} letter lines named the right letter.\n\n')
    if experiment:
        out.write('## Ways of saying a letter name\n\n| language | way | heard right | missed |\n|---|---|---|---|\n')
        for (lang, variant), results in sorted(experiment.items()):
            good = sum(ok for _, ok, _ in results)
            missed = ', '.join(f'{l} (“{h}”)' for l, ok, h in results if not ok)
            out.write(f'| {lang} | {variant} | {good} of {len(results)} | {missed} |\n')
        out.write('\n')
    out.write('| file | letter | heard | |\n|---|---|---|---|\n' + '\n'.join(rows) + '\n')
print(f'{checked - misses}/{checked} letter lines heard correctly')
