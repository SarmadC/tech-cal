import { z } from "zod";

import { mobileSurfaceHeaderSchema } from "./surface";

export const voteValueSchema = z.union([
  z.literal(-1),
  z.literal(0),
  z.literal(1),
]);

export const communityPostTypeSchema = z.enum([
  'update',
  'question',
  'intro',
  'showcase',
  'event_note',
  'announcement',
]);

export const membershipStateSchema = z.enum(['none', 'following', 'joined']);

export const communityPostDraftSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  content: z.string().trim().max(10_000),
  postType: communityPostTypeSchema.optional(),
  eventId: z.string().uuid().optional(),
  mentions: z.array(z.object({ userId: z.string().uuid() })).max(20).optional(),
  media: z.array(z.object({
    path: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })).max(4).optional(),
}).superRefine((draft, ctx) => {
  if (
    !draft.content.trim() &&
    !draft.eventId &&
    (!draft.media || draft.media.length === 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Post content, media, or an event attachment is required.",
      path: ["content"],
    });
  }
});

export const communityCommentDraftSchema = z.object({
  postId: z.string().uuid(),
  circleSlug: z.string().min(1),
  content: z.string().trim().min(1).max(5_000),
  parentId: z.string().uuid().optional(),
});

export const communityVoteSchema = z.object({
  entityType: z.enum(["post", "comment"]),
  entityId: z.string().uuid(),
  circleSlug: z.string().min(1),
  voteType: voteValueSchema,
});

export const communityReportSchema = z.object({
  subjectType: z.enum(["post", "comment", "profile", "event_thread", "event_thread_comment"]),
  subjectId: z.string().uuid(),
  reason: z.enum([
    "spam",
    "harassment",
    "hate",
    "sexual-content",
    "misinformation",
    "other",
  ]),
  details: z.string().trim().max(1_500).optional(),
});

export const communityReportStatusSchema = z.enum([
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);

export const communityReportResolutionSchema = z.enum([
  "removed",
  "warned",
  "no-action",
  "other",
]);

export const communityReportRecordSchema = z.object({
  id: z.string().uuid(),
  reporterId: z.string().uuid(),
  subjectType: z.enum(["post", "comment", "profile", "event_thread", "event_thread_comment"]),
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

export const blockedUserSummarySchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  username: z.string().nullable(),
  headline: z.string().nullable(),
  blockedAt: z.string(),
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
  tagline: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  theme: z.string().nullable().optional(),
  topicTags: z.array(z.string()).optional(),
  locationScope: z.string().nullable().optional(),
  activeMemberCount30d: z.number().int().nonnegative().optional(),
  upcomingEventCount: z.number().int().nonnegative().optional(),
  membershipState: membershipStateSchema.optional(),
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
  organizerLogoUrl: z.string().nullable().optional(),
});

export const mobileCommunityCommentPreviewSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string(),
  author: mobileCommunityAuthorSchema,
});

export const mobileCommunityPostMentionSchema = z.object({
  userId: z.string(),
  username: z.string().nullable(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const mobileCommunityMentionCandidateSchema = z.object({
  id: z.string(),
  username: z.string(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const mobileCommunityPostMediaSchema = z.object({
  id: z.string().optional(),
  path: z.string(),
  url: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  position: z.number().int().nonnegative(),
});

export const mobileCommunityPostLinkPreviewSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  siteName: z.string().nullable(),
});

export const mobileCommunityEmbeddedEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  organizerName: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  timeLabel: z.string().nullable().optional(),
  formatLabel: z.string().nullable().optional(),
  priceLabel: z.string().nullable().optional(),
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
  postType: communityPostTypeSchema.optional(),
  eventId: z.string().nullable().optional(),
  event: mobileCommunityEmbeddedEventSchema.nullable().optional(),
  mentions: z.array(mobileCommunityPostMentionSchema).optional(),
  media: z.array(mobileCommunityPostMediaSchema).optional(),
  linkPreviews: z.array(mobileCommunityPostLinkPreviewSchema).optional(),
  isPinned: z.boolean().optional(),
});

export const mobileCommunityNetworkingSummarySchema = z.object({
  trackedUpcomingCount: z.number().int().nonnegative(),
  visibleOpportunityCount: z.number().int().nonnegative(),
  followUpCount: z.number().int().nonnegative(),
  attendanceVisibilityEnabled: z.boolean(),
});

export const mobileCommunityNetworkingSharedEventSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  startTime: z.string(),
  location: z.string().nullable(),
  format: z.string().nullable(),
  viewerContext: z.enum(["attending", "saved"]).optional(),
});

export const mobileCommunityNetworkingAttendeePreviewSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  isInNetwork: z.boolean(),
  followsViewer: z.boolean(),
  isMutualFollow: z.boolean(),
});

export const mobileCommunityNetworkingRecommendedActionSchema = z.enum([
  "expand_people",
  "expand_context",
  "follow",
  "open_event",
  "view_profile",
]);

export const mobileCommunityNetworkingAmbientActivitySchema = z.object({
  publicTrackersToday: z.number().int().nonnegative(),
  newPublicProfilesThisWeek: z.number().int().nonnegative(),
  roomsWithFreshTrackingCount: z.number().int().nonnegative(),
});

export const mobileCommunityNetworkingSpeakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  twitterUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  matchedProfileUsername: z.string().nullable().optional(),
});

export const mobileCommunityNetworkingSpeakerMatchSchema = z.object({
  speaker: mobileCommunityNetworkingSpeakerSchema,
  event: mobileCommunityNetworkingSharedEventSchema,
  matchReason: z.string(),
  isPastEvent: z.literal(true),
});

export const mobileNetworkingContactKindSchema = z.enum(["profile", "speaker"]);

export const mobileNetworkingStateStatusSchema = z.enum([
  "none",
  "requested",
  "connected",
]);

export const mobileNetworkingStateSchema = z.object({
  status: mobileNetworkingStateStatusSchema,
  linkedinRequestedAt: z.string().nullable(),
  confirmedConnectedAt: z.string().nullable(),
});

export const mobileNetworkingContactReferenceSchema = z.object({
  kind: mobileNetworkingContactKindSchema,
  id: z.string(),
  username: z.string().nullable().optional(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  headline: z.string().nullable(),
  linkedinUrl: z.string().nullable().optional(),
  sourceEvent: mobileCommunityNetworkingSharedEventSchema.nullable().optional(),
});

export const mobileSpeakerDetailEventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  startTime: z.string(),
  location: z.string().nullable(),
  format: z.string().nullable(),
  isPastEvent: z.boolean(),
});

export const mobileSpeakerDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  bio: z.string().nullable(),
  photoUrl: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  twitterUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  events: z.array(mobileSpeakerDetailEventSchema),
  networkingState: mobileNetworkingStateSchema.optional(),
});

export const mobileCommunityNetworkingEventSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  startTime: z.string(),
  imageUrl: z.string().nullable().optional(),
  location: z.string().nullable(),
  format: z.string().nullable(),
  viewerContext: z.enum(["attending", "saved"]),
  contextLabel: z.string().optional(),
  recentTrackerCount: z.number().int().nonnegative().optional(),
  totalAttendeeCount: z.number().int().nonnegative(),
  visibleAttendeeCount: z.number().int().nonnegative(),
  networkAttendingCount: z.number().int().nonnegative(),
  relationshipAttendeeCount: z.number().int().nonnegative(),
  attendeePreview: z.array(mobileCommunityNetworkingAttendeePreviewSchema),
  speakerPreview: z.array(mobileCommunityNetworkingSpeakerSchema).optional(),
  primaryReason: z.string(),
  whyNow: z.string(),
  newVisibleAttendeeCount: z.number().int().nonnegative(),
  recommendedAction: mobileCommunityNetworkingRecommendedActionSchema,
});

export const mobileCommunityNetworkingPersonCardSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  headline: z.string().nullable(),
  company: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable(),
  currentRole: z.string().nullable(),
  industry: z.string().nullable(),
  companySize: z.string().nullable(),
  mutualConnectionsCount: z.number().int().nonnegative(),
  isInNetwork: z.boolean(),
  followsViewer: z.boolean(),
  isMutualFollow: z.boolean(),
  sharedUpcomingEventCount: z.number().int().nonnegative(),
  soonestSharedEventStartTime: z.string().nullable(),
  sharedEvents: z.array(mobileCommunityNetworkingSharedEventSchema),
  strongestSharedEvent: mobileCommunityNetworkingSharedEventSchema.nullable(),
  whyNow: z.string(),
  recommendedAction: mobileCommunityNetworkingRecommendedActionSchema,
});

export const mobileCommunityNetworkingFollowUpCardSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  headline: z.string().nullable(),
  company: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable(),
  currentRole: z.string().nullable(),
  industry: z.string().nullable(),
  companySize: z.string().nullable(),
  mutualConnectionsCount: z.number().int().nonnegative(),
  isInNetwork: z.boolean(),
  followsViewer: z.boolean(),
  isMutualFollow: z.boolean(),
  sharedPastEventCount: z.number().int().nonnegative(),
  mostRecentSharedEventStartTime: z.string().nullable(),
  sharedEvents: z.array(mobileCommunityNetworkingSharedEventSchema),
  strongestSharedEvent: mobileCommunityNetworkingSharedEventSchema.nullable(),
  whyNow: z.string(),
  recommendedAction: mobileCommunityNetworkingRecommendedActionSchema,
});

export const mobileCommunityNetworkingStarterProfileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  currentRole: z.string().nullable(),
  industry: z.string().nullable(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
});

export const mobileCommunityNetworkingHomeSchema = z.object({
  summary: mobileCommunityNetworkingSummarySchema,
  upcomingMoments: z.array(mobileCommunityNetworkingEventSchema),
  peopleToMeet: z.array(mobileCommunityNetworkingPersonCardSchema),
  followUpNow: z.array(mobileCommunityNetworkingFollowUpCardSchema),
  speakerMatches: z
    .array(mobileCommunityNetworkingSpeakerMatchSchema)
    .optional(),
  starterProfiles: z
    .array(mobileCommunityNetworkingStarterProfileSchema)
    .optional(),
  publicProfileCount: z.number().int().nonnegative().optional(),
  ambientActivity: mobileCommunityNetworkingAmbientActivitySchema.optional(),
});

export const mobileCommunityHubHomeSchema =
  mobileCommunityNetworkingHomeSchema.extend({
    feed: z.array(mobileCommunityFeedPostSchema).optional(),
    circles: z.array(mobileCommunityCircleSchema).optional(),
    communityUpcomingEvents: z
      .array(mobileCommunityUpcomingEventSchema)
      .optional(),
  });

export const mobileFollowStatusSchema = z.object({
  isFollowing: z.boolean(),
  isFollowedBy: z.boolean(),
  isBlockedByUser: z.boolean(),
  hasBlockedUser: z.boolean(),
});

export const mobilePublicProfileEventActivityTypeSchema = z.enum([
  'attending',
  'attended',
  'saved',
  'speaking',
]);

export const mobilePublicProfileEventSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  location: z.string().nullable(),
  activityType: mobilePublicProfileEventActivityTypeSchema,
  role: z.string().nullable().optional(),
  mutualAttendeeCount: z.number().int().nonnegative().nullable().optional(),
  connectionsMadeCount: z.number().int().nonnegative().nullable().optional(),
});

export const mobilePublicProfileCareerSchema = z.object({
  currentRole: z.string().nullable(),
  seniority: z.string().nullable(),
  industry: z.string().nullable(),
  primarySkills: z.array(z.string()),
  skillsToLearn: z.array(z.string()),
  interests: z.array(z.string()),
  careerGoals: z.array(z.string()),
  networkingGoals: z.array(z.string()),
  preferredEventTypes: z.array(z.string()),
});

export const mobilePublicProfileMutualConnectionSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  headline: z.string().nullable(),
});

export const mobilePublicProfileSharedCircleSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
});

export const mobilePublicProfileRecommendedBySchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const mobilePublicProfileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  username: z.string(),
  headline: z.string().nullable(),
  bio: z.string().nullable().optional(),
  showAttendance: z.boolean(),
  isViewerOwner: z.boolean(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  location: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  relationship: mobileFollowStatusSchema.nullable(),
  recentAttendingEvents: z.array(mobilePublicProfileEventSchema),
  eventCounts: z
    .object({
      attending: z.number().int().nonnegative(),
      attended: z.number().int().nonnegative(),
      speaking: z.number().int().nonnegative(),
      saved: z.number().int().nonnegative(),
    })
    .optional(),
  careerProfile: mobilePublicProfileCareerSchema.nullable(),
  mutualConnections: z.array(mobilePublicProfileMutualConnectionSchema),
  mutualConnectionsCount: z.number().int().nonnegative(),
  sharedEventsCount: z.number().int().nonnegative(),
  sharedTopics: z.array(z.string()).optional(),
  sharedCircles: z.array(mobilePublicProfileSharedCircleSchema).optional(),
  sharedCirclesCount: z.number().int().nonnegative().optional(),
  recommendedBy: z.array(mobilePublicProfileRecommendedBySchema).optional(),
  sharedCareerGoals: z.array(z.string()).optional(),
  networkingState: mobileNetworkingStateSchema.optional(),
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
    }),
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
  postType: communityPostTypeSchema.optional(),
  eventId: z.string().nullable().optional(),
  event: mobileCommunityEmbeddedEventSchema.nullable().optional(),
  mentions: z.array(mobileCommunityPostMentionSchema).optional(),
  media: z.array(mobileCommunityPostMediaSchema).optional(),
  linkPreviews: z.array(mobileCommunityPostLinkPreviewSchema).optional(),
  isPinned: z.boolean().optional(),
});

export const mobileCommunityHomeSchema = mobileCommunityHubHomeSchema;

export const mobileCommunityDiscoveryCardSchema = mobileCommunityCircleSchema.extend({
  contextSignals: z.array(z.string()).optional(),
  upcomingEventTitle: z.string().nullable().optional(),
});

export const mobileCommunityRecentActivitySchema = z.object({
  id: z.string(),
  circleSlug: z.string(),
  circleName: z.string(),
  kind: z.enum(['post', 'event', 'member']),
  summary: z.string(),
  createdAt: z.string(),
});

export const mobileCommunityDiscoverySchema = z.object({
  header: mobileSurfaceHeaderSchema,
  forYou: z.array(mobileCommunityDiscoveryCardSchema),
  joined: z.array(mobileCommunityDiscoveryCardSchema),
  explore: z.array(mobileCommunityDiscoveryCardSchema),
  suggested: z.array(mobileCommunityDiscoveryCardSchema),
  recentActivity: z.array(mobileCommunityRecentActivitySchema),
});

export const mobileCommunityPersonContextSchema = mobileCommunityCircleMemberSchema.extend({
  contextLabel: z.string().nullable().optional(),
  sharedEventId: z.string().nullable().optional(),
  sharedEventTitle: z.string().nullable().optional(),
});

export const mobileCommunityPeopleSchema = z.object({
  header: mobileSurfaceHeaderSchema,
  circle: mobileCommunityCircleSchema,
  peopleForYou: z.array(mobileCommunityPersonContextSchema),
  activeMembers: z.array(mobileCommunityPersonContextSchema),
  goingToNextEvent: z.array(mobileCommunityPersonContextSchema),
  mutuals: z.array(mobileCommunityPersonContextSchema),
  newMembers: z.array(mobileCommunityPersonContextSchema),
});

export const mobileCommunityEventCardSchema = mobileCommunityUpcomingEventSchema.extend({
  attendingFromCircleCount: z.number().int().nonnegative().optional(),
  rsvpState: z.enum(['none', 'saved', 'going']).optional(),
  discussionCount: z.number().int().nonnegative().optional(),
});

export const mobileCommunityEventsSchema = z.object({
  header: mobileSurfaceHeaderSchema,
  circle: mobileCommunityCircleSchema,
  nextUp: z.array(mobileCommunityEventCardSchema),
  thisMonth: z.array(mobileCommunityEventCardSchema),
  past: z.array(mobileCommunityEventCardSchema),
  popularWithMembers: z.array(mobileCommunityEventCardSchema),
});

export const mobileCommunityCirclePageSchema = z.object({
  header: mobileSurfaceHeaderSchema,
  circle: mobileCommunityCircleSchema,
  isJoined: z.boolean(),
  isModerator: z.boolean().optional(),
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
export type BlockedUserSummary = z.infer<typeof blockedUserSummarySchema>;
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
export type MobileCommunityPostMention = z.infer<
  typeof mobileCommunityPostMentionSchema
>;
export type MobileCommunityMentionCandidate = z.infer<
  typeof mobileCommunityMentionCandidateSchema
>;
export type MobileCommunityPostMedia = z.infer<
  typeof mobileCommunityPostMediaSchema
>;
export type MobileCommunityPostLinkPreview = z.infer<
  typeof mobileCommunityPostLinkPreviewSchema
>;
export type MobileCommunityEmbeddedEvent = z.infer<
  typeof mobileCommunityEmbeddedEventSchema
>;
export type MobileCommunityFeedPost = z.infer<
  typeof mobileCommunityFeedPostSchema
>;
export type MobileCommunityNetworkingSummary = z.infer<
  typeof mobileCommunityNetworkingSummarySchema
>;
export type MobileCommunityNetworkingSharedEvent = z.infer<
  typeof mobileCommunityNetworkingSharedEventSchema
>;
export type MobileCommunityNetworkingAttendeePreview = z.infer<
  typeof mobileCommunityNetworkingAttendeePreviewSchema
>;
export type MobileCommunityNetworkingRecommendedAction = z.infer<
  typeof mobileCommunityNetworkingRecommendedActionSchema
>;
export type MobileCommunityNetworkingAmbientActivity = z.infer<
  typeof mobileCommunityNetworkingAmbientActivitySchema
>;
export type MobileCommunityNetworkingSpeaker = z.infer<
  typeof mobileCommunityNetworkingSpeakerSchema
>;
export type MobileCommunityNetworkingSpeakerMatch = z.infer<
  typeof mobileCommunityNetworkingSpeakerMatchSchema
>;
export type MobileNetworkingContactKind = z.infer<
  typeof mobileNetworkingContactKindSchema
>;
export type MobileNetworkingStateStatus = z.infer<
  typeof mobileNetworkingStateStatusSchema
>;
export type MobileNetworkingState = z.infer<typeof mobileNetworkingStateSchema>;
export type MobileNetworkingContactReference = z.infer<
  typeof mobileNetworkingContactReferenceSchema
>;
export type MobileSpeakerDetailEvent = z.infer<
  typeof mobileSpeakerDetailEventSchema
>;
export type MobileSpeakerDetail = z.infer<typeof mobileSpeakerDetailSchema>;
export type MobileCommunityNetworkingEvent = z.infer<
  typeof mobileCommunityNetworkingEventSchema
>;
export type MobileCommunityNetworkingPersonCard = z.infer<
  typeof mobileCommunityNetworkingPersonCardSchema
>;
export type MobileCommunityNetworkingFollowUpCard = z.infer<
  typeof mobileCommunityNetworkingFollowUpCardSchema
>;
export type MobileCommunityNetworkingStarterProfile = z.infer<
  typeof mobileCommunityNetworkingStarterProfileSchema
>;
export type MobileCommunityPost = z.infer<typeof mobileCommunityPostSchema>;
export type MobileFollowStatus = z.infer<typeof mobileFollowStatusSchema>;
export type MobilePublicProfileEvent = z.infer<
  typeof mobilePublicProfileEventSchema
>;
export type MobilePublicProfileCareer = z.infer<
  typeof mobilePublicProfileCareerSchema
>;
export type MobilePublicProfileMutualConnection = z.infer<
  typeof mobilePublicProfileMutualConnectionSchema
>;
export type MobilePublicProfile = z.infer<typeof mobilePublicProfileSchema>;
export type MobileCommunityNetworkingHome = z.infer<
  typeof mobileCommunityNetworkingHomeSchema
>;
export type MobileCommunityHome = z.infer<typeof mobileCommunityHubHomeSchema>;
export type MobileCommunityCirclePage = z.infer<
  typeof mobileCommunityCirclePageSchema
>;
export type MobileCommunityPostPage = z.infer<
  typeof mobileCommunityPostPageSchema
>;
export type CommunityPostType = z.infer<typeof communityPostTypeSchema>;
export type MembershipState = z.infer<typeof membershipStateSchema>;
export type MobileCommunityDiscoveryCard = z.infer<
  typeof mobileCommunityDiscoveryCardSchema
>;
export type MobileCommunityRecentActivity = z.infer<
  typeof mobileCommunityRecentActivitySchema
>;
export type MobileCommunityDiscovery = z.infer<
  typeof mobileCommunityDiscoverySchema
>;
export type MobileCommunityPersonContext = z.infer<
  typeof mobileCommunityPersonContextSchema
>;
export type MobileCommunityPeople = z.infer<typeof mobileCommunityPeopleSchema>;
export type MobileCommunityEventCard = z.infer<
  typeof mobileCommunityEventCardSchema
>;
export type MobileCommunityEvents = z.infer<typeof mobileCommunityEventsSchema>;

// ─── Event Room + Thread types ───────────────────────────────────────────────

export const communityReportSubjectTypeSchema = z.enum([
  "post",
  "comment",
  "profile",
  "event_thread",
  "event_thread_comment",
]);

export const mobileCommunityRoomEventSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  location: z.string().nullable(),
  format: z.string().nullable(),
  imageUrl: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
});

export const mobileCommunityRoomViewerStateSchema = z.object({
  isAttending: z.boolean(),
  isSaved: z.boolean(),
  isVisible: z.boolean(),
});

export const mobileCommunityRoomStatsSchema = z.object({
  totalAttendeeCount: z.number().int().nonnegative(),
  visibleAttendeeCount: z.number().int().nonnegative(),
  networkAttendingCount: z.number().int().nonnegative(),
  activeNowCount: z.number().int().nonnegative(),
  threadCount: z.number().int().nonnegative(),
});

export const mobileCommunityRoomRelationshipSchema = z.enum([
  "mutual",
  "follows_you",
  "in_network",
  "stranger",
]);

export const mobileCommunityRoomAttendeeSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  headline: z.string().nullable(),
  currentRole: z.string().nullable(),
  industry: z.string().nullable(),
  location: z.string().nullable(),
  isInNetwork: z.boolean(),
  followsViewer: z.boolean(),
  isMutualFollow: z.boolean(),
  mutualConnectionsCount: z.number().int().nonnegative(),
  relationship: mobileCommunityRoomRelationshipSchema,
  matchReason: z.string().nullable(),
});

export const mobileCommunityRoomSignalKindSchema = z.enum([
  "joined_attending",
  "saved",
  "mutual_arrived",
]);

export const mobileCommunityRoomSignalActorSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});

export const mobileCommunityRoomSignalSchema = z.object({
  id: z.string(),
  kind: mobileCommunityRoomSignalKindSchema,
  occurredAt: z.string(),
  actor: mobileCommunityRoomSignalActorSchema,
});

export const mobileCommunityRoomDetailSchema = z.object({
  event: mobileCommunityRoomEventSchema,
  viewer: mobileCommunityRoomViewerStateSchema,
  stats: mobileCommunityRoomStatsSchema,
  attendees: z.array(mobileCommunityRoomAttendeeSchema),
  signals: z.array(mobileCommunityRoomSignalSchema),
});

export const mobileCommunityRoomThreadAuthorSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  headline: z.string().nullable().optional(),
});

export const mobileCommunityRoomThreadSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  commentCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  lastActivityAt: z.string(),
  author: mobileCommunityRoomThreadAuthorSchema,
  isAuthor: z.boolean(),
  editedAt: z.string().nullable(),
});

export const mobileCommunityRoomThreadDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

export const mobileCommunityRoomThreadEditDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

export const mobileCommunityRoomThreadListSchema = z.object({
  threads: z.array(mobileCommunityRoomThreadSchema),
  nextCursor: z.string().nullable(),
});

export const mobileCommunityRoomThreadCommentAuthorSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
});

// Child comments (depth-1) cannot themselves have nested replies — the service
// layer collapses any "reply-to-a-reply" onto the top-level parent, capping
// the tree at one level.
export const mobileCommunityRoomThreadChildCommentSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  body: z.string(),
  createdAt: z.string(),
  author: mobileCommunityRoomThreadCommentAuthorSchema,
  isAuthor: z.boolean(),
  isOp: z.boolean(),
  isDeleted: z.boolean(),
  editedAt: z.string().nullable(),
});

export const mobileCommunityRoomThreadCommentSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  body: z.string(),
  createdAt: z.string(),
  author: mobileCommunityRoomThreadCommentAuthorSchema,
  isAuthor: z.boolean(),
  isOp: z.boolean(),
  isDeleted: z.boolean(),
  editedAt: z.string().nullable(),
  replies: z.array(mobileCommunityRoomThreadChildCommentSchema),
});

export const mobileCommunityRoomThreadCommentPageSchema = z.object({
  comments: z.array(mobileCommunityRoomThreadCommentSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  loadedCount: z.number().int().nonnegative(),
});

export const mobileCommunityRoomThreadCommentDraftSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentCommentId: z.string().uuid().nullable().optional(),
});

export const mobileCommunityRoomThreadCommentEditDraftSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const mobileCommunityRoomCommentSortSchema = z.enum([
  "newest",
  "oldest",
]);

export const mobileCommunityRoomThreadDetailSchema = z.object({
  thread: mobileCommunityRoomThreadSchema,
  comments: z.array(mobileCommunityRoomThreadCommentSchema),
  commentPage: mobileCommunityRoomThreadCommentPageSchema,
});

export type CommunityReportSubjectType = z.infer<typeof communityReportSubjectTypeSchema>;
export type MobileCommunityRoomEvent = z.infer<typeof mobileCommunityRoomEventSchema>;
export type MobileCommunityRoomViewerState = z.infer<typeof mobileCommunityRoomViewerStateSchema>;
export type MobileCommunityRoomStats = z.infer<typeof mobileCommunityRoomStatsSchema>;
export type MobileCommunityRoomRelationship = z.infer<typeof mobileCommunityRoomRelationshipSchema>;
export type MobileCommunityRoomAttendee = z.infer<typeof mobileCommunityRoomAttendeeSchema>;
export type MobileCommunityRoomSignalKind = z.infer<typeof mobileCommunityRoomSignalKindSchema>;
export type MobileCommunityRoomSignal = z.infer<typeof mobileCommunityRoomSignalSchema>;
export type MobileCommunityRoomDetail = z.infer<typeof mobileCommunityRoomDetailSchema>;
export type MobileCommunityRoomThreadAuthor = z.infer<typeof mobileCommunityRoomThreadAuthorSchema>;
export type MobileCommunityRoomThread = z.infer<typeof mobileCommunityRoomThreadSchema>;
export type MobileCommunityRoomThreadDraft = z.infer<typeof mobileCommunityRoomThreadDraftSchema>;
export type MobileCommunityRoomThreadEditDraft = z.infer<typeof mobileCommunityRoomThreadEditDraftSchema>;
export type MobileCommunityRoomThreadList = z.infer<typeof mobileCommunityRoomThreadListSchema>;
export type MobileCommunityRoomThreadCommentAuthor = z.infer<typeof mobileCommunityRoomThreadCommentAuthorSchema>;
export type MobileCommunityRoomThreadChildComment = z.infer<typeof mobileCommunityRoomThreadChildCommentSchema>;
export type MobileCommunityRoomThreadComment = z.infer<typeof mobileCommunityRoomThreadCommentSchema>;
export type MobileCommunityRoomThreadCommentPage = z.infer<typeof mobileCommunityRoomThreadCommentPageSchema>;
export type MobileCommunityRoomThreadCommentDraft = z.infer<typeof mobileCommunityRoomThreadCommentDraftSchema>;
export type MobileCommunityRoomThreadCommentEditDraft = z.infer<typeof mobileCommunityRoomThreadCommentEditDraftSchema>;
export type MobileCommunityRoomCommentSort = z.infer<typeof mobileCommunityRoomCommentSortSchema>;
export type MobileCommunityRoomThreadDetail = z.infer<typeof mobileCommunityRoomThreadDetailSchema>;
