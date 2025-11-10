// src/app/api/events/filtered/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const mockSupabaseAuthGetUser = vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null }));
const mockProfilesSelect = vi.fn(() => ({
  eq: vi.fn(() => ({
    single: vi.fn().mockResolvedValue({ data: { analytics_consent: false }, error: null })
  }))
}));
const mockEventTypeSelect = vi.fn(() => ({
  order: vi.fn().mockResolvedValue({ data: [] })
}));
const mockSupabase = {
  auth: { getUser: mockSupabaseAuthGetUser },
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return { select: mockProfilesSelect };
    }
    if (table === 'event_type') {
      return { select: mockEventTypeSelect };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      }))
    };
  })
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase)
}));

const mockGetEventsWithColdStartHandling = vi.fn();
const mockEnrichEventsWithCareerImpact = vi.fn(async (events: unknown[]) => events);
vi.mock('@/services/eventServices', () => ({
  EventService: {
    getEventsWithColdStartHandling: (...args: any[]) => mockGetEventsWithColdStartHandling(...args), // eslint-disable-line @typescript-eslint/no-explicit-any
    enrichEventsWithCareerImpact: (...args: any[]) => mockEnrichEventsWithCareerImpact(...args) // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}));

const mockGetCareerProfile = vi.fn().mockResolvedValue(null);
vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: { getCareerProfile: (...args: any[]) => mockGetCareerProfile(...args) } // eslint-disable-line @typescript-eslint/no-explicit-any
}));

const mockRequireOnboardedApi = vi.fn().mockResolvedValue(undefined);
vi.mock('@/utils/onboarding', () => ({
  requireOnboardedApi: (...args: any[]) => mockRequireOnboardedApi(...args) // eslint-disable-line @typescript-eslint/no-explicit-any
}));

const mockKvGet = vi.fn().mockResolvedValue(null);
const mockKvSet = vi.fn().mockResolvedValue(undefined);
vi.mock('@vercel/kv', () => ({
  kv: {
    get: mockKvGet,
    set: mockKvSet
  }
}));

const mockRateLimit = vi.fn().mockResolvedValue({ success: true });
class RatelimitMock {
  limit = mockRateLimit;
  constructor() {}
  static slidingWindow() {
    return vi.fn();
  }
}
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: RatelimitMock
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
    mockGetEventsWithColdStartHandling.mockResolvedValueOnce({ events: [], totalCount: 0, isColdStart: false });
    mockEnrichEventsWithCareerImpact.mockResolvedValueOnce([]);

    const req = buildRequest({ budget: 'low', page: 1, pageSize: 10 });
    const res = await POST(req as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);
    // Ensure we called RPC with filters containing budget
    expect(mockGetEventsWithColdStartHandling).toHaveBeenCalled();
    const [filters] = mockGetEventsWithColdStartHandling.mock.calls[0];
    expect(filters.budget).toBe('low');
  });

  it('treats budget=all as no gating', async () => {
    mockGetEventsWithColdStartHandling.mockResolvedValueOnce({ events: [], totalCount: 0, isColdStart: false });
    mockEnrichEventsWithCareerImpact.mockResolvedValueOnce([]);

    const req = buildRequest({ budget: 'all', page: 1, pageSize: 10 });
    const res = await POST(req as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);
    const [filters] = mockGetEventsWithColdStartHandling.mock.calls[0];
    expect(filters.budget).toBeUndefined();
  });
});


