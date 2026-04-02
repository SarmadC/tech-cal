import { z } from 'zod';
import type {
  CareerOnboardingData,
  CareerOptionalSectionSnoozes,
  CareerOptionalSectionStatus,
  CareerOptionalSectionTimestamps,
  MobileCareerOnboardingBootstrap,
  MobileCareerOnboardingCompletePayload,
  MobileCareerOnboardingSkipPayload,
  OnboardingTaxonomyData,
} from './careerOnboarding';
import type { CommunityCircleSummary } from './community';
import {
  communityCircleSummarySchema,
  voteValueSchema,
} from './community';

export const mobileEventAttendanceStatusSchema = z.enum(['attending', 'attended', 'cancelled']);
export const mobileEventEngagementSchema = z.object({
  isBookmarked: z.boolean(),
  status: mobileEventAttendanceStatusSchema.nullable(),
});

export const mobileEventEngagementUpdateSchema = z
  .object({
    isBookmarked: z.boolean().optional(),
    status: mobileEventAttendanceStatusSchema.nullable().optional(),
  })
  .refine(
    (value) => value.isBookmarked !== undefined || value.status !== undefined,
    { message: 'At least one engagement field is required.' }
  );

export const mobileJoinedCirclesSchema = z.array(communityCircleSummarySchema);

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
  viewerContext: z.enum(['attending', 'saved']).optional(),
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
  'expand_people',
  'expand_context',
  'follow',
  'open_event',
  'view_profile',
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
});

export const mobileCommunityNetworkingEventSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  startTime: z.string(),
  imageUrl: z.string().nullable().optional(),
  location: z.string().nullable(),
  format: z.string().nullable(),
  viewerContext: z.enum(['attending', 'saved']),
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
  speakerMatches: z.array(mobileCommunityNetworkingSpeakerMatchSchema).optional(),
  starterProfiles: z.array(mobileCommunityNetworkingStarterProfileSchema).optional(),
  publicProfileCount: z.number().int().nonnegative().optional(),
  ambientActivity: mobileCommunityNetworkingAmbientActivitySchema.optional(),
});

export const mobileCommunityHomeSchema = mobileCommunityNetworkingHomeSchema;

export const mobileCommunityAuthorSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const mobileCommunityCurrentUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const mobileCommunityMemberSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  username: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  headline: z.string().nullable(),
});

export const mobileCommunityCircleSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  memberCount: z.number().int().nonnegative(),
});

export const mobileCommunityCircleUpcomingEventSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string().nullable(),
  startTime: z.string().nullable(),
  organizerName: z.string().nullable(),
  organizerLogoUrl: z.string().nullable(),
});

type MobileCommunityCommentValue = {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: z.infer<typeof mobileCommunityAuthorSchema>;
  isRemoved?: boolean;
  score?: number | null;
  userVote?: z.infer<typeof voteValueSchema> | null;
  replies: MobileCommunityCommentValue[];
};

export const mobileCommunityCommentSchema: z.ZodType<MobileCommunityCommentValue> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    parentId: z.string().uuid().nullable(),
    content: z.string(),
    createdAt: z.string(),
    author: mobileCommunityAuthorSchema,
    isRemoved: z.boolean().optional(),
    score: z.number().nullable().optional(),
    userVote: voteValueSchema.nullable().optional(),
    replies: z.array(mobileCommunityCommentSchema),
  })
);

export const mobileCommunityPostSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  createdAt: z.string(),
  author: mobileCommunityAuthorSchema,
  comments: z.array(mobileCommunityCommentSchema),
  isRemoved: z.boolean().optional(),
  score: z.number().nullable().optional(),
  userVote: voteValueSchema.nullable().optional(),
});

export const mobileCommunityCirclePageSchema = z.object({
  circle: mobileCommunityCircleSummarySchema,
  isJoined: z.boolean(),
  currentUser: mobileCommunityCurrentUserSchema.nullable(),
  members: z.array(mobileCommunityMemberSchema),
  upcomingEvents: z.array(mobileCommunityCircleUpcomingEventSchema),
  posts: z.array(mobileCommunityPostSchema),
});

export const mobileCommunityPostPageSchema = z.object({
  circle: mobileCommunityCircleSummarySchema,
  isJoined: z.boolean(),
  currentUser: mobileCommunityCurrentUserSchema.nullable(),
  members: z.array(mobileCommunityMemberSchema),
  upcomingEvents: z.array(mobileCommunityCircleUpcomingEventSchema),
  post: mobileCommunityPostSchema,
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
});

export const mobileEventCardSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  organizerLogoUrl: z.string().nullable().optional(),
  organizerName: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  engagement: mobileEventEngagementSchema.optional(),
  badges: z.array(z.string()).optional(),
  insight: z.string().nullable().optional(),
  timeLabel: z.string().nullable().optional(),
  format: z.enum(['virtual', 'in-person', 'hybrid']).nullable().optional(),
  formatLabel: z.string().nullable().optional(),
  priceLabel: z.string().nullable().optional(),
});

export const mobileEventDetailHostSchema = z.object({
  name: z.string(),
  logoUrl: z.string().nullable(),
});

export const mobileEventDetailTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  category: z.string().nullable().optional(),
});

export const mobileEventDetailSpeakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
});

export const mobileEventDetailAgendaItemSchema = z.object({
  id: z.string(),
  dayNumber: z.number().int().positive(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  type: z.string(),
  track: z.string().nullable().optional(),
  topics: z.array(z.string()).optional(),
  speakers: z.array(mobileEventDetailSpeakerSchema).optional(),
});

export const mobileEventDetailSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  metaLabel: z.string().nullable(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  timezone: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  registrationUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  host: mobileEventDetailHostSchema,
  tags: z.array(mobileEventDetailTagSchema),
  agenda: z.array(mobileEventDetailAgendaItemSchema),
  speakerLineup: z.array(mobileEventDetailSpeakerSchema),
  engagement: mobileEventEngagementSchema.optional(),
});

export const mobileSurfaceHeaderSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
});

export const mobileDiscoverRankingModeSchema = z.enum(['best-match', 'trending', 'soonest']);

export const mobileDiscoverFormatSchema = z.enum(['all', 'virtual', 'in-person', 'hybrid']);

export const mobileDiscoverCostSchema = z.enum(['all', 'free', 'paid']);

export const mobileDiscoverDateRangeSchema = z.object({
  start: z.string().nullable(),
  end: z.string().nullable(),
});

export const mobileDiscoverFeedRequestSchema = z.object({
  rankingMode: mobileDiscoverRankingModeSchema.optional(),
  searchTerm: z.string().max(200).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().max(100).nullable().optional(),
  dateRange: mobileDiscoverDateRangeSchema.partial().optional(),
  format: mobileDiscoverFormatSchema.optional(),
  cost: mobileDiscoverCostSchema.optional(),
  page: z.number().int().positive().optional(),
});

export const mobileDiscoverRankingOptionSchema = z.object({
  id: mobileDiscoverRankingModeSchema,
  label: z.string(),
  description: z.string(),
});

export const mobileDiscoverAvailableCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number().int().nonnegative(),
});

export const mobileDiscoverAvailableTagSchema = z.object({
  value: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
});

export const mobileDiscoverAppliedFiltersSchema = z.object({
  searchTerm: z.string(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  location: z.string().nullable(),
  dateRange: mobileDiscoverDateRangeSchema,
  format: mobileDiscoverFormatSchema,
  cost: mobileDiscoverCostSchema,
  activeCount: z.number().int().nonnegative(),
});

export const mobileDiscoverCountsSchema = z.object({
  format: z.object({
    virtual: z.number().int().nonnegative(),
    'in-person': z.number().int().nonnegative(),
    hybrid: z.number().int().nonnegative(),
  }),
  cost: z.object({
    free: z.number().int().nonnegative(),
    paid: z.number().int().nonnegative(),
  }),
  categories: z.record(z.number().int().nonnegative()),
  tags: z.record(z.number().int().nonnegative()),
});

export const mobileDiscoverTopPicksSchema = z.object({
  title: z.string(),
  cards: z.array(mobileEventCardSchema).min(1).max(3),
});

export const mobileDiscoverFeedSchema = z.object({
  header: mobileSurfaceHeaderSchema,
  controls: z.object({
    rankingModes: z.array(mobileDiscoverRankingOptionSchema),
    activeRankingMode: mobileDiscoverRankingModeSchema,
  }),
  activeState: z.object({
    resultLabel: z.string(),
    supportingText: z.string(),
  }),
  results: z.object({
    returnedCount: z.number().int().nonnegative(),
    totalCount: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
  filters: mobileDiscoverAppliedFiltersSchema,
  availableFilters: z.object({
    categories: z.array(mobileDiscoverAvailableCategorySchema),
    tags: z.array(mobileDiscoverAvailableTagSchema),
  }),
  counts: mobileDiscoverCountsSchema,
  topPicks: mobileDiscoverTopPicksSchema.nullable(),
  events: z.array(mobileEventCardSchema),
});

export const mobileDashboardHeroSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string(),
  highlight: z.string().nullable().optional(),
});

export const mobileDashboardMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string().nullable().optional(),
});

export const mobileDashboardOnboardingStateSchema = z.object({
  hasCompleted: z.boolean(),
  title: z.string(),
  body: z.string(),
  ctaLabel: z.string().nullable().optional(),
});

export const mobileDashboardHomeSchema = z.object({
  hero: mobileDashboardHeroSchema,
  metrics: z.array(mobileDashboardMetricSchema),
  recommendationsLabel: z.string(),
  recommendations: z.array(mobileEventCardSchema),
  upcomingLabel: z.string(),
  upcoming: z.array(mobileEventCardSchema),
  onboardingState: mobileDashboardOnboardingStateSchema,
});

export const localCalendarDateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const mobileCalendarFeedRequestSchema = z.object({
  monthStart: localCalendarDateKeySchema.optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().max(100).nullable().optional(),
  dateRange: z
    .object({
      start: localCalendarDateKeySchema.nullable().optional(),
      end: localCalendarDateKeySchema.nullable().optional(),
    })
    .optional(),
  cost: mobileDiscoverCostSchema.optional(),
});

export const mobileCalendarEventTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.string().nullable().optional(),
});

export const mobileCalendarEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  location: z.string().nullable().optional(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  eventTypeId: z.string(),
  organizerName: z.string().nullable().optional(),
  engagement: mobileEventEngagementSchema.optional(),
  timeLabel: z.string().nullable().optional(),
  priceLabel: z.string().nullable().optional(),
  isFree: z.boolean(),
});

export const mobileCalendarAppliedFiltersSchema = z.object({
  tags: z.array(z.string()),
  location: z.string().nullable(),
  dateRange: mobileDiscoverDateRangeSchema,
  cost: mobileDiscoverCostSchema,
  activeCount: z.number().int().nonnegative(),
});

export const mobileCalendarCountsSchema = z.object({
  cost: z.object({
    free: z.number().int().nonnegative(),
    paid: z.number().int().nonnegative(),
  }),
  tags: z.record(z.number().int().nonnegative()),
});

export const mobileCalendarFeedSchema = z.object({
  month: z.object({
    monthStart: localCalendarDateKeySchema,
    monthEnd: localCalendarDateKeySchema,
    label: z.string(),
  }),
  results: z.object({
    returnedCount: z.number().int().nonnegative(),
    totalCount: z.number().int().nonnegative(),
  }),
  filters: mobileCalendarAppliedFiltersSchema,
  availableFilters: z.object({
    tags: z.array(mobileDiscoverAvailableTagSchema),
    eventTypes: z.array(mobileCalendarEventTypeSchema),
  }),
  counts: mobileCalendarCountsSchema,
  emptyState: z.object({
    title: z.string(),
    body: z.string(),
  }),
  events: z.array(mobileCalendarEventSchema),
});

export type MobileEventCard = z.infer<typeof mobileEventCardSchema>;
export type MobileEventDetail = z.infer<typeof mobileEventDetailSchema>;
export type MobileEventDetailHost = z.infer<typeof mobileEventDetailHostSchema>;
export type MobileEventDetailTag = z.infer<typeof mobileEventDetailTagSchema>;
export type MobileEventDetailSpeaker = z.infer<typeof mobileEventDetailSpeakerSchema>;
export type MobileEventDetailAgendaItem = z.infer<typeof mobileEventDetailAgendaItemSchema>;
export type MobileEventEngagement = z.infer<typeof mobileEventEngagementSchema>;
export type MobileEventEngagementUpdate = z.infer<typeof mobileEventEngagementUpdateSchema>;
export type MobileDiscoverRankingMode = z.infer<typeof mobileDiscoverRankingModeSchema>;
export type MobileDiscoverFormat = z.infer<typeof mobileDiscoverFormatSchema>;
export type MobileDiscoverCost = z.infer<typeof mobileDiscoverCostSchema>;
export type MobileDiscoverDateRange = z.infer<typeof mobileDiscoverDateRangeSchema>;
export type MobileDiscoverFeedRequest = z.infer<typeof mobileDiscoverFeedRequestSchema>;
export type MobileDiscoverFeed = z.infer<typeof mobileDiscoverFeedSchema>;
export type MobileDashboardHome = z.infer<typeof mobileDashboardHomeSchema>;
export type MobileCalendarFeedRequest = z.infer<typeof mobileCalendarFeedRequestSchema>;
export type MobileCalendarFeed = z.infer<typeof mobileCalendarFeedSchema>;
export type MobileCalendarEvent = z.infer<typeof mobileCalendarEventSchema>;
export type MobileCalendarEventType = z.infer<typeof mobileCalendarEventTypeSchema>;
export type MobileJoinedCircles = CommunityCircleSummary[];
export type MobileCommunityNetworkingSummary = z.infer<typeof mobileCommunityNetworkingSummarySchema>;
export type MobileCommunityNetworkingSharedEvent = z.infer<typeof mobileCommunityNetworkingSharedEventSchema>;
export type MobileCommunityNetworkingAttendeePreview = z.infer<typeof mobileCommunityNetworkingAttendeePreviewSchema>;
export type MobileCommunityNetworkingRecommendedAction = z.infer<typeof mobileCommunityNetworkingRecommendedActionSchema>;
export type MobileCommunityNetworkingSpeaker = z.infer<typeof mobileCommunityNetworkingSpeakerSchema>;
export type MobileCommunityNetworkingSpeakerMatch = z.infer<typeof mobileCommunityNetworkingSpeakerMatchSchema>;
export type MobileSpeakerDetailEvent = z.infer<typeof mobileSpeakerDetailEventSchema>;
export type MobileSpeakerDetail = z.infer<typeof mobileSpeakerDetailSchema>;
export type MobileCommunityNetworkingEvent = z.infer<typeof mobileCommunityNetworkingEventSchema>;
export type MobileCommunityNetworkingPersonCard = z.infer<typeof mobileCommunityNetworkingPersonCardSchema>;
export type MobileCommunityNetworkingFollowUpCard = z.infer<typeof mobileCommunityNetworkingFollowUpCardSchema>;
export type MobileCommunityNetworkingStarterProfile = z.infer<typeof mobileCommunityNetworkingStarterProfileSchema>;
export type MobileCommunityNetworkingHome = z.infer<typeof mobileCommunityNetworkingHomeSchema>;
export type MobileCommunityHome = MobileCommunityNetworkingHome;
export type MobileCommunityAuthor = z.infer<typeof mobileCommunityAuthorSchema>;
export type MobileCommunityCurrentUser = z.infer<typeof mobileCommunityCurrentUserSchema>;
export type MobileCommunityMember = z.infer<typeof mobileCommunityMemberSchema>;
export type MobileCommunityCircleSummary = z.infer<typeof mobileCommunityCircleSummarySchema>;
export type MobileCommunityCircleUpcomingEvent = z.infer<typeof mobileCommunityCircleUpcomingEventSchema>;
export type MobileCommunityComment = z.infer<typeof mobileCommunityCommentSchema>;
export type MobileCommunityPost = z.infer<typeof mobileCommunityPostSchema>;
export type MobileCommunityCirclePage = z.infer<typeof mobileCommunityCirclePageSchema>;
export type MobileCommunityPostPage = z.infer<typeof mobileCommunityPostPageSchema>;
export type MobileFollowStatus = z.infer<typeof mobileFollowStatusSchema>;
export type MobilePublicProfileEvent = z.infer<typeof mobilePublicProfileEventSchema>;
export type MobilePublicProfileCareer = z.infer<typeof mobilePublicProfileCareerSchema>;
export type MobilePublicProfileMutualConnection = z.infer<typeof mobilePublicProfileMutualConnectionSchema>;
export type MobilePublicProfile = z.infer<typeof mobilePublicProfileSchema>;

export type {
  MobileCareerOnboardingBootstrap,
  MobileCareerOnboardingCompletePayload,
  MobileCareerOnboardingSkipPayload,
};
