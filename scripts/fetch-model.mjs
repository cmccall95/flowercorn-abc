// Downloads the in-app backup voice (Kokoro-82M, Apache-2.0) so the site hosts it itself.
// Usage: node scripts/fetch-model.mjs public/models     (same files as scripts/voices/fetch_model.py)
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const REPO = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const FILES = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx', 'voices/af_heart.bin', 'voices/ef_dora.bin'];
const out = join(process.argv[2] ?? 'public/models', REPO);

for (const f of FILES) {
  const dest = join(out, f);
  try { if (statSync(dest).size > 0) continue; } catch { /* not downloaded yet */ }
  const res = await fetch(`https://huggingface.co/${REPO}/resolve/main/${f}`, { headers: { 'User-Agent': 'flowercorn-build' } });
  if (!res.ok) throw new Error(`${f}: ${res.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`${f}: ${(statSync(dest).size / 1e6).toFixed(1)} MB`);
}
