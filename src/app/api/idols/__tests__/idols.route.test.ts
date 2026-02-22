import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() }, idol: { findUnique: vi.fn(), update: vi.fn() } } }));

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { PATCH } from '@/app/api/idols/[id]/route';

async function makeRequest(body: object) {
  return new Request('https://example.test', { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}

describe('PATCH /api/idols/:id auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (auth as any).mockResolvedValue(null);

    const req = await makeRequest({ description: 'new' });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'i1' }) } as any);

    expect(res.status).toBe(401);
  });

  it('returns 403 when not owner nor admin', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'u1' } });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', role: 'FAN' });
    (prisma.idol.findUnique as any).mockResolvedValue({ id: 'i1', claimedBy: 'someone_else' });

    const req = await makeRequest({ description: 'new' });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'i1' }) } as any);

    expect(res.status).toBe(403);
  });

  it('allows claimed owner to update', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'owner' } });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'owner', role: 'IDOL' });
    (prisma.idol.findUnique as any).mockResolvedValue({ id: 'i1', claimedBy: 'owner' });
    (prisma.idol.update as any).mockResolvedValue({ id: 'i1', description: 'new' });

    const req = await makeRequest({ description: 'new' });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'i1' }) } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('allows admin to update', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'admin' } });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'admin', role: 'ADMIN' });
    (prisma.idol.findUnique as any).mockResolvedValue({ id: 'i1', claimedBy: 'someone_else' });
    (prisma.idol.update as any).mockResolvedValue({ id: 'i1', description: 'new' });

    const req = await makeRequest({ description: 'new' });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'i1' }) } as any);

    expect(res.status).toBe(200);
  });
});
