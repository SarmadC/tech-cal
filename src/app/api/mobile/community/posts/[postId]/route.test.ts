import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileCommunityPostPageSchema } from '@kurecal/domain';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getCirclePostPageData: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/circleDiscussionService', () => ({
  CircleDiscussionService: {
    getCirclePostPageData: (...args: unknown[]) =>
      mocks.getCirclePostPageData(...args),
  },
}));

describe('/api/mobile/community/posts/[postId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.getCirclePostPageData.mockResolvedValue({
      circle: {
        id: 'circle-1',
        slug: 'ai-builders',
        name: 'AI Builders',
        description: 'A circle for AI builders.',
        memberCount: 42,
      },
      isJoined: true,
      currentUserProfile: {
        id: 'user-1',
        fullName: 'Ada Lovelace',
        username: 'ada',
        avatarUrl: null,
      },
      upcomingEvents: [],
      post: {
        id: 'post-1',
        content: 'What are you building?',
        created_at: '2026-04-03T00:00:00.000Z',
        author: {
          id: 'user-2',
          full_name: 'Grace Hopper',
          avatar_url: null,
        },
        comments: [
          {
            id: 'comment-1',
            parent_id: null,
            content: 'An agent workflow.',
            created_at: '2026-04-03T01:00:00.000Z',
            author: {
              id: 'user-3',
              full_name: 'Linus Torvalds',
              avatar_url: null,
            },
            replies: [],
          },
        ],
        score: 4,
        userVote: 1,
      },
    });
  });

  it('returns the typed mobile post page contract', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/community/posts/post-1', {
        headers: { Authorization: 'Bearer mobile-token' },
      }),
      {
        params: Promise.resolve({ postId: 'post-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mobileCommunityPostPageSchema.parse(payload.data).post.id).toBe(
      'post-1'
    );
    expect(mocks.getCirclePostPageData).toHaveBeenCalledWith({
      postId: 'post-1',
      viewerId: 'user-1',
      readClient: {},
    });
  });

  it('returns 404 when the post does not exist', async () => {
    mocks.getCirclePostPageData.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/community/posts/missing'),
      {
        params: Promise.resolve({ postId: 'missing' }),
      }
    );

    expect(response.status).toBe(404);
  });
});
