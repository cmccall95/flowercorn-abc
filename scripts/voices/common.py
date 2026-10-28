"""Shared Kokoro setup, the "say it twice, keep the second" trim, loudness matching, and the phoneme listener."""
import numpy as np

REPO = 'hexgrad/Kokoro-82M'
VOICES = {'en': 'af_heart', 'es': 'ef_dora'}
SPEED = 0.8  # slow and clear for little listeners
RATE = 24000

LETTERS = {'en': list('ABCDEFGHIJKLMNOPQRSTUVWXYZ') + ['Ñ'], 'es': list('ABCDEFGHIJKLMN') + ['Ñ'] + list('OPQRSTUVWXYZ')}

# English letter names in Kokoro/misaki phonemes (A = eɪ, I = aɪ, O = oʊ).
EN_PS = {
    'A': 'ˈA', 'B': 'bˈi', 'C': 'sˈi', 'D': 'dˈi', 'E': 'ˈi', 'F': 'ˈɛf', 'G': 'ʤˈi', 'H': 'ˈAʧ', 'I': 'ˈI', 'J': 'ʤˈA',
    'K': 'kˈA', 'L': 'ˈɛl', 'M': 'ˈɛm', 'N': 'ˈɛn', 'O': 'ˈO', 'P': 'pˈi', 'Q': 'kjˈu', 'R': 'ˈɑɹ', 'S': 'ˈɛs', 'T': 'tˈi',
    'U': 'jˈu', 'V': 'vˈi', 'W': 'dˈʌbᵊljˌu', 'X': 'ˈɛks', 'Y': 'wˈI', 'Z': 'zˈi', 'Ñ': 'ˈɛnjA',
}
# Plain spellings of the English names (an alternative for Kokoro, and what the phoneme check expects).
EN_SPELL = {
    'A': 'ay', 'B': 'bee', 'C': 'see', 'D': 'dee', 'E': 'ee', 'F': 'eff', 'G': 'gee', 'H': 'aitch', 'I': 'eye', 'J': 'jay',
    'K': 'kay', 'L': 'el', 'M': 'em', 'N': 'en', 'O': 'oh', 'P': 'pee', 'Q': 'cue', 'R': 'are', 'S': 'ess', 'T': 'tee',
    'U': 'you', 'V': 'vee', 'W': 'double you', 'X': 'ex', 'Y': 'why', 'Z': 'zee', 'Ñ': 'enye',
}
# Latin American Spanish letter names (same as src/content/names.ts).
ES_NAME = {
    'A': 'a', 'B': 'be', 'C': 'ce', 'D': 'de', 'E': 'e', 'F': 'efe', 'G': 'ge', 'H': 'hache', 'I': 'i', 'J': 'jota',
    'K': 'ka', 'L': 'ele', 'M': 'eme', 'N': 'ene', 'Ñ': 'eñe', 'O': 'o', 'P': 'pe', 'Q': 'cu', 'R': 'erre', 'S': 'ese',
    'T': 'te', 'U': 'u', 'V': 'uve', 'W': 'uve doble', 'X': 'equis', 'Y': 'ye', 'Z': 'zeta',
}


def slug(letter):
    """File name for a letter, as in src/content/names.ts letterSlug: 'a', 'ny'."""
    return 'ny' if letter == 'Ñ' else letter.lower()


_model = None
_pipelines = {}


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


def synthesize(lang, text=None, phonemes=None, trim=True):
    """Speak text (or exact phonemes) and return 24 kHz float32 audio."""
    p = pipeline(lang)
    results = p.generate_from_tokens(phonemes, voice=VOICES[lang], speed=SPEED) if phonemes else p(text, voice=VOICES[lang], speed=SPEED)
    parts = [r.audio.numpy() for r in results if r.audio is not None]
    if not parts:
        raise RuntimeError(f'no audio for {text or phonemes!r}')
    audio = np.concatenate(parts).astype(np.float32)
    return trim_silence(audio) if trim else audio


# --- The same audio helpers as src/audio/carrier.ts (keep them in step) ---

WINDOW = 240  # 10 ms at 24 kHz


def _levels(audio, win):
    n = len(audio) // win
    return np.sqrt(np.mean(audio[:n * win].reshape(n, win) ** 2, axis=1)) if n else np.zeros(0)


def trim_silence(audio, rate=RATE, threshold=None):
    """Cut quiet from both ends (keeping a little breath), then fade in so the clip doesn't start with a click."""
    win = round(WINDOW * rate / 24000)
    rms = _levels(audio, win)
    if not len(rms):
        return audio
    thr = 0.02 * rms.max() if threshold is None else threshold
    loud = np.where(rms > thr)[0]
    if not len(loud):
        return audio
    pad = round(0.03 * rate)
    clip = audio[max(0, loud[0] * win - pad):min(len(audio), (loud[-1] + 1) * win + pad)].copy()
    fade = min(win, len(clip))
    clip[:fade] *= np.arange(fade) / fade
    return clip


def second_copy(audio, rate=RATE):
    """Keep the second copy of "X. X.": what follows the longest quiet run in the middle 20–80%, or None."""
    win = round(WINDOW * rate / 24000)
    rms = _levels(audio, win)
    if len(rms) < 10:
        return None
    thr = 0.02 * rms.max()
    lo, hi = int(len(rms) * 0.2), int(np.ceil(len(rms) * 0.8))
    best, run = (-1, -1), -1
    for i in range(lo, hi):
        quiet = rms[i] <= thr
        if quiet and run < 0:
            run = i
        if not quiet and run >= 0:
            if i - run > best[1] - best[0]:
                best = (run, i)
            run = -1
    if best[0] < 0 or best[1] - best[0] < 6 or (rms[best[1]:] > thr).sum() < 10:
        return None
    return trim_silence(audio[best[1] * win:], rate, thr)


TARGET_RMS = 0.14  # about −17 dBFS over the voiced parts, so clips join evenly


def normalize(audio, rate=RATE):
    """Scale a clip so its voiced parts sit at TARGET_RMS, without letting peaks clip."""
    win = round(WINDOW * rate / 24000)
    rms = _levels(audio, win)
    peak = np.abs(audio).max() if len(audio) else 0
    if not len(rms) or not peak:
        return audio
    voiced = rms[rms > 0.1 * rms.max()]
    level = np.sqrt(np.mean(voiced ** 2))
    return (audio * min(TARGET_RMS / level, 0.98 / peak)).astype(np.float32)


# --- Listening: a phoneme recognizer (wav2vec2, trained on espeak phonemes) instead of a word transcriber ---

PHONEME_MODEL = 'facebook/wav2vec2-lv-60-espeak-cv-ft'
_listener = None


def _load_listener():
    global _listener
    if _listener is None:
        from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC, Wav2Vec2PhonemeCTCTokenizer
        _listener = (
            Wav2Vec2FeatureExtractor.from_pretrained(PHONEME_MODEL),
            # Only used to turn the recognizer's output back into phonemes, so it needs no phonemizer of its own.
            Wav2Vec2PhonemeCTCTokenizer.from_pretrained(PHONEME_MODEL, do_phonemize=False),
            Wav2Vec2ForCTC.from_pretrained(PHONEME_MODEL).eval(),
        )
    return _listener


def _resample(audio, rate, to=16000):
    if rate == to:
        return audio
    n = int(len(audio) * to / rate)
    return np.interp(np.linspace(0, len(audio) - 1, n), np.arange(len(audio)), audio).astype(np.float32)


def _phones(s):
    """'eɪ  b iː' -> ['eɪ', 'b', 'i'] (length and stress marks dropped)."""
    return [p.replace('ː', '').replace('ˈ', '').replace('ˌ', '') for p in s.split() if p.strip('ˈˌː')]


def listen(audio, rate=RATE):
    """The phonemes heard in a clip."""
    import torch
    features, tokenizer, model = _load_listener()
    pad = np.zeros(4000, dtype=np.float32)
    x = features(np.concatenate([pad, _resample(audio, rate), pad]), sampling_rate=16000, return_tensors='pt').input_values
    with torch.no_grad():
        ids = model(x).logits.argmax(-1)
    return _phones(tokenizer.batch_decode(ids)[0])


def expected(lang, letter):
    """The phonemes a correct letter name should have (espeak, like the recognizer's training labels)."""
    import espeakng_loader
    from phonemizer import phonemize
    from phonemizer.backend.espeak.wrapper import EspeakWrapper
    from phonemizer.separator import Separator
    EspeakWrapper.set_library(espeakng_loader.get_library_path())
    EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
    text = EN_SPELL[letter] if lang == 'en' else ES_NAME[letter]
    out = phonemize(text, language='en-us' if lang == 'en' else 'es-419', backend='espeak',
                    separator=Separator(phone=' ', word=' '), strip=True)
    return _phones(out)


def _distance(a, b):
    d = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        prev, d[0] = d[0], i
        for j, y in enumerate(b, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (x != y))
    return d[-1]


def judge(lang, letter, heard):
    """(ok, distance, extra sound at the start) for a letter-name clip."""
    want = expected(lang, letter)
    dist = _distance(heard, want)
    lead = len(heard) > 1 and _distance(heard[1:], want) < dist
    return dist <= 1 and not lead, dist, lead
