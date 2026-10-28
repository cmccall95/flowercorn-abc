"""Shared Kokoro + Whisper setup for the voice scripts."""
import unicodedata

import numpy as np

REPO = 'hexgrad/Kokoro-82M'
VOICES = {'en': 'af_heart', 'es': 'ef_dora'}
SPEED = 0.8  # slow and clear for little listeners
RATE = 24000

_model = None
_pipelines = {}
_whisper = None


def pipeline(lang):
    """Kokoro text-to-speech for 'en' or 'es' (Latin American Spanish rules: "ce" is "se", not "the")."""
    global _model
    if lang not in _pipelines:
        from kokoro import KModel, KPipeline
        from misaki import espeak
        _model = _model or KModel(repo_id=REPO).eval()
        p = KPipeline(lang_code='a' if lang == 'en' else 'e', repo_id=REPO, model=_model)
        if lang == 'es':
            p.g2p = espeak.EspeakG2P(language='es-419')
        _pipelines[lang] = p
    return _pipelines[lang]


def synthesize(lang, text=None, phonemes=None):
    """Speak text (or exact phonemes) and return trimmed 24 kHz float32 audio."""
    p = pipeline(lang)
    results = p.generate_from_tokens(phonemes, voice=VOICES[lang], speed=SPEED) if phonemes else p(text, voice=VOICES[lang], speed=SPEED)
    parts = [r.audio.numpy() for r in results if r.audio is not None]
    if not parts:
        raise RuntimeError(f'no audio for {text or phonemes!r}')
    audio = np.concatenate(parts)
    loud = np.where(np.abs(audio) > 0.01)[0]
    if len(loud):
        pad = int(0.05 * RATE)
        audio = audio[max(0, loud[0] - pad):loud[-1] + pad]
    return audio.astype(np.float32)


def hear(lang, audio, rate=RATE):
    """Transcribe audio with Whisper (open-source speech recognition) to check what a clip actually says."""
    global _whisper
    if _whisper is None:
        from faster_whisper import WhisperModel
        _whisper = WhisperModel('small', device='cpu', compute_type='int8')
    if rate != 16000:
        n = int(len(audio) * 16000 / rate)
        audio = np.interp(np.linspace(0, len(audio) - 1, n), np.arange(len(audio)), audio).astype(np.float32)
    silence = np.zeros(8000, dtype=np.float32)
    segments, _ = _whisper.transcribe(np.concatenate([silence, audio, silence]), language=lang, beam_size=5,
                                       condition_on_previous_text=False, without_timestamps=True)
    return ' '.join(s.text for s in segments).strip()


def words(text):
    """Lowercase words without accents or punctuation (ñ kept): "¡Ce de Conejo!" -> ['ce', 'de', 'conejo']."""
    t = text.lower().replace('ñ', '\0')
    t = ''.join(c for c in unicodedata.normalize('NFD', t) if unicodedata.category(c) != 'Mn').replace('\0', 'ñ')
    return [w for w in ''.join(c if c.isalnum() or c == 'ñ' else ' ' for c in t).split()]


# What a correct letter name sounds like to Whisper, per language.
ACCEPT = {
    'en': {
        'A': {'a', 'ay', 'ey', 'ei'}, 'B': {'b', 'bee', 'be'}, 'C': {'c', 'see', 'sea', 'si'}, 'D': {'d', 'dee'},
        'E': {'e', 'ee'}, 'F': {'f', 'ef', 'eff'}, 'G': {'g', 'gee', 'ji'}, 'H': {'h', 'aitch', 'ach', 'eich'},
        'I': {'i', 'eye', 'aye'}, 'J': {'j', 'jay'}, 'K': {'k', 'kay'}, 'L': {'l', 'el', 'elle', 'ell'},
        'M': {'m', 'em'}, 'N': {'n', 'en'}, 'O': {'o', 'oh'}, 'P': {'p', 'pee', 'pea'}, 'Q': {'q', 'cue', 'queue'},
        'R': {'r', 'are', 'ar'}, 'S': {'s', 'es', 'ess'}, 'T': {'t', 'tee', 'tea'}, 'U': {'u', 'you'},
        'V': {'v', 'vee'}, 'W': {'w', 'doubleyou', 'doubleu'}, 'X': {'x', 'ex'}, 'Y': {'y', 'why'},
        'Z': {'z', 'zee'}, 'Ñ': {'enye', 'enya', 'ñ', 'nye'},
    },
    'es': {
        'A': {'a'}, 'B': {'be', 'b'}, 'C': {'ce', 'se', 'c'}, 'D': {'de', 'd'}, 'E': {'e'}, 'F': {'efe', 'f'},
        'G': {'ge', 'je', 'g'}, 'H': {'hache', 'ache', 'h'}, 'I': {'i', 'y'}, 'J': {'jota', 'j'}, 'K': {'ka', 'k', 'ca'},
        'L': {'ele', 'l'}, 'M': {'eme', 'm'}, 'N': {'ene', 'n'}, 'Ñ': {'eñe', 'ñ', 'enye'}, 'O': {'o'},
        'P': {'pe', 'p'}, 'Q': {'cu', 'q', 'ku'}, 'R': {'erre', 'ere', 'r'}, 'S': {'ese', 's'}, 'T': {'te', 't'},
        'U': {'u'}, 'V': {'uve', 've', 'v'}, 'W': {'uvedoble', 'dobleu', 'dobleve', 'w'}, 'X': {'equis', 'x'},
        'Y': {'ye', 'y', 'igriega'}, 'Z': {'zeta', 'seta', 'z'},
    },
}


def heard_letter(lang, letter, text):
    """True if the transcript names the letter: any single word, or two words run together ("double you")."""
    w = words(text)
    options = set(w) | {a + b for a, b in zip(w, w[1:])}
    return bool(options & ACCEPT[lang][letter])


def letter_of(line_id):
    """en/intro-ua-xxxx -> 'A'; en/word-ny-xxxx -> 'Ñ'; numbers and phrases -> None."""
    kind, rest = line_id.split('/')[1].split('-', 1)
    if kind not in ('intro', 'word', 'find', 'name', 'draw'):
        return None
    slug = rest.rsplit('-', 1)[0]
    if slug.startswith('n') and slug[1:].isdigit():
        return None
    if kind in ('intro', 'find', 'draw'):
        slug = slug[1:]  # drop the u/l case marker
    return 'Ñ' if slug == 'ny' else slug.upper()
