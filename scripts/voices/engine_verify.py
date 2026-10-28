"""Listen to the in-app voice's letter names saved by e2e/engine-check.mjs and write a report.

Usage: python scripts/voices/engine_verify.py <dir with wav files> scripts/voices/engine-report.md

Each letter was said twice ("A. A."); the report compares the whole clip with the second copy the game keeps,
using a phoneme recognizer (wav2vec2 trained on espeak phonemes).
"""
import json
import os
import sys
import wave

import numpy as np

from common import judge, listen, second_copy

src, report = sys.argv[1], sys.argv[2]
timing = json.load(open(os.path.join(src, 'timing.json')))
rows, counts = [], {'en': [0, 0], 'es': [0, 0]}
for f in sorted(os.listdir(src)):
    if not f.endswith('-carrier.wav'):
        continue
    lang, letter, _ = f[:-4].split('-')
    letter = 'Ñ' if letter == 'NY' else letter
    with wave.open(os.path.join(src, f)) as w:
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        rate = w.getframerate()
    kept = second_copy(audio, rate)
    clip = kept if kept is not None else audio
    heard = listen(clip, rate)
    ok, dist, lead = judge(lang, letter, heard)
    counts[lang][0] += ok
    counts[lang][1] += 1
    note = 'extra sound at the start' if lead else '' if ok else f'{dist} phonemes off'
    rows.append(f"| {lang} | {letter} | {'second copy' if kept is not None else 'no split (whole)'} | "
                f"{' '.join(heard)} | {'✅' if ok else '⚠️ ' + note} |")
    print(rows[-1], flush=True)

with open(report, 'w', encoding='utf-8') as out:
    out.write('# In-app voice check\n\n')
    out.write(f"Voice loaded in {timing['loadSeconds']:.0f}s on the build machine; {timing['lines']} lines took "
              f"{timing['avgSeconds']:.2f}s each on average (max {timing['maxSeconds']:.2f}s).\n\n")
    out.write('Letter names said twice, second copy kept, checked with a phoneme recognizer: '
              + ', '.join(f'{lang} {c[0]} of {c[1]}' for lang, c in counts.items()) + ' sound right.\n\n')
    out.write('| lang | letter | kept | heard | |\n|---|---|---|---|---|\n' + '\n'.join(rows) + '\n')
