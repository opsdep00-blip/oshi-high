import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sms from '@/lib/sms';

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.SMS_PROVIDER;
  delete process.env.ENABLE_SMS_MOCK;
});

describe('SMS provider (Firebase-only)', () => {
  it('does not export legacy provider functions', () => {
    const exported = Object.keys(sms);
    const legacySendVia = exported.filter((k) => k.startsWith('sendVia'));
    expect(legacySendVia.length).toBe(0);
  });

  it('throws when SMS_PROVIDER is set to unsupported value', async () => {
    process.env.SMS_PROVIDER = 'unsupported-provider';
    process.env.ENABLE_SMS_MOCK = 'false';

    await expect(
      sms.sendVerificationCode({ phoneHash: 'h', phone: '+819012345678', code: '123456' })
    ).rejects.toThrow(/Failed to send verification code/);
  });
});