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

function createMentionsChain(data: unknown[]) {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.select = vi.fn(() => chain);
  chain.in = vi.fn(async () => ({ data, error: null }));

  return chain;
}

function createOrderedAttachmentChain(data: unknown[]) {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.select = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(async () => ({ data, error: null }));

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
        title: 'Safe joined post',
        content: 'Safe joined post',
        created_at: '2026-03-24T10:00:00.000Z',
        author_id: 'safe-author',
        circle_id: 'circle-1',
        post_type: 'update',
        moderation_status: 'active',
      },
      {
        id: 'post-2',
        title: 'Blocked author post',
        content: 'Blocked author post',
        created_at: '2026-03-24T09:00:00.000Z',
        author_id: 'blocked-user',
        circle_id: 'circle-1',
        post_type: 'update',
        moderation_status: 'active',
      },
    ]);
    const globalPostsChain = createPostsChain([
      {
        id: 'post-1',
        title: 'Safe joined post',
        content: 'Safe joined post',
        created_at: '2026-03-24T10:00:00.000Z',
        author_id: 'safe-author',
        circle_id: 'circle-1',
        post_type: 'update',
        moderation_status: 'active',
      },
      {
        id: 'post-3',
        title: 'Global safe post',
        content: 'Global safe post',
        created_at: '2026-03-24T08:00:00.000Z',
        author_id: 'global-author',
        circle_id: 'circle-2',
        post_type: 'question',
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
    const mentionsChain = createMentionsChain([]);
    const mediaChain = createOrderedAttachmentChain([
      {
        id: 'media-1',
        post_id: 'post-1',
        storage_path: 'posts/post-1/image.jpg',
        width: 1200,
        height: 800,
        position: 0,
      },
    ]);
    const linksChain = createOrderedAttachmentChain([]);

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

        if (table === 'circle_post_mentions') {
          return mentionsChain;
        }

        if (table === 'circle_post_media') {
          return mediaChain;
        }

        if (table === 'circle_post_links') {
          return linksChain;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: vi.fn(() => ({
          getPublicUrl: vi.fn((path: string) => ({
            data: { publicUrl: `https://cdn.example.com/${path}` },
          })),
        })),
      },
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
    expect(feed[0].media?.[0]).toEqual(
      expect.objectContaining({
        id: 'media-1',
        url: 'https://cdn.example.com/posts/post-1/image.jpg',
      })
    );
    expect(feed[0].recentComments).toEqual([
      expect.objectContaining({
        id: 'comment-1',
        content: 'Helpful reply',
        author: expect.objectContaining({ id: 'reply-author' }),
      }),
    ]);
  });

  it('loads a bounded recent post list for a public profile', async () => {
    const postsChain = createPostsChain([
      {
        id: 'post-1',
        title: 'A useful update',
        content: 'What I learned this week.',
        created_at: '2026-07-30T18:00:00.000Z',
        author_id: 'profile-1',
        circle_id: 'circle-1',
        event_id: 'event-1',
        post_type: 'update',
        moderation_status: 'active',
      },
    ]);
    const profileChain = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({
        data: {
          id: 'profile-1',
          full_name: 'Ada Lovelace',
          avatar_url: null,
        },
        error: null,
      })),
    };
    profileChain.select.mockReturnValue(profileChain);
    profileChain.eq.mockReturnValue(profileChain);
    const circlesChain = {
      select: vi.fn(),
      eq: vi.fn(async () => ({
        data: [{ id: 'circle-1', slug: 'ai-builders', name: 'AI Builders' }],
        error: null,
      })),
    };
    circlesChain.select.mockReturnValue(circlesChain);
    const commentsChain = {
      select: vi.fn(),
      in: vi.fn(),
      eq: vi.fn(async () => ({ data: [{ post_id: 'post-1' }], error: null })),
    };
    commentsChain.select.mockReturnValue(commentsChain);
    commentsChain.in.mockReturnValue(commentsChain);
    const mentionsChain = createMentionsChain([]);
    const mediaChain = createOrderedAttachmentChain([]);
    const linksChain = createOrderedAttachmentChain([]);
    const eventsChain = {
      select: vi.fn(),
      in: vi.fn(async () => ({
        data: [
          {
            id: 'event-1',
            slug: 'applied-ai-night',
            title: 'Applied AI Night',
            description: null,
            start_time: '2026-08-10T18:00:00.000Z',
            end_time: null,
            location: 'Edmonton',
            event_image_url: null,
            event_format: 'in-person',
            organizer: { name: 'AI Builders', logo_url: null },
          },
        ],
        error: null,
      })),
    };
    eventsChain.select.mockReturnValue(eventsChain);
    const readClient = {
      from: vi.fn((table: string) => {
        if (table === 'circle_posts') return postsChain;
        if (table === 'profiles') return profileChain;
        if (table === 'circles') return circlesChain;
        if (table === 'circle_comments') return commentsChain;
        if (table === 'circle_post_mentions') return mentionsChain;
        if (table === 'circle_post_media') return mediaChain;
        if (table === 'circle_post_links') return linksChain;
        if (table === 'events') return eventsChain;
        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: vi.fn(() => ({
          getPublicUrl: vi.fn((path: string) => ({
            data: { publicUrl: `https://cdn.example.com/${path}` },
          })),
        })),
      },
    } as any;

    const posts = await CommunityHubService.getProfilePosts({
      profileUserId: 'profile-1',
      readClient,
      limit: 3,
    });

    expect(postsChain.eq).toHaveBeenCalledWith('author_id', 'profile-1');
    expect(circlesChain.eq).toHaveBeenCalledWith('visibility', 'public');
    expect(postsChain.in).toHaveBeenCalledWith('circle_id', ['circle-1']);
    expect(postsChain.limit).toHaveBeenCalledWith(3);
    expect(posts).toEqual([
      expect.objectContaining({
        id: 'post-1',
        commentCount: 1,
        circle: { slug: 'ai-builders', name: 'AI Builders' },
        event: expect.objectContaining({
          id: 'event-1',
          title: 'Applied AI Night',
        }),
      }),
    ]);
  });
});
