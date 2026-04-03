import { describe, expect, it } from 'vitest';

import {
  communityPostDraftSchema,
  mobileCommunityCirclePageSchema,
  mobileCommunityHomeSchema,
  mobileCommunityPostPageSchema,
} from './community';

describe('community domain contracts', () => {
  it('parses community drafts used by the shared mutation routes', () => {
    const parsed = communityPostDraftSchema.parse({
      circleId: '11111111-1111-4111-8111-111111111111',
      circleSlug: 'ai-builders',
      content: 'Launching a new thread for AI Builders',
    });

    expect(parsed.circleSlug).toBe('ai-builders');
  });

  it('parses the mobile community home feed contract', () => {
    const parsed = mobileCommunityHomeSchema.parse({
      header: {
        eyebrow: 'Community',
        title: 'Stay close to your circles',
      },
      feed: [
        {
          id: 'post-1',
          content: 'Who is heading to the next meetup?',
          createdAt: '2026-04-03T00:00:00.000Z',
          author: {
            id: 'user-1',
            fullName: 'Ada Lovelace',
            avatarUrl: null,
          },
          circle: {
            slug: 'ai-builders',
            name: 'AI Builders',
          },
          commentCount: 2,
          isTrending: false,
        },
      ],
      circles: [
        {
          id: 'circle-1',
          slug: 'ai-builders',
          name: 'AI Builders',
          description: 'A circle for AI builders.',
          memberCount: 42,
          isJoined: true,
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

    expect(parsed.feed[0]?.circle.name).toBe('AI Builders');
    expect(parsed.circles[0]?.isJoined).toBe(true);
  });

  it('parses circle and post page contracts with nested comments', () => {
    const circlePage = mobileCommunityCirclePageSchema.parse({
      header: {
        eyebrow: 'Circle',
        title: 'AI Builders',
      },
      circle: {
        id: 'circle-1',
        slug: 'ai-builders',
        name: 'AI Builders',
        description: 'A circle for AI builders.',
        memberCount: 42,
      },
      isJoined: true,
      currentUser: {
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
          createdAt: '2026-04-03T00:00:00.000Z',
          author: {
            id: 'user-2',
            fullName: 'Grace Hopper',
            avatarUrl: null,
          },
          comments: [
            {
              id: 'comment-1',
              parentId: null,
              content: 'An agent workflow.',
              createdAt: '2026-04-03T01:00:00.000Z',
              author: {
                id: 'user-3',
                fullName: 'Linus Torvalds',
                avatarUrl: null,
              },
              replies: [],
            },
          ],
        },
      ],
    });

    const postPage = mobileCommunityPostPageSchema.parse({
      header: {
        eyebrow: 'Thread',
        title: 'AI Builders',
      },
      circle: circlePage.circle,
      isJoined: true,
      currentUser: circlePage.currentUser,
      upcomingEvents: [],
      post: circlePage.posts[0],
    });

    expect(circlePage.posts[0]?.comments[0]?.content).toBe('An agent workflow.');
    expect(postPage.post.id).toBe('post-1');
  });
});
