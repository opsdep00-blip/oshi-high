import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn(), findMany: vi.fn() } } }));

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { GET } from '@/app/api/users/route';

describe('GET /api/users authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (auth as any).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns 403 when authenticated but not admin', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'u1' } });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', role: 'FAN' });

    const res = await GET();

    expect(res.status).toBe(403);
  });

  it('returns 200 and user list for admin', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'admin' } });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'admin', role: 'ADMIN' });
    (prisma.user.findMany as any).mockResolvedValue([{ id: 'u1' }]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
