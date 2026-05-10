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
  'event_note',
  'announcement',
]);

export const membershipStateSchema = z.enum(['none', 'following', 'joined']);

export const communityPostDraftSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  content: z.string().trim().min(1).max(10_000),
  postType: communityPostTypeSchema.optional(),
  eventId: z.string().uuid().optional(),
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
  subjectType: z.enum(["post", "comment", "profile"]),
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
  subjectType: z.enum(["post", "comment", "profile"]),
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
  postType: communityPostTypeSchema.optional(),
  eventId: z.string().nullable().optional(),
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

export const mobilePublicProfileEventSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  startTime: z.string(),
  location: z.string().nullable(),
});

export const mobilePublicProfileCareerSchema = z.object({
  currentRole: z.string().nullable(),
  seniority: z.string().nullable(),
  industry: z.string().nullable(),
});

export const mobilePublicProfileMutualConnectionSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  headline: z.string().nullable(),
});

export const mobilePublicProfileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  username: z.string(),
  headline: z.string().nullable(),
  isViewerOwner: z.boolean(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  relationship: mobileFollowStatusSchema.nullable(),
  recentAttendingEvents: z.array(mobilePublicProfileEventSchema),
  careerProfile: mobilePublicProfileCareerSchema.nullable(),
  mutualConnections: z.array(mobilePublicProfileMutualConnectionSchema),
  mutualConnectionsCount: z.number().int().nonnegative(),
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
