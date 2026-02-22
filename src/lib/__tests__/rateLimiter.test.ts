import { describe, it, expect, beforeEach } from 'vitest';
import * as mem from '../rateLimiter.memory';
import * as redis from '../rateLimiter.redis';

type RateLimiterAPI = {
  allowRequest: (key: string, limit: number, windowMs: number) => Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> | { allowed: boolean; remaining: number; retryAfter?: number };
  _clearStore: () => Promise<void> | void;
};

async function runTests(api: RateLimiterAPI) {
  await Promise.resolve(api._clearStore());

  const key = 'test:1';
  const limit = 3;
  const windowMs = 1000 * 60; // 1 minute

  let res = await Promise.resolve(api.allowRequest(key, limit, windowMs));
  expect(res.allowed).toBe(true);

  res = await Promise.resolve(api.allowRequest(key, limit, windowMs));
  expect(res.allowed).toBe(true);

  res = await Promise.resolve(api.allowRequest(key, limit, windowMs));
  expect(res.allowed).toBe(true);

  const last = await Promise.resolve(api.allowRequest(key, limit, windowMs));
  expect(last.allowed).toBe(false);
  expect(last.remaining).toBe(0);
}

describe('rateLimiter - memory', () => {
  beforeEach(() => mem._clearStore());

  it('allows requests under limit', async () => {
    await runTests(mem);
  });
});

if (process.env.NO_REDIS_TESTS !== 'true') {
  describe('rateLimiter - redis (mock in test)', () => {
    beforeEach(async () => await redis._clearStore());

    it('allows requests under limit', async () => {
      await runTests(redis);
    });
  });
}