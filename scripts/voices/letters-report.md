# Letter-name clips

The clip builder failed. Log:

```
/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/site-packages/torch/nn/modules/rnn.py:1012: UserWarning: dropout option adds dropout after all but last recurrent layer, so non-zero dropout expects num_layers greater than 1, but got dropout=0.2 and num_layers=1
  super().__init__("LSTM", *args, **kwargs)
/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/site-packages/torch/nn/utils/weight_norm.py:145: FutureWarning: `torch.nn.utils.weight_norm` is deprecated in favor of `torch.nn.utils.parametrizations.weight_norm`.
  WeightNorm.apply(module, name, dim)
Collecting en-core-web-sm==3.8.0
  Downloading en_core_web_sm-3.8.0-py3-none-any.whl (12.8 MB)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 12.8/12.8 MB 208.5 MB/s  0:00:00
Installing collected packages: en-core-web-sm
Successfully installed en-core-web-sm-3.8.0
/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/site-packages/torch/jit/_script.py:1491: FutureWarning: `torch.jit.script` is deprecated. Please switch to `torch.compile` or `torch.export`.
  warnings.warn(
[38;5;2m✔ Download and installation successful[0m
You can now load the package via spacy.load('en_core_web_sm')
Loading weights:   0%|          | 0/424 [00:00<?, ?it/s]Loading weights: 100%|██████████| 424/424 [00:00<00:00, 18496.14it/s]
| en | A | Kokoro, “Ay. Ay.”, second copy (spelled) | aɪ | ✅ |
| en | B | Kokoro, “/bˈi. bˈi./”, second copy (phonemes) | b e | ✅ |
| en | C | Kokoro, “/sˈi. sˈi./”, no clean split, whole clip (phonemes) | ʔ a s i v s i | ⚠️ extra sound at the start |
| en | D | Kokoro, “/dˈi. dˈi./”, second copy (phonemes) | d eɪ | ✅ |
| en | E | Kokoro, “/ˈi. ˈi./”, second copy (phonemes) | ð i | ⚠️ extra sound at the start |
| en | F | Kokoro, “/ˈɛf. ˈɛf./”, second copy (phonemes) | ɛ f | ⚠️ 3 phonemes off |
| en | G | Kokoro, “/ʤˈi. ʤˈi./”, second copy (phonemes) | dʒ ai5 | ✅ |
| en | H | Kokoro, “/ˈAʧ. ˈAʧ./”, second copy (phonemes) | eɪ d z | ⚠️ 2 phonemes off |
| en | I | Kokoro, “/ˈI. ˈI./”, second copy (phonemes) | aɪ | ✅ |
| en | J | Kokoro, “/ʤˈA. ʤˈA./”, second copy (phonemes) | ts. ai5 | ⚠️ 2 phonemes off |
| en | K | Kokoro, “/kˈA. kˈA./”, second copy (phonemes) | k e | ✅ |
| en | L | Kokoro, “El. El.”, second copy (spelled) | ɛ l | ✅ |
| en | M | Kokoro, “/ˈɛm. ˈɛm./”, second copy (phonemes) | ɛ m | ✅ |
| en | N | Kokoro, “/ˈɛn. ˈɛn./”, second copy (phonemes) | ɛ n d | ✅ |
| en | O | Kokoro, “/ˈO. ˈO./”, second copy (phonemes) | aʊ | ✅ |
| en | P | Kokoro, “Pee. Pee.”, second copy (spelled) | p i5 | ✅ |
| en | Q | Kokoro, “/kjˈu. kjˈu./”, second copy (phonemes) | k i | ⚠️ 2 phonemes off |
| en | R | Kokoro, “/ˈɑɹ. ˈɑɹ./”, second copy (phonemes) | ɑ | ✅ |
| en | S | Kokoro, “/ˈɛs. ˈɛs./”, no clean split, whole clip (phonemes) | l a s a s | ⚠️ extra sound at the start |
| en | T | Kokoro, “/tˈi. tˈi./”, second copy (phonemes) | th i5 | ⚠️ 2 phonemes off |
| en | U | Kokoro, “You. You.”, second copy (spelled) | j u | ✅ |
| en | V | Kokoro, “/vˈi. vˈi./”, second copy (phonemes) | v i | ✅ |
| en | W | Kokoro, “/dˈʌbᵊljˌu. dˈʌbᵊljˌu./”, second copy (phonemes) | d a b əl l j u θ | ⚠️ 3 phonemes off |
| en | X | Kokoro, “/ˈɛks. ˈɛks./”, second copy (phonemes) | ɛ k s | ✅ |
| en | Y | Kokoro, “/wˈI. wˈI./”, second copy (phonemes) | w aɪ | ✅ |
| en | Z | Kokoro, “/zˈi. zˈi./”, second copy (phonemes) | z e | ✅ |
| en | Ñ | Kokoro, “Enye. Enye.”, second copy (spelled) | ɛ n aɨ | ✅ |
| es | A | Commons: Letter a es es.flac | ʔ a | ⚠️ extra sound at the start |
| es | B | Commons: Letter b es es.flac | b e | ✅ |
| es | C | Kokoro, “Ce. Ce.”, no clean split, whole clip (name) | s ei5 n ə1 s ei5 | ⚠️ extra sound at the start |
| es | D | Commons: Letter d es es.flac | d eɪ | ✅ |
| es | E | Commons: Letter e es es.flac |  | ✅ |
| es | F | Commons: Letter f es es.flac | e f i | ✅ |
| es | G | Commons: Letter g es es.flac | f e | ✅ |
| es | H | Commons: Letter h es es.flac | a t i | ⚠️ 2 phonemes off |
| es | I | Commons: Letter i es es.flac | i | ✅ |
| es | J | Commons: Letter j es es.flac | x o t a | ✅ |
| es | K | Commons: Letter k es es.flac | k ɑ | ✅ |
| es | L | Commons: Letter l es es.flac | e l i | ✅ |
| es | M | Commons: Letter m es es.flac | a m i | ⚠️ 2 phonemes off |
| es | N | Commons: Letter n es es.flac | e n i | ✅ |
Traceback (most recent call last):
  File "/home/runner/work/flowercorn-abc/flowercorn-abc/scripts/voices/letter_names.py", line 108, in <module>
    audio = normalize(trim_silence(decode(fetch(url))))
                                          ^^^^^^^^^^
  File "/home/runner/work/flowercorn-abc/flowercorn-abc/scripts/voices/letter_names.py", line 32, in fetch
    with urllib.request.urlopen(req, timeout=60) as r:
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/urllib/request.py", line 215, in urlopen
    return opener.open(url, data, timeout)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/urllib/request.py", line 521, in open
    response = meth(req, response)
               ^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/urllib/request.py", line 630, in http_response
    response = self.parent.error(
               ^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/urllib/request.py", line 559, in error
    return self._call_chain(*args)
           ^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/urllib/request.py", line 492, in _call_chain
    result = func(*args)
             ^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/urllib/request.py", line 639, in http_error_default
    raise HTTPError(req.full_url, code, msg, hdrs, fp)
urllib.error.HTTPError: HTTP Error 429: Your bot is making too many requests. Please reduce your request rate or contact bot-traffic@wikimedia.org (f263c81)
```
