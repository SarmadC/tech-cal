import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileCommunityCirclePageSchema } from '@kurecal/domain';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getCirclePageData: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/circleDiscussionService', () => ({
  CircleDiscussionService: {
    getCirclePageData: (...args: unknown[]) => mocks.getCirclePageData(...args),
  },
}));

describe('/api/mobile/community/circles/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.getCirclePageData.mockResolvedValue({
      circle: {
        id: 'circle-1',
        slug: 'ai-builders',
        name: 'AI Builders',
        description: 'A circle for AI builders.',
        memberCount: 42,
      },
      isJoined: true,
      membershipState: 'joined' as const,
      isModerator: false,
      currentUserProfile: {
        id: 'user-1',
        fullName: 'Ada Lovelace',
        username: 'ada',
        avatarUrl: null,
      },
      members: [],
      upcomingEvents: [],
      posts: [
        {
          id: 'post-1',
          content: 'What are you building?',
          created_at: '2026-04-03T00:00:00.000Z',
          author: {
            id: 'user-2',
            full_name: 'Grace Hopper',
            avatar_url: null,
          },
          comments: [],
          score: 4,
          userVote: 1,
        },
      ],
    });
  });

  it('returns the typed mobile circle page contract', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/community/circles/ai-builders', {
        headers: { Authorization: 'Bearer mobile-token' },
      }),
      {
        params: Promise.resolve({ slug: 'ai-builders' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mobileCommunityCirclePageSchema.parse(payload.data).circle.slug).toBe(
      'ai-builders'
    );
    expect(mocks.getCirclePageData).toHaveBeenCalledWith({
      slug: 'ai-builders',
      viewerId: 'user-1',
      readClient: {},
    });
  });

  it('returns 404 when the circle does not exist', async () => {
    mocks.getCirclePageData.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/community/circles/missing'),
      {
        params: Promise.resolve({ slug: 'missing' }),
      }
    );

    expect(response.status).toBe(404);
  });
});
