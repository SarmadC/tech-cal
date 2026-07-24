import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileSpeakerDetailSchema } from '@kurecal/domain';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  getContactForTarget: vi.fn(),
  getSpeakerDetail: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
}));

vi.mock('@/services/mobileSpeakerService', () => ({
  MobileSpeakerService: {
    getSpeakerDetail: (...args: unknown[]) => mocks.getSpeakerDetail(...args),
  },
}));

vi.mock('@/services/userNetworkingContactService', () => ({
  UserNetworkingContactService: {
    getContactForTarget: (...args: unknown[]) => mocks.getContactForTarget(...args),
    toNetworkingState: (contact: {
      linkedinRequestedAt?: string | null;
      confirmedConnectedAt?: string | null;
    } | null) => ({
      status: contact?.confirmedConnectedAt
        ? 'connected'
        : contact?.linkedinRequestedAt
          ? 'requested'
          : 'none',
      linkedinRequestedAt: contact?.linkedinRequestedAt ?? null,
      confirmedConnectedAt: contact?.confirmedConnectedAt ?? null,
    }),
  },
}));

describe('GET /api/mobile/speakers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mocks.createServiceClient.mockReturnValue({ kind: 'read-supabase' });
    mocks.getContactForTarget.mockResolvedValue(null);
  });

  it('returns the signed-in mobile speaker payload', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      supabase: { kind: 'viewer-supabase' },
      user: { id: '22222222-2222-4222-8222-222222222222' },
    });
    mocks.getContactForTarget.mockResolvedValue({
      id: 'contact-1',
      viewerUserId: '22222222-2222-4222-8222-222222222222',
      targetKind: 'speaker',
      targetUserId: null,
      targetSpeakerId: 'speaker-1',
      sourceEventId: null,
      linkedinRequestedAt: '2026-04-10T12:00:00.000Z',
      confirmedConnectedAt: null,
      createdAt: '2026-04-10T12:00:00.000Z',
      updatedAt: '2026-04-10T12:00:00.000Z',
    });
    mocks.getSpeakerDetail.mockResolvedValue({
      id: 'speaker-1',
      name: 'Dana Scully',
      title: 'AI Research Lead',
      company: 'Signal Labs',
      bio: 'Leads applied AI research.',
      photoUrl: 'https://example.com/dana.jpg',
      portraitUrl: 'https://example.com/dana-portrait.jpg',
      linkedinUrl: 'https://linkedin.com/in/dana',
      twitterUrl: null,
      websiteUrl: 'https://signals.example/dana',
      appearanceCount: 1,
      events: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          slug: 'design-review-week',
          title: 'Design Review Week',
          startTime: '2026-04-02T18:00:00.000Z',
          location: 'Remote',
          format: 'virtual',
          imageUrl: 'https://example.com/event.png',
          organizerLogoUrl: 'https://example.com/logo.png',
          isPastEvent: false,
        },
      ],
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/speakers/speaker-1') as never,
      {
        params: Promise.resolve({ id: 'speaker-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    const parsed = mobileSpeakerDetailSchema.parse(payload.data);
    expect(parsed.name).toBe('Dana Scully');
    expect(parsed.photoUrl).toBe('https://example.com/dana.jpg');
    expect(parsed.portraitUrl).toBe('https://example.com/dana-portrait.jpg');
    expect(parsed.appearanceCount).toBe(1);
    expect(parsed.events[0]?.title).toBe('Design Review Week');
    expect(parsed.events[0]?.organizerLogoUrl).toBe('https://example.com/logo.png');
    expect(parsed.networkingState?.status).toBe('requested');
  });

  it('returns 401 when the mobile user is not authenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/speakers/speaker-1') as never,
      {
        params: Promise.resolve({ id: 'speaker-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
  });

  it('returns 404 when the speaker does not exist', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      supabase: { kind: 'viewer-supabase' },
      user: { id: '22222222-2222-4222-8222-222222222222' },
    });
    mocks.getSpeakerDetail.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/speakers/missing') as never,
      {
        params: Promise.resolve({ id: 'missing' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Speaker not found');
  });
});
