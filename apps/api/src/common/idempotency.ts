export class IdempotencyConflictError extends Error {}

// Like a payment provider: far longer than any client retry, and memory stays bounded by a day of requests.
const TTL_MS = 24 * 60 * 60_000;

/** First answers by idempotency key. Not evicted by count: a key dropped while its retries can still arrive would apply twice. */
export class IdempotencyLog<T> {
  private readonly entries = new Map<string, { fingerprint: string; value: T; at: number }>();

  /** The first answer for this key, or undefined if the key is new. */
  replay(key: string, fingerprint: string): T | undefined {
    this.forgetExpired();
    const entry = this.entries.get(key);

    if (entry && entry.fingerprint !== fingerprint) throw new IdempotencyConflictError();
    return entry?.value;
  }

  record(key: string, fingerprint: string, value: T) {
    this.entries.set(key, { fingerprint, value, at: Date.now() });
  }

  private forgetExpired() {
    const cutoff = Date.now() - TTL_MS;

    // A Map iterates in insertion order, so the oldest keys come first.
    for (const [key, entry] of this.entries) {
      if (entry.at >= cutoff) break;
      this.entries.delete(key);
    }
  }
}
