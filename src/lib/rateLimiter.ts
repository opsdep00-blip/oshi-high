// Proxy to choose a rate limiter backend implementation (memory or redis)
// Default: memory. Configure via RATE_LIMITER_BACKEND=redis and REDIS_URL env var for Redis.

const backend = process.env.RATE_LIMITER_BACKEND === 'redis' ? 'redis' : 'memory';

import * as mem from './rateLimiter.memory';

export const allowRequest = async (key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> => {
  if (backend === 'redis') {
    const redisImpl = await import('./rateLimiter.redis');
    return redisImpl.allowRequest(key, limit, windowMs) as Promise<{ allowed: boolean; remaining: number; retryAfter?: number }>;
  }
  return Promise.resolve(mem.allowRequest(key, limit, windowMs));
};

export const getCount = async (key: string): Promise<number> => {
  if (backend === 'redis') {
    const redisImpl = await import('./rateLimiter.redis');
    return redisImpl.getCount(key) as Promise<number>;
  }
  return Promise.resolve(mem.getCount(key));
};

export const resetKey = async (key: string): Promise<void> => {
  if (backend === 'redis') {
    const redisImpl = await import('./rateLimiter.redis');
    return redisImpl.resetKey(key) as Promise<void>;
  }
  return Promise.resolve(mem.resetKey(key));
};

export const _clearStore = async (): Promise<void> => {
  if (backend === 'redis') {
    const redisImpl = await import('./rateLimiter.redis');
    return redisImpl._clearStore() as Promise<void>;
  }
  return Promise.resolve(mem._clearStore());
};
