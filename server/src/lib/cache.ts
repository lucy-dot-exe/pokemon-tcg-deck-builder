/** A small in-memory cache: entries expire after `ttlMs`, and the oldest is evicted once `maxEntries` is reached. */
export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly options: { ttlMs: number; maxEntries: number }) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.delete(key);
    if (this.entries.size >= this.options.maxEntries) {
      // Maps iterate in insertion order, so the first key is the oldest.
      this.entries.delete(this.entries.keys().next().value!);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.options.ttlMs });
  }
}
