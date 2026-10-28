"""Make the bundled letter-name clips (public/voice/letters) and check each one with a phoneme recognizer.

Usage: python scripts/voices/letter_names.py public/voice/letters scripts/voices/letters-report.md

Spanish: a native speaker's recordings from Wikimedia Commons ("Letter a es es.flac" …, by Jynus, CC0), checked
file by file for the CC0 licence. Not c or z: the speaker is from Spain and says them with /θ/, so those two (and
any file that's missing or not CC0) are made with Kokoro like the English ones.
English: Kokoro says each name twice ("A. A.") and the first copy is cut off, because voices garble the start of a
very short line. A few ways of writing the name are tried and the one the recognizer hears best is kept.
Every clip is matched to the same loudness as the word clips (common.normalize).
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import numpy as np

from common import EN_PS, EN_SPELL, ES_NAME, LETTERS, RATE, judge, listen, normalize, second_copy, slug, synthesize, trim_silence

out_dir, report = sys.argv[1], sys.argv[2]
UA = 'FlowerCornABC/0.10 (https://github.com/cmccall95/flowercorn-abc; voice clip builder)'
CREDIT = 'Jynus, Wikimedia Commons (CC0)'
SPAIN_ONLY = {'C', 'Z'}  # /θ/ in the Commons recordings; the game uses Latin American Spanish


CACHE = os.path.expanduser('~/.cache/commons-letters')  # kept between runs, so each file is downloaded once


def fetch(url, tries=5):
    """Download politely: one request at a time, waiting as long as Wikimedia asks when it says to slow down."""
    for attempt in range(tries):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == tries - 1:
                raise
            wait = int(e.headers.get('Retry-After') or 30 * (attempt + 1))
            print(f'Wikimedia asked us to slow down; waiting {wait}s', flush=True)
            time.sleep(wait)


def download(title, url):
    """A Commons file, from the local cache when it's been downloaded before."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, title.removeprefix('File:').replace('/', '_'))
    if not os.path.exists(path):
        time.sleep(2)
        data = fetch(url)
        with open(path, 'wb') as f:
            f.write(data)
    with open(path, 'rb') as f:
        return f.read()


def commons_files():
    """Letter -> (title, url, licence, artist) for the Spanish letter recordings on Commons."""
    params = {
        'action': 'query', 'format': 'json', 'generator': 'categorymembers', 'gcmtype': 'file', 'gcmlimit': '500',
        'gcmtitle': 'Category:Spanish pronunciation of letters', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata',
    }
    data = json.loads(fetch('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)))
    found = {}
    for page in data.get('query', {}).get('pages', {}).values():
        m = re.fullmatch(r'File:Letter (\w)( recommended)? es es\.flac', page['title'])
        if not m or not page.get('imageinfo'):
            continue
        letter = m.group(1).upper()
        info = page['imageinfo'][0]
        meta = info.get('extmetadata', {})
        entry = (page['title'], info['url'], meta.get('LicenseShortName', {}).get('value', ''),
                 re.sub('<[^>]+>', '', meta.get('Artist', {}).get('value', '')))
        # "Letter y recommended": the speaker says "i griega" in the plain one; the recommended one is "ye".
        if letter not in found or m.group(2):
            found[letter] = entry
    return found


def decode(data):
    """Any audio file -> 24 kHz mono float32."""
    out = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', 'pipe:', '-f', 'f32le', '-ac', '1', '-ar', str(RATE), 'pipe:'],
                         input=data, capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def encode_mp3(audio, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', 'pipe:',
                    '-codec:a', 'libmp3lame', '-b:a', '64k', path], input=audio.tobytes(), check=True)


def kokoro(lang, letter):
    """Say the name twice and keep the second copy; try a few spellings and keep the one heard best."""
    if lang == 'en':
        ways = {'phonemes': {'phonemes': f'{EN_PS[letter]}. {EN_PS[letter]}.'},
                'spelled': {'text': f'{EN_SPELL[letter].capitalize()}. {EN_SPELL[letter].capitalize()}.'}}
    else:
        ways = {'name': {'text': f'{ES_NAME[letter].capitalize()}. {ES_NAME[letter].capitalize()}.'}}
    best = None
    for way, args in ways.items():
        whole = synthesize(lang, **args)
        clip = second_copy(whole)
        split = clip is not None
        clip = clip if split else whole
        heard = listen(clip)
        ok, dist, lead = judge(lang, letter, heard)
        score = (not ok, lead, dist, not split)
        if best is None or score < best[0]:
            best = (score, clip, f"Kokoro, “{args.get('text') or '/' + args['phonemes'] + '/'}”, "
                                 f"{'second copy' if split else 'no clean split, whole clip'} ({way})")
    return best[1], best[2]


commons = {}
try:
    commons = commons_files()
    print(f'Commons: {len(commons)} Spanish letter files', flush=True)
except Exception as e:  # no network: everything falls back to Kokoro
    print(f'Commons unavailable: {e}', flush=True)

index, rows, good = {}, [], 0
for lang, letters in LETTERS.items():
    for letter in letters:
        info, how = None, ''
        if lang == 'es' and letter not in SPAIN_ONLY and letter in commons:
            title, url, licence, artist = commons[letter]
            if 'CC0' in licence and 'Jynus' in artist:
                try:
                    audio = normalize(trim_silence(decode(download(title, url))))
                    info = {'source': 'commons', 'license': 'CC0', 'credit': CREDIT, 'file': title.removeprefix('File:')}
                    how = f'Commons: {title.removeprefix("File:")}'
                except Exception as e:  # couldn't download: the voice makes this one instead
                    print(f'could not download {title}: {e}', flush=True)
            else:
                print(f'skipping {title}: licence {licence!r}, artist {artist!r}', flush=True)
        if info is None:
            audio, how = kokoro(lang, letter)
            audio = normalize(audio)
            info = {'source': 'kokoro', 'license': 'Apache-2.0'}
        encode_mp3(audio, os.path.join(out_dir, lang, 'name', f'{slug(letter)}.mp3'))
        index[f'{lang}/name/{slug(letter)}'] = info
        heard = listen(audio)
        ok, dist, lead = judge(lang, letter, heard)
        good += ok
        note = 'extra sound at the start' if lead else '' if ok else f'{dist} phonemes off'
        rows.append(f"| {lang} | {letter} | {how} | {' '.join(heard)} | {'✅' if ok else '⚠️ ' + note} |")
        print(rows[-1], flush=True)

with open(os.path.join(out_dir, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(dict(sorted(index.items())), f, indent=0, ensure_ascii=False)
    f.write('\n')

total = len(rows)
with open(report, 'w', encoding='utf-8') as f:
    f.write('# Letter-name clips\n\n')
    f.write(f'Checked with a phoneme recognizer (wav2vec2 espeak phonemes): {good} of {total} sound like their letter '
            '(at most one phoneme off, nothing extra at the start).\n\n')
    f.write('Spanish recordings by ' + CREDIT + '. Others made with Kokoro-82M (Apache-2.0), said twice with the '
            'first copy cut off.\n\n')
    f.write('| lang | letter | source | heard | |\n|---|---|---|---|---|\n' + '\n'.join(rows) + '\n')
print(f'{good}/{total} letter names heard correctly')
