import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileEventDetailSchema } from '@kurecal/domain';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getEventById: vi.fn(),
  getEventWithAgenda: vi.fn(),
  getSavedAgendaItemIds: vi.fn(),
  buildNetworkingPulse: vi.fn(),
  loadEngagementMap: vi.fn(),
  createAdminClient: vi.fn(),
}));

function createAdminClientMock(speakerRows: unknown[] = []) {
  const inFilter = vi.fn(async () => ({ data: speakerRows, error: null }));
  const select = vi.fn(() => ({ in: inFilter }));
  const from = vi.fn(() => ({ select }));

  return { from };
}

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

vi.mock('@/services/eventAgendaSaveService', () => ({
  EventAgendaSaveService: {
    getSavedAgendaItemIds: (...args: unknown[]) =>
      mocks.getSavedAgendaItemIds(...args),
    buildNetworkingPulse: (...args: unknown[]) =>
      mocks.buildNetworkingPulse(...args),
  },
}));

vi.mock('@/app/api/mobile/engagement', () => ({
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: (...args: unknown[]) => mocks.createAdminClient(...args),
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
    mocks.createAdminClient.mockResolvedValue(createAdminClientMock());
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
    mocks.getSavedAgendaItemIds.mockResolvedValue(new Set(['agenda-1']));
    mocks.buildNetworkingPulse.mockResolvedValue({
      state: 'active',
      trendingTopic: {
        label: 'Fabric',
        activityLabel: 'Highly active',
      },
      mostSavedSession: {
        agendaItemId: 'agenda-1',
        title: 'Opening keynote',
        saveCount: 4,
      },
    });
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
    expect(parsed.event.imageUrl).toBe('https://example.com/event.png');
    expect(parsed.event.engagement?.status).toBe('attending');
    expect(parsed.agenda?.[0]?.title).toBe('Opening keynote');
    expect(parsed.agenda?.[0]?.isSaved).toBe(true);
    expect(parsed.speakerLineup?.[0]?.name).toBe('Ada Lovelace');
    expect(parsed.speakerLineup?.[0]?.id).toBe('speaker-1');
    expect(parsed.networkingPulse?.mostSavedSession?.saveCount).toBe(4);
  });

  it('prefers agenda speaker ids over name-only speaker lineup entries', async () => {
    mocks.getEventWithAgenda.mockResolvedValueOnce({
      ...eventDetail,
      speakerLineup: [
        {
          name: 'Ada Lovelace',
          title: 'Founder',
          company: 'Analytical Engines',
          photoUrl: 'https://example.com/ada.png',
        },
      ],
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
    const parsed = mobileEventDetailSchema.parse(payload.data);

    expect(response.status).toBe(200);
    expect(parsed.speakerLineup?.[0]?.name).toBe('Ada Lovelace');
    expect(parsed.speakerLineup?.[0]?.id).toBe('speaker-1');
  });

  it('keeps richer speaker lineup metadata when agenda speakers provide the real id', async () => {
    mocks.getEventWithAgenda.mockResolvedValueOnce({
      ...eventDetail,
      speakerLineup: [
        {
          name: 'Ada Lovelace',
          title: 'Founder',
          company: 'Analytical Engines',
          photoUrl: 'https://example.com/ada-rich.png',
        },
      ],
      agenda: [
        {
          ...eventDetail.agenda[0],
          speakers: [
            {
              id: 'speaker-1',
              name: 'Ada Lovelace',
            },
          ],
        },
      ],
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
    const parsed = mobileEventDetailSchema.parse(payload.data);

    expect(response.status).toBe(200);
    expect(parsed.speakerLineup).toHaveLength(1);
    expect(parsed.speakerLineup?.[0]).toMatchObject({
      id: 'speaker-1',
      name: 'Ada Lovelace',
      title: 'Founder',
      company: 'Analytical Engines',
      photoUrl: 'https://example.com/ada-rich.png',
    });
  });

  it('hydrates name-only speaker lineup entries from stored speaker records', async () => {
    mocks.getEventWithAgenda.mockResolvedValueOnce({
      ...eventDetail,
      speakerLineup: [
        {
          id: 'Adarsh Divakaran',
          name: 'Adarsh Divakaran',
          title: 'Python Developer Advocate',
          company: 'SerpApi',
          photoUrl: 'https://example.com/adarsh.png',
        },
      ],
      agenda: [],
    });
    mocks.createAdminClient.mockResolvedValueOnce(
      createAdminClientMock([
        {
          id: 'speaker-adarsh',
          name: 'Adarsh Divakaran',
          title: 'Python Developer Advocate',
          company: 'SerpApi',
          bio: null,
          photo_url: 'https://example.com/adarsh.png',
          linkedin_url: null,
          twitter_url: null,
          website_url: null,
        },
      ])
    );

    const response = await GET(
      new Request(`http://localhost/api/mobile/events/${eventDetail.id}`, {
        headers: { Authorization: 'Bearer mobile-token' },
      }),
      {
        params: Promise.resolve({ id: eventDetail.id }),
      }
    );
    const payload = await response.json();
    const parsed = mobileEventDetailSchema.parse(payload.data);

    expect(response.status).toBe(200);
    expect(parsed.speakerLineup?.[0]?.name).toBe('Adarsh Divakaran');
    expect(parsed.speakerLineup?.[0]?.id).toBe('speaker-adarsh');
  });

  it('returns an empty networking pulse when aggregate signal is below threshold', async () => {
    mocks.getSavedAgendaItemIds.mockResolvedValueOnce(new Set());
    mocks.buildNetworkingPulse.mockResolvedValueOnce({
      state: 'empty',
      trendingTopic: null,
      mostSavedSession: null,
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
    const parsed = mobileEventDetailSchema.parse(payload.data);

    expect(response.status).toBe(200);
    expect(parsed.networkingPulse?.state).toBe('empty');
    expect(parsed.networkingPulse?.mostSavedSession).toBeNull();
  });

  it('keeps loading event detail when optional engagement and pulse data is unavailable', async () => {
    mocks.loadEngagementMap.mockRejectedValueOnce({
      message: 'user_events query failed',
    });
    mocks.getSavedAgendaItemIds.mockRejectedValueOnce({
      message: 'relation "user_event_agenda_saves" does not exist',
    });
    mocks.buildNetworkingPulse.mockRejectedValueOnce({
      message: 'user_event_agenda_saves aggregate query failed',
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
    const parsed = mobileEventDetailSchema.parse(payload.data);

    expect(response.status).toBe(200);
    expect(parsed.event.title).toBe('Expo Ship Week');
    expect(parsed.event.engagement).toBeUndefined();
    expect(parsed.agenda?.[0]?.isSaved).toBe(false);
    expect(parsed.networkingPulse?.state).toBe('empty');
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
