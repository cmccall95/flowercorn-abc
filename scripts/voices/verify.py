"""Listen to every finished letter clip with Whisper and report any that don't name their letter.

Usage: python scripts/voices/verify.py scripts/voices/manifest.json public/voice scripts/voices/report.md
"""
import json
import os
import subprocess
import sys

import numpy as np

from common import heard_letter, hear, letter_of

manifest_path, voice_dir, report_path = sys.argv[1:4]
lines = json.load(open(manifest_path, encoding='utf-8'))


def load(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', '16000', 'pipe:'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


checked, failures = 0, []
for line in lines:
    letter = letter_of(line['id'])
    if not letter:
        continue
    heard = hear(line['lang'], load(os.path.join(voice_dir, line['id'] + '.mp3')), rate=16000)
    checked += 1
    if not heard_letter(line['lang'], letter, heard):
        failures.append(f"| {line['id']} | {letter} | {line.get('text')} | “{heard}” |")
        print('MISS', failures[-1], flush=True)

with open(report_path, 'w', encoding='utf-8') as f:
    f.write(f'# Voice clip check\n\nListened to {checked} letter clips with Whisper: '
            f'{checked - len(failures)} named the right letter, {len(failures)} did not.\n\n')
    if failures:
        f.write('| clip | letter | text | heard |\n|---|---|---|---|\n' + '\n'.join(failures) + '\n')
print(f'{checked} letter clips checked, {len(failures)} misses')
