type Entry = { count: number; expiresAt: number };

const store = new Map<string, Entry>();

export function allowRequest(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.expiresAt <= now) {
    store.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count < limit) {
    entry.count += 1;
    store.set(key, entry);
    return { allowed: true, remaining: limit - entry.count };
  }

  // limit reached
  return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.expiresAt - now) / 1000) };
}

export function getCount(key: string): number {
  const entry = store.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return 0;
  return entry.count;
}

export function resetKey(key: string) {
  store.delete(key);
}

// For testing
export function _clearStore() {
  store.clear();
}
