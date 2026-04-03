import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileDiscoverFeedSchema } from '@kurecal/domain';

import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getEventCount: vi.fn(),
  getEvents: vi.fn(),
  loadEngagementMap: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    getEvents: (...args: unknown[]) => mocks.getEvents(...args),
    getEventCount: (...args: unknown[]) => mocks.getEventCount(...args),
  },
}));

vi.mock('@/app/api/mobile/engagement', () => ({
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

const discoverEvent = {
  id: 'event-1',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  title: 'Expo City Meetup',
  description: 'A meetup for mobile builders.',
  organizer: 'KureCal',
  location: 'Calgary',
  status: 'confirmed',
  startTime: '2026-04-12T18:00:00.000Z',
  endTime: '2026-04-12T20:00:00.000Z',
  sourceUrl: 'https://example.com/events/expo-city-meetup',
  livestreamUrl: null,
  registrationUrl: 'https://example.com/register',
  eventTypeId: 'meetup',
  eventFormat: 'Hybrid',
  priceMin: 0,
  priceRange: 'Free',
  eventImageUrl: null,
  organization: {
    id: 'org-1',
    name: 'KureCal',
    logo: 'https://example.com/logo.png',
  },
  tags: [{ id: 'tag-1', name: 'expo', color: '#0ea5e9', category: 'stack' }],
};

describe('mobile discover route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.getEvents.mockResolvedValue([discoverEvent]);
    mocks.getEventCount.mockResolvedValue(25);
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([
        [
          discoverEvent.id,
          {
            isBookmarked: true,
            status: 'attending',
          },
        ],
      ])
    );
  });

  it('returns a typed discover feed for mobile POST filters', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/discover', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: ' Expo ',
          tags: ['expo'],
          location: ' Calgary ',
          page: 2,
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileDiscoverFeedSchema.parse(payload.data).nextPage).toBe(3);
    expect(payload.data.events[0]?.engagement?.status).toBe('attending');

    expect(mocks.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'Expo',
        tags: ['expo'],
        locations: ['Calgary'],
        status: ['confirmed'],
        sortBy: 'date',
        sortDirection: 'asc',
      }),
      {},
      2,
      12
    );
  });

  it('accepts GET query params for a default signed-in discover load', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/mobile/discover?searchTerm=AI&tags=expo,react-native'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.header.title).toBe('Find your next event');
    expect(mocks.getEventCount).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'AI',
        tags: ['expo', 'react-native'],
      }),
      {}
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
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid date range', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom: '2026-04-20',
          dateTo: '2026-04-10',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('dateTo must be on or after dateFrom');
  });
});
