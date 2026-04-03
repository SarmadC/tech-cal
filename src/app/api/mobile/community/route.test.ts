import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileCommunityHomeSchema } from '@kurecal/domain';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getFeedPageData: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/communityHubService', () => ({
  CommunityHubService: {
    getFeedPageData: (...args: unknown[]) => mocks.getFeedPageData(...args),
  },
}));

describe('/api/mobile/community', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.getFeedPageData.mockResolvedValue({
      feed: [
        {
          id: 'post-1',
          content: 'Who is heading to the meetup?',
          createdAt: '2026-04-03T00:00:00.000Z',
          author: {
            id: 'user-2',
            fullName: 'Ada Lovelace',
            avatarUrl: null,
          },
          circle: {
            slug: 'ai-builders',
            name: 'AI Builders',
          },
          commentCount: 2,
          isTrending: false,
          recentComments: [],
        },
      ],
      circles: [
        {
          id: 'circle-1',
          name: 'AI Builders',
          description: 'A circle for AI builders.',
          href: '/circle/ai-builders',
          isJoined: true,
          memberCount: 42,
        },
      ],
      upcomingEvents: [
        {
          id: 'event-1',
          slug: 'ai-night',
          title: 'AI Night',
          startTime: '2026-04-10T18:00:00.000Z',
          location: 'Calgary',
          format: 'Hybrid',
        },
      ],
    });
  });

  it('returns the typed mobile community home contract', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/community', {
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileCommunityHomeSchema.parse(payload.data).circles[0]?.slug).toBe(
      'ai-builders'
    );
    expect(mocks.getFeedPageData).toHaveBeenCalledWith({
      viewerId: 'user-1',
      readClient: {},
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/community')
    );

    expect(response.status).toBe(401);
  });
});
