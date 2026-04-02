import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityHubService } from '@/services/communityHubService';

const mocks = vi.hoisted(() => ({
  getBlockedUserIdsForViewer: vi.fn(),
}));

vi.mock('@/services/blockService', () => ({
  BlockService: {
    getBlockedUserIdsForViewer: (...args: unknown[]) =>
      mocks.getBlockedUserIdsForViewer(...args),
  },
}));

function createCircleMembersChain(data: Array<{ circle_id: string }>) {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(async () => ({ data, error: null }));

  return chain;
}

function createCirclesChain(
  data: Array<{ id: string; slug: string; name: string }>
) {
  return {
    select: vi.fn(async () => ({ data, error: null })),
  };
}

function createPostsChain(data: unknown[]) {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.select = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(async () => ({ data, error: null }));

  return chain;
}

function createCommentsChain(data: unknown[]) {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.select = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(async () => ({ data, error: null }));

  return chain;
}

function createProfilesChain(data: unknown[]) {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.select = vi.fn(() => chain);
  chain.in = vi.fn(async () => ({ data, error: null }));

  return chain;
}

describe('CommunityHubService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters blocked authors and blocked reply previews out of the feed', async () => {
    mocks.getBlockedUserIdsForViewer.mockResolvedValue(new Set(['blocked-user']));

    const joinedCircleMembersChain = createCircleMembersChain([
      { circle_id: 'circle-1' },
    ]);
    const circlesChain = createCirclesChain([
      { id: 'circle-1', slug: 'ai-builders', name: 'AI Builders' },
      { id: 'circle-2', slug: 'mobile-makers', name: 'Mobile Makers' },
    ]);
    const joinedPostsChain = createPostsChain([
      {
        id: 'post-1',
        content: 'Safe joined post',
        created_at: '2026-03-24T10:00:00.000Z',
        author_id: 'safe-author',
        circle_id: 'circle-1',
        moderation_status: 'active',
      },
      {
        id: 'post-2',
        content: 'Blocked author post',
        created_at: '2026-03-24T09:00:00.000Z',
        author_id: 'blocked-user',
        circle_id: 'circle-1',
        moderation_status: 'active',
      },
    ]);
    const globalPostsChain = createPostsChain([
      {
        id: 'post-1',
        content: 'Safe joined post',
        created_at: '2026-03-24T10:00:00.000Z',
        author_id: 'safe-author',
        circle_id: 'circle-1',
        moderation_status: 'active',
      },
      {
        id: 'post-3',
        content: 'Global safe post',
        created_at: '2026-03-24T08:00:00.000Z',
        author_id: 'global-author',
        circle_id: 'circle-2',
        moderation_status: 'active',
      },
    ]);
    const commentsChain = createCommentsChain([
      {
        id: 'comment-1',
        post_id: 'post-1',
        content: 'Helpful reply',
        created_at: '2026-03-24T10:10:00.000Z',
        author_id: 'reply-author',
      },
      {
        id: 'comment-2',
        post_id: 'post-1',
        content: 'Blocked reply',
        created_at: '2026-03-24T10:09:00.000Z',
        author_id: 'blocked-user',
      },
    ]);
    const profilesChain = createProfilesChain([
      {
        id: 'safe-author',
        full_name: 'Safe Author',
        avatar_url: null,
      },
      {
        id: 'global-author',
        full_name: 'Global Author',
        avatar_url: null,
      },
      {
        id: 'reply-author',
        full_name: 'Helpful Member',
        avatar_url: null,
      },
    ]);

    let circlePostsCallCount = 0;

    const readClient = {
      from: vi.fn((table: string) => {
        if (table === 'circle_members') {
          return joinedCircleMembersChain;
        }

        if (table === 'circles') {
          return circlesChain;
        }

        if (table === 'circle_posts') {
          circlePostsCallCount += 1;
          return circlePostsCallCount === 1 ? joinedPostsChain : globalPostsChain;
        }

        if (table === 'circle_comments') {
          return commentsChain;
        }

        if (table === 'profiles') {
          return profilesChain;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    } as any;

    const feed = await (CommunityHubService as any).getFeed({
      viewerId: 'viewer-1',
      readClient,
    });

    expect(mocks.getBlockedUserIdsForViewer).toHaveBeenCalledWith(
      'viewer-1',
      expect.arrayContaining(['safe-author', 'blocked-user', 'reply-author']),
      readClient
    );
    expect(feed).toHaveLength(2);
    expect(feed.map((post: { id: string }) => post.id)).toEqual(['post-1', 'post-3']);
    expect(feed[0].commentCount).toBe(1);
    expect(feed[0].recentComments).toEqual([
      expect.objectContaining({
        id: 'comment-1',
        content: 'Helpful reply',
        author: expect.objectContaining({ id: 'reply-author' }),
      }),
    ]);
  });
});
