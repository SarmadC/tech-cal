import { z } from 'zod';

export const voteValueSchema = z.union([z.literal(-1), z.literal(0), z.literal(1)]);
export type VoteValue = z.infer<typeof voteValueSchema>;

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

export const communityReportStatusSchema = z.enum(['open', 'reviewing', 'resolved', 'dismissed']);
export const communityReportResolutionSchema = z.enum(['removed', 'warned', 'no-action', 'other']);

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

export const communityFeedAuthorSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const communityCircleSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
});

export const communityFeedCircleSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string(),
  name: z.string(),
});

export const communityFeedPostSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  createdAt: z.string(),
  commentCount: z.number().int().nonnegative(),
  isTrending: z.boolean(),
  author: communityFeedAuthorSchema,
  circle: communityFeedCircleSchema,
  recentComments: z
    .array(
      z.object({
        id: z.string().uuid(),
        content: z.string(),
        createdAt: z.string(),
        author: communityFeedAuthorSchema,
      })
    )
    .optional(),
});

export const communityFeedSnapshotSchema = z.object({
  feed: z.array(communityFeedPostSchema),
  joinedCircleCount: z.number().int().nonnegative(),
  upcomingCount: z.number().int().nonnegative(),
});

export type CommunityPostDraft = z.infer<typeof communityPostDraftSchema>;
export type CommunityCommentDraft = z.infer<typeof communityCommentDraftSchema>;
export type CommunityVoteInput = z.infer<typeof communityVoteSchema>;
export type CommunityReportInput = z.infer<typeof communityReportSchema>;
export type CommunityReportRecord = z.infer<typeof communityReportRecordSchema>;
export type CommunityCircleSummary = z.infer<typeof communityCircleSummarySchema>;
export type CommunityFeedPost = z.infer<typeof communityFeedPostSchema>;
export type CommunityFeedSnapshot = z.infer<typeof communityFeedSnapshotSchema>;
