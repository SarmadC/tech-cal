import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileCalendarFeedSchema } from '@kurecal/domain';

import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getCalendarEvents: vi.fn(),
  loadEngagementMap: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    getCalendarEvents: (...args: unknown[]) => mocks.getCalendarEvents(...args),
  },
}));

vi.mock('@/app/api/mobile/engagement', () => ({
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

const calendarEvent = {
  id: 'event-1',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  title: 'KureCal Monthly Kickoff',
  description: 'A planning session for the month.',
  organizer: 'KureCal',
  location: 'Calgary',
  status: 'confirmed',
  startTime: '2026-05-12T18:00:00.000Z',
  endTime: '2026-05-12T20:00:00.000Z',
  timezone: 'America/Edmonton',
  sourceUrl: 'https://example.com/events/monthly-kickoff',
  livestreamUrl: null,
  registrationUrl: 'https://example.com/register',
  eventTypeId: 'meetup',
  eventFormat: 'Hybrid',
  priceMin: 0,
  priceRange: 'Free',
  eventImageUrl: null,
  category: {
    id: 'meetup',
    name: 'Meetup',
    color: '#2dd4bf',
  },
  organization: {
    id: 'org-1',
    name: 'KureCal',
    logo: null,
  },
  tags: [{ id: 'tag-1', name: 'expo', color: '#0ea5e9', category: 'stack' }],
};

describe('/api/mobile/calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.getCalendarEvents.mockResolvedValue([calendarEvent]);
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([
        [
          calendarEvent.id,
          {
            isBookmarked: true,
            status: 'attending',
          },
        ],
      ])
    );
  });

  it('returns a typed month feed for GET requests', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/mobile/calendar?monthStart=2026-05-01',
        {
          headers: { Authorization: 'Bearer mobile-token' },
        }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    const parsed = mobileCalendarFeedSchema.parse(payload.data);
    expect(parsed.month.monthStart).toBe('2026-05-01');
    expect(parsed.days).toHaveLength(42);
    expect(parsed.events[0]?.engagement?.status).toBe('attending');
    expect(parsed.metrics.savedCount).toBe(1);
    expect(mocks.getCalendarEvents).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        limit: 600,
      })
    );
  });

  it('accepts POST payloads and returns the same contract', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/calendar', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monthStart: '2026-05-01',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileCalendarFeedSchema.parse(payload.data).events[0]?.title).toBe(
      'KureCal Monthly Kickoff'
    );
  });

  it('returns 401 when authentication is missing', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/calendar')
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
  });

  it('returns 400 for an invalid monthStart', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/mobile/calendar?monthStart=2026-5-1'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBeTruthy();
  });
});
