import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock prisma module; specific mocks configured per-test
vi.mock('@/lib/prisma', () => {
  const fn = vi.fn;
  const prisma = {
    verificationToken: {
      findUnique: fn(),
      delete: fn(),
      upsert: fn(),
    },
    user: {
      findUnique: fn(),
      create: fn(),
      update: fn(),
    },
    account: {
      create: fn(),
    },
  };
  return { prisma };
});

import { prisma } from '@/lib/prisma';
import { phoneToHash } from '../phoneHash';

async function reloadSmsAuth() {
  // Ensure modules pick up environment changes (e.g., RATE_LIMITER_BACKEND)
  vi.resetModules();
  return await import('@/lib/smsAuth');
}

describe('smsAuth.verifySmsCode (mock mode)', () => {
  beforeEach(() => {
    // reset module mocks and default env
    vi.clearAllMocks();
    process.env.ENABLE_SMS_MOCK = 'true';
  });

  it('signup: creates a new user when none exists', async () => {
    const { verifySmsCode } = await reloadSmsAuth();

    const phone = '09012340001';
    const code = '999999';
    const phoneHash = phoneToHash(phone);

    // Token exists and not expired
    (prisma.verificationToken.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ identifier: phoneHash, token: code, expires: new Date(Date.now() + 1000 * 60) });
    (prisma.verificationToken.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    // No existing user
    (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    // Simulate user.create returning created user
    (prisma.user.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 123, phoneHash, role: 'FAN', accounts: [{ provider: 'sms' }] });

    const result = await verifySmsCode({ phone }, code, 'signup');

    expect(result).toHaveProperty('user');
    expect(result.isNewUser).toBe(true);
    expect((prisma.user.create as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    const createdArg = (prisma.user.create as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createdArg.data.phoneHash).toBe(phoneHash);
  });

  it('signin: unknown phone returns 404', async () => {
    const { verifySmsCode } = await reloadSmsAuth();

    const phone = '09012349999';
    const code = '111111';
    const phoneHash = phoneToHash(phone);

    (prisma.verificationToken.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ identifier: phoneHash, token: code, expires: new Date(Date.now() + 1000 * 60) });
    (prisma.verificationToken.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(verifySmsCode({ phone }, code, 'signin')).rejects.toMatchObject({ status: 404 });
  });

  it('existing user without sms account gets an account created', async () => {
    const { verifySmsCode } = await reloadSmsAuth();

    const phone = '09012348888';
    const code = '222222';
    const phoneHash = phoneToHash(phone);

    (prisma.verificationToken.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ identifier: phoneHash, token: code, expires: new Date(Date.now() + 1000 * 60) });
    (prisma.verificationToken.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    // user exists but has no sms account
    (prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 500, phoneHash, accounts: [{ provider: 'twitter' }] });

    (prisma.account.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 77, provider: 'sms' });

    const res = await verifySmsCode({ phone }, code, 'signup');

    expect(res.isNewUser).toBe(false);
    expect((prisma.account.create as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    const arg = (prisma.account.create as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.data.provider).toBe('sms');
    expect(arg.data.providerAccountId).toBe(phoneHash);
  });
});

describe('smsAuth.sendSmsVerification with redis rate limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('respects rate limit when backend=redis', async () => {
    process.env.RATE_LIMITER_BACKEND = 'redis';
    vi.stubEnv('NODE_ENV', 'test'); // ensure ioredis-mock is used
    process.env.ENABLE_SMS_MOCK = 'true';
    process.env.SMS_SEND_LIMIT_PER_HOUR = '2';

    const { sendSmsVerification } = await reloadSmsAuth();

    // clear redis store (mock)
    const rl = await import('@/lib/rateLimiter');
    await rl._clearStore();

    await sendSmsVerification('09055550001');
    await sendSmsVerification('09055550001');

    await expect(sendSmsVerification('09055550001')).rejects.toThrow(/Rate limit/);
  });
});
