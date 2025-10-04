// src/app/api/events/filtered/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock createClient and EventService
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })) },
  }))
}));

const mockGetEventsWithRPC = vi.fn();
vi.mock('@/services/eventServices', () => ({
  EventService: { getEventsWithRPC: (...args: any[]) => mockGetEventsWithRPC(...args) } // eslint-disable-line @typescript-eslint/no-explicit-any
}));

function buildRequest(body: unknown) {
  return new Request('http://localhost/api/events/filtered', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('POST /api/events/filtered - budget and USD gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes budget and implies USD gating via RPC (currency handled server-side)', async () => {
    mockGetEventsWithRPC.mockResolvedValueOnce({ events: [], totalCount: 0 });

    const req = buildRequest({ budget: 'low', page: 1, pageSize: 10 });
    const res = await POST(req as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);
    // Ensure we called RPC with filters containing budget
    expect(mockGetEventsWithRPC).toHaveBeenCalled();
    const [filters] = mockGetEventsWithRPC.mock.calls[0];
    expect(filters.budget).toBe('low');
  });

  it('treats budget=all as no gating', async () => {
    mockGetEventsWithRPC.mockResolvedValueOnce({ events: [], totalCount: 0 });

    const req = buildRequest({ budget: 'all', page: 1, pageSize: 10 });
    const res = await POST(req as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);
    const [filters] = mockGetEventsWithRPC.mock.calls[0];
    expect(filters.budget).toBe('all');
  });
});


