import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { GET } from '../route';

const {
  mockRateLimit,
  mockAuthGetUser,
  mockRequireOnboardedApi,
  mockEventSingle,
  mockGetCareerProfile,
  mockRankEvents,
  mockToApp,
} = vi.hoisted(() => ({
  mockRateLimit: vi.fn(),
  mockAuthGetUser: vi.fn(),
  mockRequireOnboardedApi: vi.fn(),
  mockEventSingle: vi.fn(),
  mockGetCareerProfile: vi.fn(),
  mockRankEvents: vi.fn(),
  mockToApp: vi.fn(),
}));

vi.mock('@vercel/kv', () => ({
  kv: {},
}));

vi.mock('@upstash/ratelimit', () => {
  class RatelimitMock {
    limit = mockRateLimit;
    constructor() {}
    static slidingWindow() {
      return vi.fn();
    }
  }

  return {
    Ratelimit: RatelimitMock,
  };
});

const mockSupabase = {
  auth: {
    getUser: (...args: unknown[]) => mockAuthGetUser(...args),
  },
  from: vi.fn((table: string) => {
    if (table === 'events_detailed') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: (...args: unknown[]) => mockEventSingle(...args),
          })),
        })),
      };
    }

    return {
      select: vi.fn(),
    };
  }),
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/utils/onboarding', () => ({
  requireOnboardedApi: (...args: unknown[]) => mockRequireOnboardedApi(...args),
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    getCareerProfile: (...args: unknown[]) => mockGetCareerProfile(...args),
  },
}));

vi.mock('@/services/recommendations/canonicalRankingService', () => ({
  rankEventsWithCanonicalPipeline: (...args: unknown[]) => mockRankEvents(...args),
}));

vi.mock('@/utils/transformers', () => ({
  eventDetailedTransformer: {
    toApp: (...args: unknown[]) => mockToApp(...args),
  },
}));

const baseEvent = {
  id: 'event-1',
  createdAt: '2026-01-01T00:00:00Z',
  title: 'AI Leadership Summit',
  description: 'A practical conference for engineering leaders.',
  organizer: 'Tech Guild',
  location: 'San Francisco',
  status: 'confirmed',
  startTime: '2026-05-01T16:00:00Z',
  endTime: '2026-05-01T23:00:00Z',
  timezone: 'PT',
  sourceUrl: 'https://example.com/event-1',
  livestreamUrl: null,
  eventTypeId: 'event-type-1',
  eventFormat: 'In-person' as const,
  priceRange: '$499 - $899',
  priceMin: 499,
  registrationUrl: 'https://example.com/register',
  tags: [
    { id: 'tag-1', name: 'Leadership', color: '#123456', category: 'career' },
    { id: 'tag-2', name: 'AI', color: '#654321', category: 'tech' },
  ],
  speakerLineup: [
    { id: 'sp-1', name: 'Jane Doe', title: 'CTO', company: 'Acme' },
  ],
  difficulty: 'intermediate' as const,
  targetAudience: 'Engineering managers',
};

const baseCareerProfile = {
  userId: 'user-1',
  profileId: 'profile-1',
  lastUpdated: '2026-01-01T00:00:00Z',
  currentRole: 'Senior Software Engineer',
  seniority: 'senior',
  industry: 'Technology/Software',
  companySize: 'medium',
  primarySkills: ['React', 'TypeScript'],
  skillsToLearn: ['Leadership', 'System Design'],
  interests: ['AI'],
  skillTags: [],
  careerGoals: ['leadership-growth', 'skill-development'],
  timeframe: 'short-term',
  learningStyle: ['interactive'],
  availableTime: 'moderate',
  budget: 'high',
  networkingGoals: ['find-peers'],
  preferredEventTypes: ['conference'],
};

const scoredEvent = {
  ...baseEvent,
  isCareerScored: true,
  careerImpact: {
    overall: 87,
    confidence: 0.91,
    components: {
      skillRelevance: 82,
      careerStageMatch: 90,
      networkingValue: 88,
      industryRelevance: 86,
      timingBonus: 80,
    },
    explanation: {
      reasons: ['Strong leadership alignment', 'High networking opportunity', 'Advanced AI sessions'],
      matchedSkills: ['Leadership', 'System Design'],
      speakerHighlights: [],
      careerImpactCategory: 'high' as const,
      confidenceFactors: [],
      matchedGoals: ['leadership-growth', 'skill-development'],
    },
    metadata: {
      algorithmVersion: 'alignment-core-v1',
      calculatedAt: '2026-01-01T00:00:00Z',
      careerProfileHash: 'hash-1',
      eventDataHash: 'hash-2',
    },
  },
};

const makeRequest = () =>
  new Request('http://localhost/api/events/event-1/manager-justification') as unknown as Parameters<typeof GET>[0];

const makeParams = (id = 'event-1') => Promise.resolve({ id });

describe('GET /api/events/[id]/manager-justification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockRequireOnboardedApi.mockResolvedValue(null);
    mockEventSingle.mockResolvedValue({ data: { id: 'event-row-1' }, error: null });
    mockToApp.mockReturnValue(baseEvent);
    mockGetCareerProfile.mockResolvedValue(baseCareerProfile);
    mockRankEvents.mockResolvedValue([scoredEvent]);
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockAuthGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const response = await GET(makeRequest(), { params: makeParams() });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Authentication required');
  });

  it('returns 412 when onboarding guard blocks request', async () => {
    mockRequireOnboardedApi.mockResolvedValueOnce(
      NextResponse.json({ success: false, error: 'Onboarding required' }, { status: 412 })
    );

    const response = await GET(makeRequest(), { params: makeParams() });
    const data = await response.json();

    expect(response.status).toBe(412);
    expect(data.success).toBe(false);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('returns 404 when event is not found', async () => {
    mockEventSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows' },
    });

    const response = await GET(makeRequest(), { params: makeParams('missing-event') });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Event not found');
  });

  it('returns 500 for non-not-found event query failures', async () => {
    mockEventSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '57014', message: 'Query timeout' },
    });

    const response = await GET(makeRequest(), { params: makeParams('event-timeout') });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to fetch event details');
  });

  it('returns 422 when career profile is missing after onboarding guard', async () => {
    mockGetCareerProfile.mockResolvedValueOnce(null);

    const response = await GET(makeRequest(), { params: makeParams() });
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Career profile required');
  });

  it('returns 422 on enrichment soft-fail when event is not scored', async () => {
    mockRankEvents.mockResolvedValueOnce([
      {
        ...baseEvent,
        isCareerScored: false,
        careerImpact: {
          ...scoredEvent.careerImpact,
          overall: 0,
        },
      },
    ]);

    const response = await GET(makeRequest(), { params: makeParams() });
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unable to generate career impact score');
  });

  it('falls back to base scoring when canonical enrichment returns no result', async () => {
    mockRankEvents.mockResolvedValueOnce([]);

    const response = await GET(makeRequest(), { params: makeParams() });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.impact.topReasons.length).toBeGreaterThan(0);
    expect(data.data.impact.confidence).toBe(0.65);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockRateLimit.mockResolvedValueOnce({ success: false });

    const response = await GET(makeRequest(), { params: makeParams() });
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
  });

  it('returns 200 with expected response shape and no-store header', async () => {
    const response = await GET(makeRequest(), { params: makeParams() });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.event.title).toBe(baseEvent.title);
    expect(data.data.event.tags).toEqual(['Leadership', 'AI']);
    expect(data.data.event.speakers).toEqual([
      { name: 'Jane Doe', title: 'CTO', company: 'Acme' },
    ]);
    expect(data.data.profile.currentRole).toBe(baseCareerProfile.currentRole);
    expect(data.data.impact.overall).toBe(87);
    expect(data.data.impact.matchedGoals).toEqual(['leadership-growth', 'skill-development']);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
