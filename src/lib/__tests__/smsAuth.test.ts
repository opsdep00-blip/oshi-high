import { describe, it, expect, beforeEach, vi } from 'vitest';
import { _clearStore } from '../rateLimiter';

// Mock prisma to avoid real DB during these lightweight tests
vi.mock('@/lib/prisma', () => {
  const fn = vi.fn;
  const prisma = {
    verificationToken: {
      upsert: fn().mockResolvedValue({}),
    },
    user: {
      findUnique: fn().mockResolvedValue(null),
    },
  };
  return { prisma };
});

import * as smsAuth from '../smsAuth';

// Basic tests using in-memory DB mocking via Prisma Client stubbing is heavy.
// We'll test rate limit and error paths by calling sendSmsVerification with ENABLE_SMS_MOCK=true.

describe('smsAuth (basic)', () => {
  beforeEach(async () => {
    await _clearStore();
    process.env.ENABLE_SMS_MOCK = 'true';
  });

  it('sendSmsVerification returns structure', async () => {
    const r = await smsAuth.sendSmsVerification('09012345678');
    expect(r).toHaveProperty('phoneHash');
    expect(r).toHaveProperty('expiresIn');
    expect(r).toHaveProperty('isNewUser');
  });

  it('rate limits sends', async () => {
    process.env.SMS_SEND_LIMIT_PER_HOUR = '2';
    await smsAuth.sendSmsVerification('09012340000');
    await smsAuth.sendSmsVerification('09012340000');
    await expect(smsAuth.sendSmsVerification('09012340000')).rejects.toThrow(/Rate limit/);
  });
});