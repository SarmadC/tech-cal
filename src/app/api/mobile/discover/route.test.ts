import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileDiscoverFeedSchema } from '@kurecal/domain';

import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  buildUserLocationFromProfileContext: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  getCareerProfile: vi.fn(),
  loadEngagementMap: vi.fn(),
  loadFilteredEventsData: vi.fn(),
  normalizeFilteredEventsRequest: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    getCareerProfile: (...args: unknown[]) => mocks.getCareerProfile(...args),
  },
}));

vi.mock('@/services/filteredEventsService', () => ({
  buildUserLocationFromProfileContext: (...args: unknown[]) =>
    mocks.buildUserLocationFromProfileContext(...args),
  loadFilteredEventsData: (...args: unknown[]) =>
    mocks.loadFilteredEventsData(...args),
  normalizeFilteredEventsRequest: (...args: unknown[]) =>
    mocks.normalizeFilteredEventsRequest(...args),
}));

vi.mock('@/app/api/mobile/engagement', () => ({
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

function createProfileSupabase(profileRow = {
  preferences: {},
  timezone: 'America/Edmonton',
  location: 'Edmonton',
}) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: profileRow,
          }),
        }),
      }),
    })),
  };
}

function buildEvent(
  id: string,
  options: Partial<{
    alignmentScore: number;
    attendeeCount: number;
    eventFormat: 'Online' | 'In-person' | 'Hybrid';
    eventTypeId: string;
    location: string;
    organizer: string;
    sourceUrl: string;
    title: string;
  }> = {}
) {
  return {
    id,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    title: options.title ?? `Event ${id}`,
    description: `Description for ${id}`,
    organizer: options.organizer ?? 'KureCal',
    location: options.location ?? 'Edmonton, AB',
    status: 'confirmed',
    startTime: '2026-04-12T18:00:00.000Z',
    endTime: '2026-04-12T20:00:00.000Z',
    sourceUrl:
      options.sourceUrl ?? `https://example.com/events/${encodeURIComponent(id)}`,
    livestreamUrl: null,
    registrationUrl: 'https://example.com/register',
    eventTypeId: options.eventTypeId ?? 'meetup',
    eventFormat: options.eventFormat ?? 'Hybrid',
    priceMin: 0,
    priceRange: 'Free',
    eventImageUrl: null,
    attendeeCount: options.attendeeCount ?? 40,
    organization: {
      id: `org-${id}`,
      name: options.organizer ?? 'KureCal',
      logo: 'https://example.com/logo.png',
    },
    category: {
      id: options.eventTypeId ?? 'meetup',
      name: 'Meetup',
      color: '#0ea5e9',
      description: null,
    },
    tags: [{ id: 'tag-1', name: 'expo', color: '#0ea5e9', category: 'stack' }],
    recommendationMetadata: {
      matchedTags: ['expo'],
      matchScore: options.alignmentScore ?? 82,
      impactScore: 71,
      profileBoost: 8,
      recencyBoost: 4,
      popularityBoost: 5,
      totalScore: 90,
      reasons: ['Strong skill alignment for Expo builders'],
      alignmentScore: options.alignmentScore ?? 82,
    },
  };
}

describe('mobile discover route', () => {
  const eventA = buildEvent('event-a', {
    alignmentScore: 91,
    attendeeCount: 120,
    organizer: 'KureCal',
    eventTypeId: 'meetup',
    title: 'Expo Founders Night',
  });
  const eventB = buildEvent('event-b', {
    alignmentScore: 88,
    attendeeCount: 90,
    organizer: 'React Alberta',
    eventTypeId: 'conference',
    title: 'Native Product Summit',
  });
  const eventC = buildEvent('event-c', {
    alignmentScore: 77,
    attendeeCount: 60,
    organizer: 'Indie Builders',
    eventTypeId: 'workshop',
    title: 'Ship Faster Workshop',
  });

  beforeEach(() => {
    vi.clearAllMocks();

    const supabase = createProfileSupabase();

    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase,
      user: { id: 'user-1' },
    });
    mocks.getCareerProfile.mockResolvedValue({
      id: 'career-1',
      current_role: 'Engineer',
    });
    mocks.buildUserLocationFromProfileContext.mockReturnValue({
      city: 'Edmonton',
      country: 'Canada',
      timezone: 'America/Edmonton',
    });
    mocks.normalizeFilteredEventsRequest.mockImplementation((value) => value);
    mocks.loadFilteredEventsData.mockResolvedValue({
      events: [eventA, eventB, eventC],
      pagination: {
        page: 1,
        pageSize: 24,
        total: 36,
        hasMore: true,
      },
      filters: {
        applied: {},
        available: {
          categories: [
            {
              id: 'meetup',
              name: 'Meetup',
              count: 12,
            },
          ],
          difficulties: [],
          formats: [],
          locations: [],
        },
      },
      stats: {
        processingTimeMs: 48,
        filteredCount: 3,
        totalCount: 36,
      },
      counts: {
        format: {
          virtual: 7,
          'in-person': 19,
          hybrid: 10,
        },
        cost: {
          free: 20,
          paid: 16,
        },
        categories: {
          meetup: 12,
        },
        tags: {
          expo: 8,
          react: 5,
        },
      },
    });
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([
        [
          eventA.id,
          {
            isBookmarked: true,
            status: 'attending',
          },
        ],
      ])
    );
  });

  it('returns a rich typed discover feed for POST filters', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/discover', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rankingMode: 'best-match',
          searchTerm: ' Expo ',
          tags: ['expo'],
          location: ' Calgary ',
          dateRange: {
            start: '2026-04-10',
            end: '2026-04-20',
          },
          cost: 'free',
          page: 2,
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    const parsed = mobileDiscoverFeedSchema.parse(payload.data);
    expect(parsed.controls.activeRankingMode).toBe('best-match');
    expect(parsed.results.totalCount).toBe(36);
    expect(parsed.availableFilters.tags[0]?.value).toBe('expo');
    expect(parsed.topPicks).toBeNull();
    expect(parsed.events[0]?.engagement?.status).toBe('attending');

    expect(mocks.normalizeFilteredEventsRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'Expo',
        tags: ['expo'],
        locations: ['Calgary'],
        cost: 'free',
        sortBy: 'career-impact',
        sortDirection: 'desc',
        page: 2,
        pageSize: 24,
        surface: 'discover',
        dateRange: {
          start: '2026-04-10',
          end: '2026-04-20',
        },
      })
    );
  });

  it('restores top picks for the first unfiltered best-match load', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/discover', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.topPicks.title).toBe('Your Top Picks');
    expect(payload.data.topPicks.cards).toHaveLength(3);
    expect(payload.data.events).toHaveLength(0);
  });

  it('accepts GET query params for a trending discover load', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/mobile/discover?mode=trending&searchTerm=AI&tags=expo,react-native'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.controls.activeRankingMode).toBe('trending');
    expect(mocks.normalizeFilteredEventsRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'AI',
        tags: ['expo', 'react-native'],
        sortBy: 'popularity',
        sortDirection: 'desc',
        popularity: 'trending',
      })
    );
  });

  it('returns 401 when authentication is missing', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/discover')
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
    expect(mocks.loadFilteredEventsData).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid date range', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRange: {
            start: '2026-04-20',
            end: '2026-04-10',
          },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('dateRange end must be on or after start');
  });
});
