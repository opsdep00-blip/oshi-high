// Avoid importing ioredis types at top-level so tsc doesn't fail if package isn't installed yet
type Redis = {
  eval: (script: string, numKeys: number, key: string, arg: number) => Promise<[string | number, string | number]>;
  get?: (key: string) => Promise<string | null>;
  del?: (key: string) => Promise<void>;
  flushdb?: () => Promise<void>;
};
let client: Redis | null = null;

function getClient(): Redis {
  if (client) return client as Redis;

  if (process.env.NODE_ENV === 'test') {
    // Use ioredis-mock in tests to avoid real Redis dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RedisMock = require('ioredis-mock').default || require('ioredis-mock');
    client = new RedisMock();
    return client as Redis;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const IORedis = require('ioredis');
  client = new IORedis(process.env.REDIS_URL);
  return client as Redis;
}

// Lua script: INCR the key and set PEXPIRE when newly created, then return current and PTTL
const LUA_INCR_PEXPIRE = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}
`;

export async function allowRequest(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const redis = getClient();
  const res = await redis.eval(LUA_INCR_PEXPIRE, 1, key, windowMs);
  // res is [current, ttl]
  const arr = res as [string | number, string | number];
  const current = parseInt(String(arr[0]), 10);
  const ttl = parseInt(String(arr[1]), 10);

  const allowed = current <= limit;
  const remaining = allowed ? Math.max(0, limit - current) : 0;
  const retryAfter = allowed ? undefined : Math.ceil((ttl || 0) / 1000);

  return { allowed, remaining, retryAfter };
}

export async function getCount(key: string): Promise<number> {
  const redis = getClient();
  const res = await redis.get?.(key);
  if (!res) return 0;
  return parseInt(res, 10) || 0;
}

export async function resetKey(key: string) {
  const redis = getClient();
  await redis.del?.(key);
}

// For tests only; flush DB in test environment
export async function _clearStore() {
  if (process.env.NODE_ENV !== 'test') {
    // don't allow accidental flush in non-test environments
    return;
  }
  const redis = getClient();
  if (redis && typeof (redis as Redis).flushdb === 'function') {
    await (redis as Redis).flushdb?.();
  }
}
