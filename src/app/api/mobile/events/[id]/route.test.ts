import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileEventDetailSchema } from '@kurecal/domain';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getEventById: vi.fn(),
  getEventWithAgenda: vi.fn(),
  loadEngagementMap: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    getEventById: (...args: unknown[]) => mocks.getEventById(...args),
    getEventWithAgenda: (...args: unknown[]) =>
      mocks.getEventWithAgenda(...args),
  },
}));

vi.mock('@/app/api/mobile/engagement', () => ({
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

const eventDetail = {
  id: 'event-1',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  title: 'Expo Ship Week',
  description: 'A richer mobile detail payload.',
  organizer: 'KureCal',
  location: 'Calgary',
  status: 'confirmed',
  startTime: '2026-04-12T18:00:00.000Z',
  endTime: '2026-04-12T20:00:00.000Z',
  timezone: 'America/Edmonton',
  sourceUrl: 'https://example.com/events/expo-ship-week',
  livestreamUrl: null,
  registrationUrl: 'https://example.com/register',
  eventTypeId: 'conference',
  category: {
    id: 'conference',
    name: 'Conference',
    color: '#2563eb',
    description: 'Larger events',
  },
  eventFormat: 'Hybrid',
  priceMin: 0,
  priceRange: 'Free',
  eventImageUrl: 'https://example.com/event.png',
  organization: {
    id: 'org-1',
    name: 'KureCal',
    logo: 'https://example.com/logo.png',
  },
  tags: [{ id: 'tag-1', name: 'expo', color: '#0ea5e9', category: 'stack' }],
  speakerLineup: [
    {
      id: 'speaker-1',
      name: 'Ada Lovelace',
      title: 'Founder',
      company: 'Analytical Engines',
      photoUrl: 'https://example.com/ada.png',
    },
  ],
  agenda: [
    {
      id: 'agenda-1',
      dayNumber: 1,
      startTime: '2026-04-12T18:00:00.000Z',
      endTime: '2026-04-12T18:45:00.000Z',
      title: 'Opening keynote',
      description: 'Kick off the night.',
      location: 'Main hall',
      type: 'keynote',
      track: 'General',
      speakers: [
        {
          id: 'speaker-1',
          name: 'Ada Lovelace',
          title: 'Founder',
          company: 'Analytical Engines',
          photoUrl: 'https://example.com/ada.png',
        },
      ],
    },
  ],
};

describe('GET /api/mobile/events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.getEventWithAgenda.mockResolvedValue(eventDetail);
    mocks.getEventById.mockResolvedValue(eventDetail);
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([
        [
          eventDetail.id,
          {
            isBookmarked: true,
            status: 'attending',
          },
        ],
      ])
    );
  });

  it('returns a typed event detail payload with agenda and speakers', async () => {
    const response = await GET(
      new Request(`http://localhost/api/mobile/events/${eventDetail.id}`, {
        headers: { Authorization: 'Bearer mobile-token' },
      }),
      {
        params: Promise.resolve({ id: eventDetail.id }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    const parsed = mobileEventDetailSchema.parse(payload.data);
    expect(parsed.host?.name).toBe('KureCal');
    expect(parsed.event.engagement?.status).toBe('attending');
    expect(parsed.agenda?.[0]?.title).toBe('Opening keynote');
    expect(parsed.speakerLineup?.[0]?.name).toBe('Ada Lovelace');
  });

  it('falls back to base event detail when agenda hydration fails', async () => {
    mocks.getEventWithAgenda.mockRejectedValueOnce(
      new Error('Failed to fetch event with agenda for ID: event-1.')
    );
    mocks.getEventById.mockResolvedValueOnce({
      ...eventDetail,
      agenda: [],
      speakerLineup: [],
    });

    const response = await GET(
      new Request(`http://localhost/api/mobile/events/${eventDetail.id}`, {
        headers: { Authorization: 'Bearer mobile-token' },
      }),
      {
        params: Promise.resolve({ id: eventDetail.id }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.getEventById).toHaveBeenCalledWith(
      eventDetail.id,
      expect.anything()
    );

    const parsed = mobileEventDetailSchema.parse(payload.data);
    expect(parsed.event.title).toBe('Expo Ship Week');
    expect(parsed.agenda).toEqual([]);
  });

  it('returns 401 when authentication is missing', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request(`http://localhost/api/mobile/events/${eventDetail.id}`),
      {
        params: Promise.resolve({ id: eventDetail.id }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
  });

  it('returns 404 when the event is not found', async () => {
    mocks.getEventWithAgenda.mockRejectedValueOnce(new Error('Event not found'));

    const response = await GET(
      new Request(`http://localhost/api/mobile/events/${eventDetail.id}`),
      {
        params: Promise.resolve({ id: eventDetail.id }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toContain('Event not found');
  });
});
