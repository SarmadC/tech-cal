import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mobileDiscoverFeedSchema } from '@kurecal/domain';
import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  getCareerProfile: vi.fn(),
  loadFilteredEventsData: vi.fn(),
  loadEngagementMap: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    getCareerProfile: (...args: unknown[]) => mocks.getCareerProfile(...args),
  },
}));

vi.mock('@/services/filteredEventsService', async () => {
  const actual = await vi.importActual<typeof import('@/services/filteredEventsService')>(
    '@/services/filteredEventsService'
  );

  return {
    ...actual,
    loadFilteredEventsData: (...args: unknown[]) => mocks.loadFilteredEventsData(...args),
  };
});

vi.mock('@/app/api/mobile/engagement', () => ({
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

const discoverEvent = {
  id: '11111111-1111-4111-8111-111111111111',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-02T00:00:00.000Z',
  title: 'Discovery Event',
  description: 'A recommendation for testing.',
  organizer: 'KureCal',
  location: 'Remote',
  status: 'confirmed',
  startTime: '2026-04-02T18:00:00.000Z',
  endTime: '2026-04-02T19:00:00.000Z',
  sourceUrl: 'https://example.com/events/discovery-event',
  livestreamUrl: null,
  eventTypeId: 'conference',
  eventFormat: 'Online',
  priceMin: 0,
  priceRange: 'Free',
  eventImageUrl: null,
  organization: {
    id: 'org-1',
    name: 'KureCal',
    logo: 'https://example.com/logo.png',
  },
  recommendationMetadata: {
    alignmentScore: 87,
    matchScore: 87,
    reasons: ['Supports your networking goal'],
  },
};

describe('mobile discover route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                preferences: null,
                timezone: 'America/Edmonton',
                location: 'Edmonton, Canada',
              },
            }),
          })),
        })),
      })),
    };

    mocks.getApiAuthContext.mockResolvedValue({
      supabase,
      user: { id: '22222222-2222-4222-8222-222222222222' },
    });
    mocks.getCareerProfile.mockResolvedValue({ id: 'profile-1' });
    mocks.loadFilteredEventsData.mockResolvedValue({
      events: [discoverEvent],
      pagination: {
        page: 1,
        pageSize: 24,
        total: 1,
        hasMore: false,
      },
      filters: {
        applied: {
          searchTerm: '',
          categories: [],
          tags: [],
          locations: [],
          format: 'all',
          cost: 'all',
          difficulty: 'all',
          dateRange: { start: null, end: null },
          sortBy: 'career-impact',
        },
        available: {
          categories: [{ id: 'conference', name: 'Conference', count: 1 }],
          difficulties: [],
          formats: [
            { value: 'virtual', count: 1 },
            { value: 'in-person', count: 0 },
            { value: 'hybrid', count: 0 },
          ],
          locations: [],
        },
      },
      stats: {
        processingTimeMs: 18,
        filteredCount: 1,
        totalCount: 1,
      },
      isColdStart: false,
      counts: {
        format: {
          virtual: 1,
          'in-person': 0,
          hybrid: 0,
        },
        cost: {
          free: 1,
          paid: 0,
        },
        categories: {
          conference: 1,
        },
        tags: {
          ai: 1,
        },
      },
    });
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([[discoverEvent.id, { isBookmarked: true, status: null }]])
    );
  });

  it('accepts POST filter input and maps trending mode into shared filtering', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/discover', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rankingMode: 'trending',
          searchTerm: ' AI events ',
          categories: ['conference'],
          tags: ['ai'],
          location: 'Calgary',
          dateRange: {
            start: '2026-04-01',
            end: '2026-04-30',
          },
          format: 'virtual',
          cost: 'free',
          page: 2,
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileDiscoverFeedSchema.parse(payload.data).controls.activeRankingMode).toBe('trending');

    const loadArgs = mocks.loadFilteredEventsData.mock.calls[0]?.[0];
    expect(loadArgs.request.sortBy).toBe('popularity');
    expect(loadArgs.request.sortDirection).toBe('desc');
    expect(loadArgs.request.popularity).toBe('trending');
    expect(loadArgs.request.rawSearchTerm).toBe('AI events');
    expect(loadArgs.request.rawLocations).toEqual(['Calgary']);
    expect(loadArgs.request.page).toBe(2);
    expect(payload.data.filters.location).toBe('Calgary');
    expect(payload.data.filters.format).toBe('virtual');
    expect(payload.data.filters.cost).toBe('free');
    expect(payload.data.availableFilters.tags[0]?.label).toBe('AI');
    expect(payload.data.events[0]?.insight).toBe('Popular right now');
    expect(payload.data.topPicks).toBeNull();
  });

  it('returns top picks on the personalized best-match home and removes them from the feed', async () => {
    mocks.loadFilteredEventsData.mockResolvedValueOnce({
      events: [
        discoverEvent,
        {
          ...discoverEvent,
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Second Top Pick',
          eventTypeId: 'meetup',
          organization: {
            id: 'org-2',
            name: 'Second Org',
            logo: 'https://example.com/second-logo.png',
          },
          recommendationMetadata: {
            alignmentScore: 81,
            matchScore: 81,
            reasons: ['Practical skill-building content'],
          },
        },
        {
          ...discoverEvent,
          id: '44444444-4444-4444-8444-444444444444',
          title: 'Third Top Pick',
          eventTypeId: 'summit',
          organization: {
            id: 'org-3',
            name: 'Third Org',
            logo: 'https://example.com/third-logo.png',
          },
          recommendationMetadata: {
            alignmentScore: 74,
            matchScore: 74,
            reasons: ['Aligns with your engineering role'],
          },
        },
        {
          ...discoverEvent,
          id: '55555555-5555-4555-8555-555555555555',
          title: 'Lower Signal Event',
          eventTypeId: 'webinar',
          organization: {
            id: 'org-4',
            name: 'Fourth Org',
            logo: 'https://example.com/fourth-logo.png',
          },
          recommendationMetadata: {
            alignmentScore: 42,
            matchScore: 42,
            reasons: ['General community access'],
          },
        },
      ],
      pagination: {
        page: 1,
        pageSize: 24,
        total: 4,
        hasMore: false,
      },
      filters: {
        applied: {
          searchTerm: '',
          categories: [],
          tags: [],
          locations: [],
          format: 'all',
          cost: 'all',
          difficulty: 'all',
          dateRange: { start: null, end: null },
          sortBy: 'career-impact',
        },
        available: {
          categories: [{ id: 'conference', name: 'Conference', count: 4 }],
          difficulties: [],
          formats: [
            { value: 'virtual', count: 4 },
            { value: 'in-person', count: 0 },
            { value: 'hybrid', count: 0 },
          ],
          locations: [],
        },
      },
      stats: {
        processingTimeMs: 18,
        filteredCount: 4,
        totalCount: 4,
      },
      isColdStart: false,
      counts: {
        format: {
          virtual: 4,
          'in-person': 0,
          hybrid: 0,
        },
        cost: {
          free: 4,
          paid: 0,
        },
        categories: {
          conference: 4,
        },
        tags: {
          ai: 4,
        },
      },
    });

    const response = await POST(
      new Request('http://localhost/api/mobile/discover', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rankingMode: 'best-match',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.topPicks?.title).toBe('Your Top Picks');
    expect(payload.data.topPicks?.cards.map((card: { title: string }) => card.title)).toEqual([
      'Discovery Event',
      'Second Top Pick',
      'Third Top Pick',
    ]);
    expect(payload.data.topPicks?.cards[0]?.insight).toBe('Fits your goals');
    expect(payload.data.events.map((card: { title: string }) => card.title)).toEqual(['Lower Signal Event']);
    expect(payload.data.results.totalCount).toBe(4);
    expect(payload.data.results.returnedCount).toBe(1);
  });

  it('keeps GET mode-only compatibility for legacy callers', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/discover?mode=soonest', {
        method: 'GET',
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileDiscoverFeedSchema.parse(payload.data).controls.activeRankingMode).toBe('soonest');

    const loadArgs = mocks.loadFilteredEventsData.mock.calls[0]?.[0];
    expect(loadArgs.request.sortBy).toBe('date');
    expect(loadArgs.request.sortDirection).toBe('asc');
    expect(payload.data.topPicks).toBeNull();
  });
});
