import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mobileCalendarFeedSchema } from '@kurecal/domain';
import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  loadFilteredEventsData: vi.fn(),
  loadEngagementMap: vi.fn(),
  getEventTypes: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
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

vi.mock('@/services/eventTypeService', () => ({
  EventTypeService: {
    getEventTypes: (...args: unknown[]) => mocks.getEventTypes(...args),
  },
}));

const calendarEvent = {
  id: '11111111-1111-4111-8111-111111111111',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-02T00:00:00.000Z',
  title: 'Calendar Event',
  description: 'An event in the visible month.',
  organizer: 'KureCal',
  location: 'Remote',
  status: 'confirmed',
  startTime: '2026-04-10T18:00:00.000Z',
  endTime: '2026-04-10T19:00:00.000Z',
  timezone: 'America/Edmonton',
  sourceUrl: 'https://example.com/events/calendar-event',
  livestreamUrl: null,
  eventTypeId: 'conference',
  eventFormat: 'Online',
  priceMin: 0,
  priceRange: 'Free',
  eventImageUrl: null,
  organization: { id: 'org-1', name: 'KureCal', logo: 'https://example.com/logo.png' },
  recommendationMetadata: null,
};

describe('mobile calendar route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-05T12:00:00.000Z'));

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
    mocks.getEventTypes.mockResolvedValue([
      {
        id: 'conference',
        name: 'Conference',
        color: '#2563EB',
        description: 'Large format events',
      },
    ]);
    mocks.loadFilteredEventsData.mockResolvedValue({
      events: [calendarEvent],
      pagination: {
        page: 1,
        pageSize: 100,
        total: 1,
        hasMore: false,
      },
      filters: {
        applied: {
          tags: [],
          locations: [],
          cost: 'all',
          dateRange: { start: '2026-04-01T00:00:00.000', end: '2026-04-30T23:59:59.999' },
        },
        available: {
          categories: [],
          difficulties: [],
          formats: [],
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
        categories: {},
        tags: {
          ai: 1,
        },
      },
    });
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([[calendarEvent.id, { isBookmarked: true, status: 'attending' }]])
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the default current-month feed on GET', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/calendar', {
        method: 'GET',
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileCalendarFeedSchema.parse(payload.data).month.monthStart).toBe('2026-04-01');
    expect(payload.data.events[0]?.engagement?.status).toBe('attending');
    expect(payload.data.events[0]?.timeLabel).toBe('12:00 PM - 1:00 PM');
  });

  it('accepts POST month navigation and simplified filters', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/calendar', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monthStart: '2026-05-01',
          tags: ['ai'],
          location: 'Calgary',
          dateRange: {
            start: '2026-05-10',
            end: '2026-05-20',
          },
          cost: 'free',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileCalendarFeedSchema.parse(payload.data).filters.location).toBe('Calgary');

    const loadArgs = mocks.loadFilteredEventsData.mock.calls[0]?.[0];
    expect(loadArgs.request.rawLocations).toEqual(['Calgary']);
    expect(loadArgs.request.tags).toEqual(['ai']);
    expect(loadArgs.request.cost).toBe('free');
    expect(loadArgs.request.sortBy).toBe('date');
    expect(loadArgs.request.sortDirection).toBe('asc');
    expect(payload.data.month.monthStart).toBe('2026-05-01');
  });

  it('returns 401 when the request is unauthenticated', async () => {
    mocks.getApiAuthContext.mockResolvedValueOnce({
      supabase: {},
      user: null,
    });

    const response = await GET(new Request('http://localhost/api/mobile/calendar'));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
  });

  it('serializes date-only midnight anchors as all-day calendar rows', async () => {
    mocks.loadFilteredEventsData.mockResolvedValueOnce({
      events: [
        {
          ...calendarEvent,
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Date Only Conference',
          startTime: '2026-06-02T00:00:00.000Z',
          endTime: '2026-06-05T00:00:00.000Z',
          timezone: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 100,
        total: 1,
        hasMore: false,
      },
      filters: {
        applied: {
          tags: [],
          locations: [],
          cost: 'all',
          dateRange: { start: '2026-06-01T00:00:00.000', end: '2026-06-30T23:59:59.999' },
        },
        available: {
          categories: [],
          difficulties: [],
          formats: [],
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
        categories: {},
        tags: {},
      },
    });
    mocks.loadEngagementMap.mockResolvedValueOnce(new Map());

    const response = await GET(
      new Request('http://localhost/api/mobile/calendar', {
        method: 'GET',
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.events[0]?.timeLabel).toBe('All day');
  });
});
