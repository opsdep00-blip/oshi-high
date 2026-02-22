import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sms from '@/lib/sms';

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.SMS_PROVIDER;
  delete process.env.ENABLE_SMS_MOCK;
});

// DEPRECATED placeholder — legacy test file (filename contains legacy provider name)
describe('DEPRECATED: legacy sms provider test file', () => {
  it('deprecated placeholder', () => {
    // intentionally empty
  });
});
