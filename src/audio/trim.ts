// Trim silence from both ends of a recording and save it as a small mono WAV, which every browser can play back.
const THRESHOLD = 0.03;
const PAD_S = 0.06;

export async function trimToWav(blob: Blob): Promise<Blob> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = buf.getChannelData(0);
    let start = data.findIndex((v) => Math.abs(v) > THRESHOLD);
    let end = data.length - 1;
    while (end > 0 && Math.abs(data[end]) <= THRESHOLD) end--;
    if (start < 0 || end <= start) { start = 0; end = data.length - 1; }
    const pad = Math.round(PAD_S * buf.sampleRate);
    start = Math.max(0, start - pad);
    end = Math.min(data.length, end + pad);
    return encodeWav(data.subarray(start, end), buf.sampleRate);
  } finally {
    void ctx.close();
  }
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const out = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); out.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) => out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true));
  return new Blob([out], { type: 'audio/wav' });
}
