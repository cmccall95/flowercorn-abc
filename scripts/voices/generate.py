"""Generate the bundled voice clips with Kokoro-82M (Apache-2.0), an open-source neural text-to-speech model.

Usage: python scripts/voices/generate.py scripts/voices/manifest.json public/voice

Each manifest line has an id and either `text` (read with Kokoro's pronunciation rules; letter names use the
spellings letters.py picked) or `phonemes` (spoken exactly, for phonics sounds). Clips are only
regenerated when their line, voice or settings change; public/voice/index.json records what exists.
"""
import hashlib
import json
import os
import subprocess
import sys

from common import RATE, SPEED, VOICES, synthesize

VERSION = 1  # bump to regenerate everything

manifest_path, out_dir = sys.argv[1], sys.argv[2]
lines = json.load(open(manifest_path, encoding='utf-8'))
index_path = os.path.join(out_dir, 'index.json')
old = json.load(open(index_path, encoding='utf-8')) if os.path.exists(index_path) else {}


def fingerprint(line):
    key = json.dumps([line.get('text'), line.get('phonemes'), VOICES[line['lang']], SPEED, VERSION], ensure_ascii=False)
    return hashlib.sha1(key.encode('utf-8')).hexdigest()[:12]


def encode_mp3(audio, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', 'pipe:',
         '-codec:a', 'libmp3lame', '-b:a', '48k', path],
        input=audio.tobytes(), check=True,
    )


new_index = {}
made = 0
for line in lines:
    h = fingerprint(line)
    path = os.path.join(out_dir, f"{line['id']}.mp3")
    if old.get(line['id']) != h or not os.path.exists(path):
        encode_mp3(synthesize(line['lang'], text=line.get('text'), phonemes=line.get('phonemes')), path)
        made += 1
        print(f"made {line['id']}: {line.get('text') or '/' + line['phonemes'] + '/'}", flush=True)
    new_index[line['id']] = h

# Remove clips for lines that no longer exist.
removed = 0
for root, _, files in os.walk(out_dir):
    for f in files:
        if f.endswith('.mp3'):
            rel = os.path.relpath(os.path.join(root, f), out_dir)[:-4].replace(os.sep, '/')
            if rel not in new_index:
                os.remove(os.path.join(root, f))
                removed += 1

with open(index_path, 'w', encoding='utf-8') as f:
    json.dump(dict(sorted(new_index.items())), f, indent=0)
    f.write('\n')
print(f'{len(new_index)} clips: {made} made, {removed} removed')
