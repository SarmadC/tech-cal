import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Event } from '@/types';
import { GET } from './route';

const {
  mockRateLimit,
  mockAuthGetUser,
  mockProfilesSingle,
  mockSearchEventsByTags,
  mockGetRecommendedEventsByTags,
  mockEnrichEventsWithCareerImpact,
  mockGetUserProfile,
  mockGetCareerProfile,
  mockLogTelemetryEvent
} = vi.hoisted(() => ({
  mockRateLimit: vi.fn(),
  mockAuthGetUser: vi.fn(),
  mockProfilesSingle: vi.fn(),
  mockSearchEventsByTags: vi.fn(),
  mockGetRecommendedEventsByTags: vi.fn(),
  mockEnrichEventsWithCareerImpact: vi.fn(),
  mockGetUserProfile: vi.fn(),
  mockGetCareerProfile: vi.fn(),
  mockLogTelemetryEvent: vi.fn()
}));

vi.mock('@vercel/kv', () => ({
  kv: {}
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
    Ratelimit: RatelimitMock
  };
});

const mockSupabase = {
  auth: {
    getUser: (...args: unknown[]) => mockAuthGetUser(...args)
  },
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: (...args: unknown[]) => mockProfilesSingle(...args)
          }))
        }))
      };
    }
    if (table === 'circle_members') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
    };
  })
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase)
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    searchEventsByTags: (...args: unknown[]) => mockSearchEventsByTags(...args),
    getRecommendedEventsByTags: (...args: unknown[]) => mockGetRecommendedEventsByTags(...args),
    enrichEventsWithCareerImpact: (...args: unknown[]) => mockEnrichEventsWithCareerImpact(...args)
  }
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
    getCareerProfile: (...args: unknown[]) => mockGetCareerProfile(...args)
  }
}));

vi.mock('@/utils/supabase/telemetry', () => ({
  logTelemetryEvent: (...args: unknown[]) => mockLogTelemetryEvent(...args)
}));

function buildEvent(id: string, rank: number): Event & { recommendationMetadata: Record<string, unknown> } {
  return {
    id,
    createdAt: '2024-01-01T00:00:00Z',
    title: `Event ${id}`,
    description: 'Test event',
    organizer: 'Kure',
    location: 'Online',
    status: 'active',
    startTime: '2024-06-01T09:00:00Z',
    endTime: null,
    sourceUrl: `https://example.com/${id}`,
    livestreamUrl: null,
    eventTypeId: 'workshop',
    tags: [{ id: `tag-${id}`, name: `Tag ${id}`, color: '#000000', category: 'Tech' }],
    recommendationMetadata: {
      matchedTags: [`Tag ${id}`],
      matchExplanation: `Reason ${id}`,
      matchScore: 50,
      impactScore: 40,
      profileBoost: 5,
      recencyBoost: 2,
      popularityBoost: 1,
      totalScore: 100 - rank,
      reasons: [`Reason ${id}`],
      tagRank: rank
    }
  };
}

const baseEvents = [
  buildEvent('event-1', 1),
  buildEvent('event-2', 2),
  buildEvent('event-3', 3)
];

const baseCareerProfile = {
  userId: 'user-1',
  profileId: 'profile-1',
  lastUpdated: '2024-01-01T00:00:00Z',
  currentRole: 'Frontend Engineer',
  seniority: 'mid-level',
  industry: 'Technology',
  companySize: 'medium',
  primarySkills: ['React'],
  skillsToLearn: ['TypeScript'],
  interests: ['web performance'],
  careerGoals: ['skill-development'],
  timeframe: 'medium-term',
  learningStyle: ['hands-on'],
  availableTime: 'moderate',
  budget: 'moderate',
  networkingGoals: ['find-peers'],
  preferredEventTypes: ['workshop']
};

async function withEnv(overrides: Record<string, string | undefined>, run: () => Promise<void>): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe('GET /api/events/recommendations telemetry behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockProfilesSingle.mockResolvedValue({ data: { analytics_consent: true }, error: null });
    mockGetUserProfile.mockResolvedValue({ id: 'profile-1' });
    mockGetCareerProfile.mockResolvedValue(baseCareerProfile);
    mockSearchEventsByTags.mockResolvedValue([]);
    mockGetRecommendedEventsByTags.mockResolvedValue(baseEvents);
    mockEnrichEventsWithCareerImpact.mockImplementation(async (events: Event[]) =>
      events.map((event, index) => ({
        ...event,
        isCareerScored: true,
        careerImpact: {
          overall: 80 - index * 5,
          confidence: 0.9,
          components: {},
          explanation: { reasons: ['alignment'] },
          metadata: { algorithmVersion: 'v2.0.0' }
        }
      }))
    );
    mockLogTelemetryEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not compute divergence telemetry without analytics consent', async () => {
    mockProfilesSingle.mockResolvedValueOnce({ data: { analytics_consent: false }, error: null });

    await withEnv(
      {
        MATCHING_TELEMETRY_ENABLED: 'true',
        MATCHING_TELEMETRY_SAMPLE_RATE: '1'
      },
      async () => {
        const response = await GET(new Request('http://localhost/api/events/recommendations?limit=3') as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(response.status).toBe(200);
      }
    );

    expect(mockEnrichEventsWithCareerImpact).toHaveBeenCalledTimes(1);
    expect(mockLogTelemetryEvent).not.toHaveBeenCalled();
  });

  it('skips sampled divergence computation when sample rate excludes request', async () => {
    await withEnv(
      {
        MATCHING_TELEMETRY_ENABLED: 'true',
        MATCHING_TELEMETRY_SAMPLE_RATE: '0'
      },
      async () => {
        const response = await GET(new Request('http://localhost/api/events/recommendations?limit=3') as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(response.status).toBe(200);
      }
    );

    expect(mockEnrichEventsWithCareerImpact).toHaveBeenCalledTimes(1);
    expect(mockLogTelemetryEvent).toHaveBeenCalledTimes(1);

    const telemetryPayload = mockLogTelemetryEvent.mock.calls[0][1];
    expect(telemetryPayload.metadata.tau).toBeNull();
    expect(telemetryPayload.metadata.divergences).toBeNull();
  });

  it('computes tau/divergence for sampled consented requests using score-based advanced order', async () => {
    mockEnrichEventsWithCareerImpact.mockImplementation(
      async (events: Event[], _profile: unknown, _supabase: unknown, _userId: unknown, applyDiversityEnhancement: boolean) => {
        const scoreMap = applyDiversityEnhancement
          ? { 'event-1': 90, 'event-2': 85, 'event-3': 80 }
          : { 'event-1': 80, 'event-2': 95, 'event-3': 70 };

        return events.map((event) => ({
          ...event,
          isCareerScored: true,
          careerImpact: {
            overall: scoreMap[event.id as keyof typeof scoreMap] ?? 0,
            confidence: 0.9,
            components: {},
            explanation: { reasons: ['alignment'] },
            metadata: { algorithmVersion: 'v2.0.0' }
          }
        }));
      }
    );

    await withEnv(
      {
        MATCHING_TELEMETRY_ENABLED: 'true',
        MATCHING_TELEMETRY_SAMPLE_RATE: '1'
      },
      async () => {
        const response = await GET(new Request('http://localhost/api/events/recommendations?limit=3') as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(response.status).toBe(200);
      }
    );

    expect(mockEnrichEventsWithCareerImpact).toHaveBeenCalledTimes(2);
    expect(mockEnrichEventsWithCareerImpact.mock.calls[0][4]).toBe(true);
    expect(mockEnrichEventsWithCareerImpact.mock.calls[0][6]).toEqual({ allowRerank: true });
    expect(mockEnrichEventsWithCareerImpact.mock.calls[1][4]).toBe(false);
    expect(mockEnrichEventsWithCareerImpact.mock.calls[1][6]).toEqual({ allowRerank: false });

    const telemetryPayload = mockLogTelemetryEvent.mock.calls[0][1];
    expect(telemetryPayload.metadata.tau).toBeCloseTo(1 / 3, 6);
    expect(telemetryPayload.metadata.divergences).toBe(1);
  });

  it('uses canonical ranking for tag-search mode while keeping divergence fields null', async () => {
    mockSearchEventsByTags.mockResolvedValueOnce([buildEvent('tag-search-event', 1)]);

    await withEnv(
      {
        MATCHING_TELEMETRY_ENABLED: 'true',
        MATCHING_TELEMETRY_SAMPLE_RATE: '1'
      },
      async () => {
        const response = await GET(new Request('http://localhost/api/events/recommendations?tags=react&limit=3') as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(response.status).toBe(200);
      }
    );

    expect(mockGetRecommendedEventsByTags).not.toHaveBeenCalled();
    expect(mockEnrichEventsWithCareerImpact).toHaveBeenCalledTimes(1);
    expect(mockLogTelemetryEvent).toHaveBeenCalledTimes(1);

    const telemetryPayload = mockLogTelemetryEvent.mock.calls[0][1];
    expect(telemetryPayload.metadata.tau).toBeNull();
    expect(telemetryPayload.metadata.divergences).toBeNull();
  });

  it('orders personalized recommendations by canonical career impact score', async () => {
    mockGetRecommendedEventsByTags.mockResolvedValueOnce(baseEvents);
    mockEnrichEventsWithCareerImpact.mockImplementationOnce(async (events: Event[]) =>
      events.map((event) => {
        const scoreMap: Record<string, number> = {
          'event-1': 70,
          'event-2': 95,
          'event-3': 60,
        };

        return {
          ...event,
          isCareerScored: true,
          careerImpact: {
            overall: scoreMap[event.id] ?? 0,
            confidence: 0.9,
            components: {},
            explanation: { reasons: ['alignment'] },
            metadata: { algorithmVersion: 'alignment-core-v2' }
          }
        };
      })
    );

    await withEnv(
      {
        DISCOVERY_RERANK: 'off',
      },
      async () => {
        const response = await GET(new Request('http://localhost/api/events/recommendations?limit=3') as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(response.status).toBe(200);

        const payload = await response.json();
        expect(payload.data.events.map((event: { id: string }) => event.id)).toEqual([
          'event-2',
          'event-1',
          'event-3',
        ]);
      }
    );

    expect(mockEnrichEventsWithCareerImpact).toHaveBeenCalledTimes(1);
  });
});
