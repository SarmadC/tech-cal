import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mobileCommunityCirclePageSchema } from '@kurecal/domain';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  getCirclePageData: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/services/circleDiscussionService', () => ({
  CircleDiscussionService: {
    getCirclePageData: (...args: unknown[]) => mocks.getCirclePageData(...args),
  },
}));

describe('GET /api/mobile/community/circles/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a mobile community circle page payload', async () => {
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: { id: '22222222-2222-4222-8222-222222222222' },
    });
    mocks.getCirclePageData.mockResolvedValue({
      circle: {
        id: '11111111-1111-4111-8111-111111111111',
        slug: 'design-systems',
        name: 'Design Systems',
        description: 'For interface engineers.',
        memberCount: 42,
      },
      isJoined: true,
      currentUserProfile: {
        id: '22222222-2222-4222-8222-222222222222',
        fullName: 'Ada Lovelace',
        username: 'ada',
        avatarUrl: null,
      },
      members: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          fullName: 'Taylor',
          username: 'taylor',
          avatarUrl: null,
          headline: 'Design systems engineer',
        },
      ],
      upcomingEvents: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          slug: 'component-week',
          title: 'Component Week',
          startTime: '2026-04-03T18:00:00.000Z',
          organizerName: 'KureCal',
          organizerLogoUrl: null,
        },
      ],
      posts: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          content: 'How are you documenting tokens?',
          created_at: '2026-03-22T12:00:00.000Z',
          author: {
            id: '33333333-3333-4333-8333-333333333333',
            full_name: 'Taylor',
            avatar_url: null,
          },
          comments: [],
          score: 4,
          userVote: 1,
        },
      ],
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/community/circles/design-systems'),
      { params: Promise.resolve({ slug: 'design-systems' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileCommunityCirclePageSchema.parse(payload.data).circle.slug).toBe('design-systems');
  });

  it('returns 401 when the mobile user is not authenticated', async () => {
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: null,
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/community/circles/design-systems'),
      { params: Promise.resolve({ slug: 'design-systems' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
  });
});
