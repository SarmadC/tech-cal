import { z } from 'zod';

import { mobileSurfaceHeaderSchema } from './mobile';

export const voteValueSchema = z.union([
  z.literal(-1),
  z.literal(0),
  z.literal(1),
]);

export const communityPostDraftSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  content: z.string().trim().min(1).max(10_000),
});

export const communityCommentDraftSchema = z.object({
  postId: z.string().uuid(),
  circleSlug: z.string().min(1),
  content: z.string().trim().min(1).max(5_000),
  parentId: z.string().uuid().optional(),
});

export const communityVoteSchema = z.object({
  entityType: z.enum(['post', 'comment']),
  entityId: z.string().uuid(),
  circleSlug: z.string().min(1),
  voteType: voteValueSchema,
});

export const communityReportSchema = z.object({
  subjectType: z.enum(['post', 'comment', 'profile']),
  subjectId: z.string().uuid(),
  reason: z.enum([
    'spam',
    'harassment',
    'hate',
    'sexual-content',
    'misinformation',
    'other',
  ]),
  details: z.string().trim().max(1_500).optional(),
});

export const communityReportStatusSchema = z.enum([
  'open',
  'reviewing',
  'resolved',
  'dismissed',
]);

export const communityReportResolutionSchema = z.enum([
  'removed',
  'warned',
  'no-action',
  'other',
]);

export const communityReportRecordSchema = z.object({
  id: z.string().uuid(),
  reporterId: z.string().uuid(),
  subjectType: z.enum(['post', 'comment', 'profile']),
  subjectId: z.string().uuid(),
  reason: communityReportSchema.shape.reason,
  details: z.string().nullable(),
  status: communityReportStatusSchema,
  resolution: communityReportResolutionSchema.nullable().optional(),
  resolutionNotes: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
  reviewedBy: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const mobileCommunityAuthorSchema = z.object({
  id: z.string(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export type MobileCommunityAuthor = z.infer<typeof mobileCommunityAuthorSchema>;

export const mobileCommunityCurrentUserSchema = z.object({
  id: z.string(),
  fullName: z.string().nullable(),
  username: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const mobileCommunityCircleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  memberCount: z.number().int().nonnegative(),
  isJoined: z.boolean().optional(),
});

export const mobileCommunityCircleMemberSchema = z.object({
  id: z.string(),
  fullName: z.string().nullable(),
  username: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  headline: z.string().nullable(),
});

export const mobileCommunityUpcomingEventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  startTime: z.string(),
  location: z.string().nullable(),
  format: z.string().nullable(),
});

export const mobileCommunityCommentPreviewSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string(),
  author: mobileCommunityAuthorSchema,
});

export const mobileCommunityFeedPostSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string(),
  author: mobileCommunityAuthorSchema,
  circle: z.object({
    slug: z.string(),
    name: z.string(),
  }),
  commentCount: z.number().int().nonnegative(),
  isTrending: z.boolean(),
  recentComments: z.array(mobileCommunityCommentPreviewSchema).optional(),
});

export interface MobileCommunityComment {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: MobileCommunityAuthor;
  isRemoved?: boolean;
  score?: number;
  userVote?: -1 | 0 | 1;
  replies: MobileCommunityComment[];
}

export const mobileCommunityCommentSchema: z.ZodType<MobileCommunityComment> =
  z.lazy(() =>
  z.object({
    id: z.string(),
    parentId: z.string().nullable(),
    content: z.string(),
    createdAt: z.string(),
    author: mobileCommunityAuthorSchema,
    isRemoved: z.boolean().optional(),
    score: z.number().int().optional(),
    userVote: voteValueSchema.optional(),
    replies: z.array(mobileCommunityCommentSchema),
  })
  );

export const mobileCommunityPostSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string(),
  author: mobileCommunityAuthorSchema,
  comments: z.array(mobileCommunityCommentSchema),
  isRemoved: z.boolean().optional(),
  score: z.number().int().optional(),
  userVote: voteValueSchema.optional(),
});

export const mobileCommunityHomeSchema = z.object({
  header: mobileSurfaceHeaderSchema,
  feed: z.array(mobileCommunityFeedPostSchema),
  circles: z.array(mobileCommunityCircleSchema),
  upcomingEvents: z.array(mobileCommunityUpcomingEventSchema),
});

export const mobileCommunityCirclePageSchema = z.object({
  header: mobileSurfaceHeaderSchema,
  circle: mobileCommunityCircleSchema,
  isJoined: z.boolean(),
  currentUser: mobileCommunityCurrentUserSchema.nullable(),
  members: z.array(mobileCommunityCircleMemberSchema),
  upcomingEvents: z.array(mobileCommunityUpcomingEventSchema),
  posts: z.array(mobileCommunityPostSchema),
});

export const mobileCommunityPostPageSchema = z.object({
  header: mobileSurfaceHeaderSchema,
  circle: mobileCommunityCircleSchema,
  isJoined: z.boolean(),
  currentUser: mobileCommunityCurrentUserSchema.nullable(),
  upcomingEvents: z.array(mobileCommunityUpcomingEventSchema),
  post: mobileCommunityPostSchema,
});

export type CommunityPostDraft = z.infer<typeof communityPostDraftSchema>;
export type CommunityCommentDraft = z.infer<typeof communityCommentDraftSchema>;
export type CommunityVoteInput = z.infer<typeof communityVoteSchema>;
export type CommunityReportInput = z.infer<typeof communityReportSchema>;
export type CommunityReportRecord = z.infer<typeof communityReportRecordSchema>;
export type MobileCommunityCurrentUser = z.infer<
  typeof mobileCommunityCurrentUserSchema
>;
export type MobileCommunityCircle = z.infer<typeof mobileCommunityCircleSchema>;
export type MobileCommunityCircleMember = z.infer<
  typeof mobileCommunityCircleMemberSchema
>;
export type MobileCommunityUpcomingEvent = z.infer<
  typeof mobileCommunityUpcomingEventSchema
>;
export type MobileCommunityCommentPreview = z.infer<
  typeof mobileCommunityCommentPreviewSchema
>;
export type MobileCommunityFeedPost = z.infer<
  typeof mobileCommunityFeedPostSchema
>;
export type MobileCommunityPost = z.infer<typeof mobileCommunityPostSchema>;
export type MobileCommunityHome = z.infer<typeof mobileCommunityHomeSchema>;
export type MobileCommunityCirclePage = z.infer<
  typeof mobileCommunityCirclePageSchema
>;
export type MobileCommunityPostPage = z.infer<
  typeof mobileCommunityPostPageSchema
>;
