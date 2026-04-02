import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mobileCommunityPostPageSchema } from '@kurecal/domain';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  getCirclePostPageData: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/services/circleDiscussionService', () => ({
  CircleDiscussionService: {
    getCirclePostPageData: (...args: unknown[]) => mocks.getCirclePostPageData(...args),
  },
}));

describe('GET /api/mobile/community/posts/[postId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a mobile community post page payload', async () => {
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: { id: '22222222-2222-4222-8222-222222222222' },
    });
    mocks.getCirclePostPageData.mockResolvedValue({
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
      members: [],
      upcomingEvents: [],
      post: {
        id: '33333333-3333-4333-8333-333333333333',
        content: 'Design critique cadence\nHow often do you ship updates?',
        created_at: '2026-03-24T12:00:00.000Z',
        author: {
          id: '44444444-4444-4444-8444-444444444444',
          full_name: 'Taylor',
          avatar_url: null,
        },
        score: 7,
        userVote: 0,
        comments: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            parent_id: null,
            content: 'We do it weekly.',
            created_at: '2026-03-24T15:00:00.000Z',
            author: {
              id: '66666666-6666-4666-8666-666666666666',
              full_name: 'Jordan',
              avatar_url: null,
            },
            replies: [],
            score: 1,
            userVote: 0,
          },
        ],
      },
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/community/posts/post-1'),
      { params: Promise.resolve({ postId: '33333333-3333-4333-8333-333333333333' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileCommunityPostPageSchema.parse(payload.data).post.comments).toHaveLength(1);
  });

  it('returns 401 when the mobile user is not authenticated', async () => {
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: null,
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/community/posts/post-1'),
      { params: Promise.resolve({ postId: '33333333-3333-4333-8333-333333333333' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
  });
});
