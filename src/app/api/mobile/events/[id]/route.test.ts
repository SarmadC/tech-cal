import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mobileEventDetailSchema } from '@kurecal/domain';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  loadEngagementMap: vi.fn(),
  getEventWithAgenda: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/app/api/mobile/engagement', () => ({
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    getEventWithAgenda: (...args: unknown[]) => mocks.getEventWithAgenda(...args),
  },
}));

const event = {
  id: '11111111-1111-4111-8111-111111111111',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-02T00:00:00.000Z',
  title: 'Expo Event Detail',
  description: 'A richer mobile event detail payload.',
  organizer: 'KureCal',
  location: 'Calgary',
  status: 'confirmed',
  startTime: '2026-04-10T18:00:00.000Z',
  endTime: '2026-04-10T19:00:00.000Z',
  timezone: 'America/Edmonton',
  sourceUrl: 'https://example.com/events/expo-event-detail',
  registrationUrl: 'https://tickets.example.com/expo-event-detail',
  livestreamUrl: null,
  eventTypeId: 'conference',
  category: {
    id: 'conference',
    name: 'Conference',
    color: '#2563EB',
    description: 'Large format events',
  },
  eventFormat: 'Hybrid',
  eventImageUrl: 'https://example.com/event.png',
  priceMin: 0,
  priceRange: 'Free',
  organization: {
    id: 'org-1',
    name: 'KureCal',
    logo: 'https://example.com/logo.png',
  },
  tags: [
    {
      id: 'tag-1',
      name: 'AI',
      color: '#3B82F6',
      category: 'technology',
    },
  ],
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
      startTime: '2026-04-10T18:00:00.000Z',
      endTime: '2026-04-10T18:45:00.000Z',
      title: 'Opening keynote',
      description: 'Start here.',
      location: 'Main stage',
      type: 'keynote',
      track: 'General',
      topics: ['AI'],
      speakers: [
        {
          id: 'speaker-1',
          name: 'Ada Lovelace',
          title: 'Founder',
          company: 'Analytical Engines',
          photoUrl: 'https://example.com/ada.png',
        },
      ],
      speaker: {
        id: 'speaker-1',
        name: 'Ada Lovelace',
        title: 'Founder',
        company: 'Analytical Engines',
        photoUrl: 'https://example.com/ada.png',
      },
    },
  ],
};

describe('mobile event detail route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: { id: '22222222-2222-4222-8222-222222222222' },
    });
    mocks.getEventWithAgenda.mockResolvedValue(event);
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([[event.id, { isBookmarked: true, status: 'attending' }]])
    );
  });

  it('returns a rich authenticated event detail payload', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/events/11111111-1111-4111-8111-111111111111', {
        headers: { Authorization: 'Bearer mobile-token' },
      }),
      {
        params: Promise.resolve({ id: event.id }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    const parsed = mobileEventDetailSchema.parse(payload.data);
    expect(parsed.host.name).toBe('KureCal');
    expect(parsed.metaLabel).toBe('Conference');
    expect(parsed.agenda[0]?.title).toBe('Opening keynote');
    expect(parsed.speakerLineup[0]?.name).toBe('Ada Lovelace');
    expect(parsed.engagement?.status).toBe('attending');
  });

  it('returns 401 when the request is unauthenticated', async () => {
    mocks.getApiAuthContext.mockResolvedValueOnce({
      supabase: {},
      user: null,
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/events/11111111-1111-4111-8111-111111111111'),
      {
        params: Promise.resolve({ id: event.id }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
  });
});
