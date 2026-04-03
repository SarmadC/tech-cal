import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileDashboardSummarySchema } from '@kurecal/domain';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getEventCount: vi.fn(),
  getEvents: vi.fn(),
  getTrackedEvents: vi.fn(),
  loadEngagementMap: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/userEventService', () => ({
  UserEventService: {
    getTrackedEvents: (...args: unknown[]) => mocks.getTrackedEvents(...args),
  },
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    getEvents: (...args: unknown[]) => mocks.getEvents(...args),
    getEventCount: (...args: unknown[]) => mocks.getEventCount(...args),
  },
}));

vi.mock('@/app/api/mobile/engagement', () => ({
  engagementFromTrackedEvent: (record: { isBookmarked: boolean; status: string | null }) => ({
    isBookmarked: record.isBookmarked,
    status: record.status,
  }),
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

const trackedEvent = {
  trackingId: 'tracking-1',
  userId: 'user-1',
  eventId: 'event-1',
  status: 'attending',
  notes: null,
  trackedAt: '2026-04-01T00:00:00.000Z',
  isBookmarked: true,
  bookmarkedAt: '2026-04-01T00:00:00.000Z',
  event: {
    id: 'event-1',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    title: 'Tracked Event',
    description: 'Already on the user plan.',
    organizer: 'KureCal',
    location: 'Remote',
    status: 'confirmed',
    startTime: '2099-04-12T18:00:00.000Z',
    endTime: '2099-04-12T19:00:00.000Z',
    sourceUrl: 'https://example.com/events/tracked',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/register',
    eventTypeId: 'meetup',
    eventFormat: 'Online',
    priceMin: 0,
    priceRange: 'Free',
    eventImageUrl: null,
    organization: { id: 'org-1', name: 'KureCal', logo: null },
    tags: [],
  },
};

const recommendedEvent = {
  id: 'event-2',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  title: 'Recommended Event',
  description: 'Fresh opening from the catalog.',
  organizer: 'KureCal',
  location: 'Edmonton',
  status: 'confirmed',
  startTime: '2099-04-15T18:00:00.000Z',
  endTime: '2099-04-15T20:00:00.000Z',
  sourceUrl: 'https://example.com/events/recommended',
  livestreamUrl: null,
  registrationUrl: 'https://example.com/register',
  eventTypeId: 'conference',
  eventFormat: 'Hybrid',
  priceMin: 20,
  priceRange: '$20+',
  eventImageUrl: null,
  organization: { id: 'org-2', name: 'KureCal', logo: null },
  tags: [],
};

describe('GET /api/mobile/dashboard/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.getTrackedEvents.mockResolvedValue([trackedEvent]);
    mocks.getEvents.mockResolvedValue([recommendedEvent]);
    mocks.getEventCount.mockResolvedValue(18);
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([
        [
          recommendedEvent.id,
          {
            isBookmarked: false,
            status: null,
          },
        ],
      ])
    );
  });

  it('returns a typed dashboard summary with hero and section cards', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/dashboard/summary', {
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    const parsed = mobileDashboardSummarySchema.parse(payload.data);
    expect(parsed.heroEvent?.id).toBe('event-1');
    expect(parsed.savedCount).toBe(1);
    expect(parsed.upcomingEvents?.[0]?.engagement?.status).toBe('attending');
    expect(parsed.recommendedEvents?.[0]?.id).toBe('event-2');
  });

  it('returns 401 when the request is unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/dashboard/summary')
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
  });
});
