import {
  mobileCommunityCirclePageSchema,
  mobileCommunityHomeSchema,
  mobileCommunityPostPageSchema,
  type MobileCommunityAuthor,
  type MobileCommunityCircle,
  type MobileCommunityCircleMember,
  type MobileCommunityComment,
  type MobileCommunityCurrentUser,
  type MobileCommunityFeedPost,
  type MobileCommunityHome,
  type MobileCommunityPost,
  type MobileCommunityPostPage,
  type MobileCommunityUpcomingEvent,
  type MobileCommunityCirclePage,
} from '@kurecal/domain';

import type { CircleDiscussionPageData, CirclePostPageData } from '@/services/circleDiscussionService';
import type { CommunityFeedPageData } from '@/types/community';
import type {
  CircleDiscussionAuthor,
  CircleDiscussionComment,
  CircleDiscussionCurrentUser,
  CircleDiscussionMember,
  CircleDiscussionPost,
  CircleDiscussionUpcomingEvent,
} from '@/types/circleDiscussions';

function circleSlugFromHref(href: string): string {
  return href.split('/').filter(Boolean).pop() ?? href;
}

function toAuthor(author: CircleDiscussionAuthor): MobileCommunityAuthor {
  return {
    id: author.id,
    fullName: author.full_name,
    avatarUrl: author.avatar_url,
  };
}

function toCurrentUser(
  currentUser: CircleDiscussionCurrentUser | null
): MobileCommunityCurrentUser | null {
  if (!currentUser) {
    return null;
  }

  return {
    id: currentUser.id,
    fullName: currentUser.fullName,
    username: currentUser.username,
    avatarUrl: currentUser.avatarUrl,
  };
}

function toMember(member: CircleDiscussionMember): MobileCommunityCircleMember {
  return {
    id: member.id,
    fullName: member.fullName,
    username: member.username,
    avatarUrl: member.avatarUrl,
    headline: member.headline,
  };
}

function toUpcomingEvent(
  event: CircleDiscussionUpcomingEvent
): MobileCommunityUpcomingEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title ?? 'Untitled Event',
    startTime: event.startTime ?? new Date(0).toISOString(),
    location: event.organizerName,
    format: null,
  };
}

function toComment(comment: CircleDiscussionComment): MobileCommunityComment {
  return {
    id: comment.id,
    parentId: comment.parent_id,
    content: comment.content,
    createdAt: comment.created_at,
    author: toAuthor(comment.author),
    isRemoved: comment.isRemoved ?? false,
    score: comment.score ?? 0,
    userVote:
      comment.userVote === -1 || comment.userVote === 0 || comment.userVote === 1
        ? comment.userVote
        : undefined,
    replies: comment.replies.map((reply) => toComment(reply)),
  };
}

function toPost(post: CircleDiscussionPost): MobileCommunityPost {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.created_at,
    author: toAuthor(post.author),
    comments: post.comments.map((comment) => toComment(comment)),
    isRemoved: post.isRemoved ?? false,
    score: post.score ?? 0,
    userVote:
      post.userVote === -1 || post.userVote === 0 || post.userVote === 1
        ? post.userVote
        : undefined,
  };
}

function toCircleSummary(input: {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  isJoined?: boolean;
}): MobileCommunityCircle {
  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    description: input.description,
    memberCount: input.memberCount,
    isJoined: input.isJoined,
  };
}

export function buildMobileCommunityHome(
  data: CommunityFeedPageData
): MobileCommunityHome {
  return mobileCommunityHomeSchema.parse({
    header: {
      eyebrow: 'Community',
      title: 'Stay close to your circles',
      subtitle: 'Recent conversations, joined circles, and upcoming moments',
    },
    feed: data.feed.map<MobileCommunityFeedPost>((post) => ({
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        fullName: post.author.fullName,
        avatarUrl: post.author.avatarUrl,
      },
      circle: {
        slug: post.circle.slug,
        name: post.circle.name,
      },
      commentCount: post.commentCount,
      isTrending: post.isTrending,
      recentComments: (post.recentComments ?? []).map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
          id: comment.author.id,
          fullName: comment.author.fullName,
          avatarUrl: comment.author.avatarUrl,
        },
      })),
    })),
    circles: data.circles.map((circle) =>
      toCircleSummary({
        id: circle.id,
        slug: circleSlugFromHref(circle.href),
        name: circle.name,
        description: circle.description,
        memberCount: circle.memberCount,
        isJoined: circle.isJoined,
      })
    ),
    upcomingEvents: data.upcomingEvents.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      startTime: event.startTime,
      location: event.location,
      format: event.format,
    })),
  });
}

export function buildMobileCommunityCirclePage(
  data: CircleDiscussionPageData
): MobileCommunityCirclePage {
  return mobileCommunityCirclePageSchema.parse({
    header: {
      eyebrow: 'Circle',
      title: data.circle.name,
      subtitle: data.circle.description,
    },
    circle: toCircleSummary({
      id: data.circle.id,
      slug: data.circle.slug,
      name: data.circle.name,
      description: data.circle.description,
      memberCount: data.circle.memberCount,
      isJoined: data.isJoined,
    }),
    isJoined: data.isJoined,
    currentUser: toCurrentUser(data.currentUserProfile),
    members: data.members.map((member) => toMember(member)),
    upcomingEvents: data.upcomingEvents.map((event) => toUpcomingEvent(event)),
    posts: data.posts.map((post) => toPost(post)),
  });
}

export function buildMobileCommunityPostPage(
  data: CirclePostPageData
): MobileCommunityPostPage {
  return mobileCommunityPostPageSchema.parse({
    header: {
      eyebrow: 'Thread',
      title: data.circle.name,
      subtitle: 'Expanded discussion',
    },
    circle: toCircleSummary({
      id: data.circle.id,
      slug: data.circle.slug,
      name: data.circle.name,
      description: data.circle.description,
      memberCount: data.circle.memberCount,
      isJoined: data.isJoined,
    }),
    isJoined: data.isJoined,
    currentUser: toCurrentUser(data.currentUserProfile),
    upcomingEvents: data.upcomingEvents.map((event) => toUpcomingEvent(event)),
    post: toPost(data.post),
  });
}
