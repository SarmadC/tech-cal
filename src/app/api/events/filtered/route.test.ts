// src/app/api/events/filtered/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { RECOMMENDATION_THRESHOLDS } from '@/config/recommendationThresholds';

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

const {
  mockGetEventsWithColdStartHandling,
  mockEnrichEventsWithCareerImpact,
  mockGetFilterCounts,
  mockGetEventIdsByTags,
  mockGetEventIdsByTagSearch,
  mockGetEventIdsByOrganizerSearch,
  mockGetRecommendedEventsByTags,
} = vi.hoisted(() => ({
  mockGetEventsWithColdStartHandling: vi.fn(),
  mockEnrichEventsWithCareerImpact: vi.fn(async (events: unknown[]) => events),
  mockGetFilterCounts: vi.fn(async () => ({
    format: { virtual: 0, 'in-person': 0, hybrid: 0 },
    cost: { free: 0, paid: 0 },
    categories: {}
  })),
  mockGetEventIdsByTags: vi.fn(),
  mockGetEventIdsByTagSearch: vi.fn(),
  mockGetEventIdsByOrganizerSearch: vi.fn(),
  mockGetRecommendedEventsByTags: vi.fn(),
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    getEventsWithColdStartHandling: mockGetEventsWithColdStartHandling,
    enrichEventsWithCareerImpact: mockEnrichEventsWithCareerImpact,
    getFilterCounts: mockGetFilterCounts,
    getEventIdsByTags: mockGetEventIdsByTags,
    getEventIdsByTagSearch: mockGetEventIdsByTagSearch,
    getEventIdsByOrganizerSearch: mockGetEventIdsByOrganizerSearch,
    getRecommendedEventsByTags: mockGetRecommendedEventsByTags,
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

// Mock @vercel/kv - define mocks inside factory to avoid hoisting issues
vi.mock('@vercel/kv', () => {
  const mockKvGet = vi.fn().mockResolvedValue(null);
  const mockKvSet = vi.fn().mockResolvedValue(undefined);
  return {
    kv: {
      get: mockKvGet,
      set: mockKvSet
    }
  };
});

// Mock Ratelimit - define class inside factory to avoid hoisting issues
vi.mock('@upstash/ratelimit', () => {
  const mockRateLimit = vi.fn().mockResolvedValue({ success: true });
  class RatelimitMock {
    limit = mockRateLimit;
    constructor() {}
    static slidingWindow() {
      return vi.fn();
    }
  }
  return {
    Ratelimit: RatelimitMock
  };
});

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
    mockGetEventsWithColdStartHandling.mockReset();
    mockEnrichEventsWithCareerImpact.mockReset();
    mockGetFilterCounts.mockReset();
    mockGetEventIdsByTags.mockReset();
    mockGetEventIdsByTagSearch.mockReset();
    mockGetEventIdsByOrganizerSearch.mockReset();
    mockGetRecommendedEventsByTags.mockReset();
    mockGetCareerProfile.mockReset();
    mockRequireOnboardedApi.mockReset();

    mockEnrichEventsWithCareerImpact.mockImplementation(async (events: unknown[]) => events);
    mockGetFilterCounts.mockResolvedValue({
      format: { virtual: 0, 'in-person': 0, hybrid: 0 },
      cost: { free: 0, paid: 0 },
      categories: {}
    });
    mockGetEventIdsByTags.mockResolvedValue([]);
    mockGetEventIdsByTagSearch.mockResolvedValue([]);
    mockGetEventIdsByOrganizerSearch.mockResolvedValue([]);
    mockGetRecommendedEventsByTags.mockResolvedValue([]);
    mockGetCareerProfile.mockResolvedValue(null);
    mockRequireOnboardedApi.mockResolvedValue(undefined);
  });

  it('passes budget and implies USD gating via RPC (currency handled server-side)', async () => {
    mockGetEventsWithColdStartHandling.mockResolvedValueOnce({ events: [], totalCount: 0, isColdStart: false });
    mockEnrichEventsWithCareerImpact.mockResolvedValueOnce([]);

    const req = buildRequest({ budget: 'low', page: 1, pageSize: 10 });
    const res = await POST(req as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.data.counts).toBeDefined();
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

  it('keeps tag + search semantics as intersection (AND)', async () => {
    mockGetEventIdsByTags.mockResolvedValueOnce(['tag-1', 'tag-2']);
    mockGetEventIdsByTagSearch.mockResolvedValue(['tag-2', 'search-only']);
    mockGetEventIdsByOrganizerSearch.mockResolvedValue([]);
    mockGetEventsWithColdStartHandling.mockResolvedValueOnce({ events: [], totalCount: 0, isColdStart: false });
    mockEnrichEventsWithCareerImpact.mockResolvedValueOnce([]);

    const req = buildRequest({
      tags: ['frontend'],
      searchTerm: 'react',
      page: 1,
      pageSize: 10
    });
    const res = await POST(req as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(mockGetEventIdsByTags).toHaveBeenCalledWith(
      ['frontend'],
      expect.anything(),
      expect.anything(),
      'all'
    );
    const [filters] = mockGetEventsWithColdStartHandling.mock.calls[0];
    expect(filters.eventIds).toEqual(['tag-2']);
  });

  it('applies recommended filter using configured threshold', async () => {
    const baseEvents = [
      {
        id: 'below-threshold',
        title: 'Below',
        startTime: '2026-01-01T10:00:00Z',
        description: '',
        careerImpact: { overall: RECOMMENDATION_THRESHOLDS.RECOMMENDED - 1 }
      },
      {
        id: 'at-threshold',
        title: 'At',
        startTime: '2026-01-02T10:00:00Z',
        description: '',
        careerImpact: { overall: RECOMMENDATION_THRESHOLDS.RECOMMENDED }
      },
      {
        id: 'above-threshold',
        title: 'Above',
        startTime: '2026-01-03T10:00:00Z',
        description: '',
        careerImpact: { overall: RECOMMENDATION_THRESHOLDS.RECOMMENDED + 1 }
      }
    ] as unknown[];

    mockGetEventsWithColdStartHandling.mockResolvedValueOnce({
      events: baseEvents,
      totalCount: 3,
      isColdStart: false
    });

    const req = buildRequest({ recommended: true, page: 1, pageSize: 10 });
    const res = await POST(req as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(mockEnrichEventsWithCareerImpact).not.toHaveBeenCalled();
    expect(data.data.events.map((e: { id: string }) => e.id)).toEqual(['at-threshold', 'above-threshold']);
    expect(data.data.pagination.total).toBe(2);
    const [filters] = mockGetEventsWithColdStartHandling.mock.calls[0];
    expect(filters.recommended).toBeUndefined();
  });

  it('paginates recommended results after thresholding instead of before', async () => {
    const baseEvents = [
      {
        id: 'low-1',
        title: 'Low 1',
        startTime: '2026-01-01T10:00:00Z',
        description: '',
        careerImpact: { overall: RECOMMENDATION_THRESHOLDS.RECOMMENDED - 5 }
      },
      {
        id: 'high-1',
        title: 'High 1',
        startTime: '2026-01-02T10:00:00Z',
        description: '',
        careerImpact: { overall: RECOMMENDATION_THRESHOLDS.RECOMMENDED + 3 }
      },
      {
        id: 'low-2',
        title: 'Low 2',
        startTime: '2026-01-03T10:00:00Z',
        description: '',
        careerImpact: { overall: RECOMMENDATION_THRESHOLDS.RECOMMENDED - 2 }
      },
      {
        id: 'high-2',
        title: 'High 2',
        startTime: '2026-01-04T10:00:00Z',
        description: '',
        careerImpact: { overall: RECOMMENDATION_THRESHOLDS.RECOMMENDED + 6 }
      },
      {
        id: 'high-3',
        title: 'High 3',
        startTime: '2026-01-05T10:00:00Z',
        description: '',
        careerImpact: { overall: RECOMMENDATION_THRESHOLDS.RECOMMENDED + 9 }
      }
    ] as unknown[];

    mockGetEventsWithColdStartHandling.mockResolvedValueOnce({
      events: baseEvents,
      totalCount: baseEvents.length,
      isColdStart: false
    });

    const req = buildRequest({ recommended: true, page: 1, pageSize: 2 });
    const res = await POST(req as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.data.events.map((e: { id: string }) => e.id)).toEqual(['high-1', 'high-2']);
    expect(data.data.pagination.total).toBe(3);
    expect(data.data.pagination.hasMore).toBe(true);
  });

  it('surfaces a personalized supplement event for career-impact sort when it is outside the broad candidate window', async () => {
    const configEventId = 'e6f98ab0-720a-4d2b-8ee6-5646146f51bc';
    const broadEvents = Array.from({ length: 10 }, (_, index) => ({
      id: `broad-${index + 1}`,
      title: `Broad ${index + 1}`,
      startTime: `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
      description: '',
    }));
    const configEvent = {
      id: configEventId,
      title: 'Config 2026',
      startTime: '2026-02-20T10:00:00Z',
      description: '',
    };

    mockGetCareerProfile.mockResolvedValueOnce({
      currentRole: 'UX Designer',
      seniority: 'junior',
      industry: 'technology',
      primarySkills: ['Figma', 'Wireframing'],
      skillsToLearn: ['Framer'],
      interests: ['UI/UX Design'],
      careerGoals: ['skill-development'],
      learningStyle: ['hands-on'],
      networkingGoals: ['find-peers'],
      preferredEventTypes: ['networking'],
    });
    mockGetEventsWithColdStartHandling.mockImplementation(async (filters: { eventIds?: string[] }) => {
      if (filters.eventIds) {
        return {
          events: [configEvent],
          totalCount: 1,
          isColdStart: false,
        };
      }

      return {
        events: broadEvents,
        totalCount: 964,
        isColdStart: false,
      };
    });
    mockGetRecommendedEventsByTags.mockResolvedValueOnce([configEvent]);
    mockEnrichEventsWithCareerImpact.mockImplementationOnce(async (events: unknown[]) => (
      (events as Array<{ id: string }>).map((event, index) => ({
        ...event,
        careerImpact: {
          overall: event.id === configEventId ? 99 : 80 - index,
        },
      }))
    ));

    const req = buildRequest({ sortBy: 'career-impact', sortDirection: 'desc', page: 1, pageSize: 2 });
    const res = await POST(req as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const data = await res.json();

    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(mockGetRecommendedEventsByTags).toHaveBeenCalledTimes(1);
    expect(mockGetEventsWithColdStartHandling).toHaveBeenCalledTimes(2);
    expect(mockGetEventsWithColdStartHandling.mock.calls[1][0].eventIds).toEqual([configEventId]);
    expect(data.data.events.map((e: { id: string }) => e.id)).toEqual([configEventId, 'broad-1']);
    expect(data.data.pagination.total).toBe(964);
  });

  it('changes the filtered-route cache key when the career profile fingerprint changes', async () => {
    mockGetEventsWithColdStartHandling.mockResolvedValue({ events: [], totalCount: 0, isColdStart: false });
    mockEnrichEventsWithCareerImpact.mockResolvedValue([]);
    mockGetCareerProfile
      .mockResolvedValueOnce({
        currentRole: 'Designer',
        primarySkills: ['Figma'],
        skillsToLearn: [],
        interests: [],
        careerGoals: [],
        learningStyle: [],
        networkingGoals: [],
        preferredEventTypes: [],
      })
      .mockResolvedValueOnce({
        currentRole: 'Designer',
        primarySkills: ['Framer'],
        skillsToLearn: [],
        interests: [],
        careerGoals: [],
        learningStyle: [],
        networkingGoals: [],
        preferredEventTypes: [],
      });

    const firstResponse = await POST(buildRequest({ page: 1, pageSize: 10 }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const secondResponse = await POST(buildRequest({ page: 1, pageSize: 10 }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    expect(firstResponse.headers.get('X-Cache-Key')).toMatch(/^fe5:/);
    expect(firstResponse.headers.get('X-Cache-Key')).not.toBe(secondResponse.headers.get('X-Cache-Key'));
  });

  it('changes the filtered-route cache key when fastSearch changes', async () => {
    mockGetEventsWithColdStartHandling.mockResolvedValue({ events: [], totalCount: 0, isColdStart: false });
    mockEnrichEventsWithCareerImpact.mockResolvedValue([]);

    const fastSearchResponse = await POST(buildRequest({
      searchTerm: 'figma',
      fastSearch: true,
      page: 1,
      pageSize: 10
    }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    const standardResponse = await POST(buildRequest({
      searchTerm: 'figma',
      fastSearch: false,
      page: 1,
      pageSize: 10
    }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    expect(fastSearchResponse.headers.get('X-Cache-Key')).toMatch(/^fe5:/);
    expect(fastSearchResponse.headers.get('X-Cache-Key')).not.toBe(standardResponse.headers.get('X-Cache-Key'));
  });

  it('does not use the personalized supplement path during fastSearch requests', async () => {
    mockGetCareerProfile.mockResolvedValueOnce({
      currentRole: 'UX Designer',
      seniority: 'junior',
      industry: 'technology',
      primarySkills: ['Figma'],
      skillsToLearn: ['Framer'],
      interests: ['UI/UX Design'],
      careerGoals: ['skill-development'],
      learningStyle: ['hands-on'],
      networkingGoals: ['find-peers'],
      preferredEventTypes: ['networking'],
    });
    mockGetEventsWithColdStartHandling.mockResolvedValueOnce({
      events: [],
      totalCount: 0,
      isColdStart: false,
    });

    const response = await POST(buildRequest({
      searchTerm: 'figma',
      sortBy: 'career-impact',
      fastSearch: true,
      page: 1,
      pageSize: 10,
    }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    expect(response.ok).toBe(true);
    expect(mockGetRecommendedEventsByTags).not.toHaveBeenCalled();
    expect(mockGetEventsWithColdStartHandling).toHaveBeenCalledTimes(1);
  });

  it('keeps advanced reranked order for descending career-impact sort', async () => {
    const previousRerank = process.env.DISCOVERY_RERANK;
    process.env.DISCOVERY_RERANK = 'advanced';

    try {
      mockGetEventsWithColdStartHandling.mockReset();
      mockEnrichEventsWithCareerImpact.mockReset();

      mockGetEventsWithColdStartHandling.mockResolvedValue({
        events: [
          { id: 'a', title: 'A', startTime: '2026-01-01T10:00:00Z', description: '' },
          { id: 'b', title: 'B', startTime: '2026-01-02T10:00:00Z', description: '' }
        ],
        totalCount: 2,
        isColdStart: false
      });

      // Simulate canonical enrichment + rerank output order (b before a),
      // where raw careerImpact scores would otherwise sort as a before b.
      mockEnrichEventsWithCareerImpact.mockResolvedValue([
        {
          id: 'b',
          title: 'B',
          startTime: '2026-01-02T10:00:00Z',
          description: '',
          careerImpact: { overall: 80 }
        },
        {
          id: 'a',
          title: 'A',
          startTime: '2026-01-01T10:00:00Z',
          description: '',
          careerImpact: { overall: 95 }
        }
      ]);

      const req = buildRequest({ sortBy: 'career-impact', sortDirection: 'desc', page: 1, pageSize: 10 });
      const res = await POST(req as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      const data = await res.json();

      expect(res.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(mockEnrichEventsWithCareerImpact).toHaveBeenCalledTimes(1);
      expect(data.data.events.map((e: { id: string }) => e.id)).toEqual(['b', 'a']);
    } finally {
      if (previousRerank === undefined) {
        delete process.env.DISCOVERY_RERANK;
      } else {
        process.env.DISCOVERY_RERANK = previousRerank;
      }
    }
  });
});
