"""Download the in-app voice's files from Hugging Face so the site can host them itself.

Usage: python scripts/voices/fetch_model.py public/models

Phones then load the voice from our own site only. Kokoro-82M is Apache-2.0, which allows redistribution.
"""
import os
import shutil
import sys

from huggingface_hub import hf_hub_download

REPO = 'onnx-community/Kokoro-82M-v1.0-ONNX'
FILES = [
    'config.json', 'tokenizer.json', 'tokenizer_config.json',
    'onnx/model_quantized.onnx',          # the q8 model (~92 MB)
    'voices/af_heart.bin', 'voices/ef_dora.bin',
]

out = os.path.join(sys.argv[1], REPO)
for f in FILES:
    src = hf_hub_download(REPO, f)
    dest = os.path.join(out, f)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copyfile(src, dest)
    print(f'{f}: {os.path.getsize(dest) / 1e6:.1f} MB')
