# Letter-name clips

The clip builder failed. Log:

```
Commons: 27 Spanish letter files
/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/site-packages/torch/nn/modules/rnn.py:1012: UserWarning: dropout option adds dropout after all but last recurrent layer, so non-zero dropout expects num_layers greater than 1, but got dropout=0.2 and num_layers=1
  super().__init__("LSTM", *args, **kwargs)
/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/site-packages/torch/nn/utils/weight_norm.py:145: FutureWarning: `torch.nn.utils.weight_norm` is deprecated in favor of `torch.nn.utils.parametrizations.weight_norm`.
  WeightNorm.apply(module, name, dim)
Collecting en-core-web-sm==3.8.0
  Downloading en_core_web_sm-3.8.0-py3-none-any.whl (12.8 MB)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 12.8/12.8 MB 60.3 MB/s  0:00:00
Installing collected packages: en-core-web-sm
Successfully installed en-core-web-sm-3.8.0

[notice] A new release of pip is available: 26.2.1 -> 26.2.2
[notice] To update, run: pip install --upgrade pip
/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/site-packages/torch/jit/_script.py:1491: FutureWarning: `torch.jit.script` is deprecated. Please switch to `torch.compile` or `torch.export`.
  warnings.warn(
Warning: You are sending unauthenticated requests to the HF Hub. Please set a HF_TOKEN to enable higher rate limits and faster downloads.
[38;5;2m✔ Download and installation successful[0m
You can now load the package via spacy.load('en_core_web_sm')
Loading weights:   0%|          | 0/424 [00:00<?, ?it/s]Loading weights: 100%|██████████| 424/424 [00:00<00:00, 20802.01it/s]
Traceback (most recent call last):
  File "/home/runner/work/flowercorn-abc/flowercorn-abc/scripts/voices/letter_names.py", line 114, in <module>
    audio, how = kokoro(lang, letter)
                 ^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/flowercorn-abc/flowercorn-abc/scripts/voices/letter_names.py", line 86, in kokoro
    ok, dist, lead = judge(lang, letter, heard)
                     ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/flowercorn-abc/flowercorn-abc/scripts/voices/common.py", line 196, in judge
    want = expected(lang, letter)
           ^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/flowercorn-abc/flowercorn-abc/scripts/voices/common.py", line 181, in expected
    separator=Separator(phone=' ', word=' '), strip=True)
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.12.15/x64/lib/python3.12/site-packages/phonemizer/separator.py", line 29, in __init__
    raise ValueError(
ValueError: illegal separator with word=" ", syllable="None" and phone=" ", must be all differents if not empty
```
