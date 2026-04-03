import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileSavedEventsFeedSchema } from '@kurecal/domain';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getTrackedEvents: vi.fn(),
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

const trackedEvents = [
  {
    trackingId: 'tracking-1',
    userId: 'user-1',
    eventId: 'event-1',
    status: null,
    notes: null,
    trackedAt: '2026-04-01T00:00:00.000Z',
    isBookmarked: true,
    bookmarkedAt: '2026-04-01T00:00:00.000Z',
    event: {
      id: 'event-1',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      title: 'Saved Event',
      description: 'Bookmarked from mobile.',
      organizer: 'KureCal',
      location: 'Remote',
      status: 'confirmed',
      startTime: '2099-04-12T18:00:00.000Z',
      endTime: '2099-04-12T19:00:00.000Z',
      sourceUrl: 'https://example.com/events/saved',
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
  },
  {
    trackingId: 'tracking-2',
    userId: 'user-1',
    eventId: 'event-2',
    status: 'attending',
    notes: null,
    trackedAt: '2026-04-01T00:00:00.000Z',
    isBookmarked: false,
    bookmarkedAt: null,
    event: null,
  },
];

describe('/api/mobile/saved', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.getTrackedEvents.mockResolvedValue(trackedEvents);
  });

  it('returns only bookmarked events in the saved feed contract', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/saved?page=1', {
        headers: { Authorization: 'Bearer token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    const parsed = mobileSavedEventsFeedSchema.parse(payload.data);
    expect(parsed.totalCount).toBe(1);
    expect(parsed.events[0]?.title).toBe('Saved Event');
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/saved')
    );

    expect(response.status).toBe(401);
  });
});
