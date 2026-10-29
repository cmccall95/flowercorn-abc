/** Counts events per key in a sliding time window. In memory: the API runs as a single instance. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) {}

  /** Records an attempt; false if this key is over the limit. */
  take(key: string, now = Date.now()): boolean {
    const recent = this.recent(key, now);
    if (recent.length >= this.max) return false;
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  /** Whether the key is over the limit, without recording anything. */
  blocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= this.max;
  }

  /** Records a failure (for lockouts that only count failed sign-ins). */
  add(key: string, now = Date.now()) {
    this.hits.set(key, [...this.recent(key, now), now]);
  }

  clear(key: string) {
    this.hits.delete(key);
  }

  private recent(key: string, now: number): number[] {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (!list.length) this.hits.delete(key);
    if (this.hits.size > 10_000) this.prune(now);
    return list;
  }

  private prune(now: number) {
    for (const [k, list] of this.hits) if (list.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
  }
}

/** Characters of speech each account may generate per day (UTC), to cap the ElevenLabs bill. */
export class DailyBudget {
  private used = new Map<string, number>();
  private day = '';
  constructor(private limit: number) {}

  /** Reserves characters; false if that would go over today's budget. */
  spend(key: string, chars: number, now = new Date()): boolean {
    const today = now.toISOString().slice(0, 10);
    if (today !== this.day) { this.day = today; this.used.clear(); }
    const total = (this.used.get(key) ?? 0) + chars;
    if (total > this.limit) return false;
    this.used.set(key, total);
    return true;
  }

  refund(key: string, chars: number) {
    this.used.set(key, Math.max(0, (this.used.get(key) ?? 0) - chars));
  }
}

/** Least-recently-used cache of generated audio, capped by total size. */
export class AudioCache {
  private items = new Map<string, Buffer>();
  private bytes = 0;
  constructor(private maxBytes: number) {}

  get(key: string): Buffer | undefined {
    const v = this.items.get(key);
    if (v) { this.items.delete(key); this.items.set(key, v); }
    return v;
  }

  set(key: string, value: Buffer) {
    if (value.length > this.maxBytes) return;
    const old = this.items.get(key);
    if (old) { this.bytes -= old.length; this.items.delete(key); }
    this.items.set(key, value);
    this.bytes += value.length;
    for (const [k, v] of this.items) {
      if (this.bytes <= this.maxBytes) break;
      this.items.delete(k);
      this.bytes -= v.length;
    }
  }
}
