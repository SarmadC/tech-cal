import { z } from 'zod';

import {
  mobileNetworkingContactKindSchema,
  mobileNetworkingContactReferenceSchema,
  mobileNetworkingStateSchema,
} from './community';
import { profileVisibilitySchema, socialProfileSchema } from './socialProfile';
import { mobileSurfaceHeaderSchema } from './surface';

export { mobileSurfaceHeaderSchema } from './surface';

export const mobileEventAttendanceStatusSchema = z.enum([
  'attending',
  'attended',
  'cancelled',
]);

export const mobileCalendarProviderSchema = z.enum(['google', 'apple']);

export const mobileCalendarProviderStatusSchema = z.enum([
  'not_connected',
  'connected',
  'synced',
  'needs_reauth',
  'failed',
]);

export const mobileCalendarSyncStateSchema = z.object({
  provider: mobileCalendarProviderSchema,
  status: mobileCalendarProviderStatusSchema,
  syncedAt: z.string().nullable().optional(),
  externalEventId: z.string().nullable().optional(),
});

export const mobileCalendarConnectionStatusSchema = z.object({
  provider: z.literal('google').nullable(),
  connected: z.boolean(),
  isActive: z.boolean(),
  hasRefreshToken: z.boolean(),
  status: mobileCalendarProviderStatusSchema,
  calendarId: z.string().nullable().optional(),
  lastSyncStatus: z.string().nullable().optional(),
  lastSyncAt: z.string().nullable().optional(),
  lastSyncError: z.string().nullable().optional(),
  requiresUpgrade: z.boolean().optional(),
});

export const mobileGoogleCalendarSyncInputSchema = z.object({
  eventId: z.string().min(1),
  action: z.enum(['sync', 'delete']),
});

export const mobileGoogleCalendarBulkSyncResultSchema = z.object({
  total: z.number().int().nonnegative(),
  synced: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z.array(z.string()),
});

export const mobileEventEngagementSchema = z.object({
  isBookmarked: z.boolean(),
  status: mobileEventAttendanceStatusSchema.nullable().optional(),
  calendarSync: mobileCalendarSyncStateSchema.nullable().optional(),
});

export const mobileEventEngagementUpdateSchema = z
  .object({
    isBookmarked: z.boolean().optional(),
    status: mobileEventAttendanceStatusSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      Object.prototype.hasOwnProperty.call(value, 'isBookmarked') ||
      Object.prototype.hasOwnProperty.call(value, 'status'),
    {
      message: 'At least one engagement field must be provided.',
    }
  );

export const mobileEventAgendaSaveSchema = z.object({
  eventId: z.string(),
  agendaItemId: z.string(),
  isSaved: z.boolean(),
});

export const mobileEventNetworkingFeedbackSchema = z.object({
  eventId: z.string(),
  actualValueRating: z.number().int().min(1).max(5).nullable(),
  connectionsMade: z.number().int().nonnegative().nullable(),
  linkedinRequestsSent: z.number().int().nonnegative().nullable(),
});

export const mobileEventNetworkingFeedbackUpdateSchema = z
  .object({
    actualValueRating: z.number().int().min(1).max(5).nullable().optional(),
    connectionsMade: z.number().int().nonnegative().nullable().optional(),
    linkedinRequestsSent: z.number().int().nonnegative().nullable().optional(),
  })
  .refine(
    (value) =>
      Object.prototype.hasOwnProperty.call(value, 'actualValueRating') ||
      Object.prototype.hasOwnProperty.call(value, 'connectionsMade') ||
      Object.prototype.hasOwnProperty.call(value, 'linkedinRequestsSent'),
    {
      message: 'At least one feedback field must be provided.',
    }
  );

export const mobileNetworkingContactUpdateActionSchema = z.enum([
  'mark_request_sent',
  'confirm_connection',
  'clear_request',
  'clear_connection',
]);

export const mobileNetworkingContactTargetSchema = z.object({
  kind: mobileNetworkingContactKindSchema,
  id: z.string(),
  sourceEventId: z.string().nullable().optional(),
});

export const mobileNetworkingContactUpdateSchema = z.object({
  target: mobileNetworkingContactTargetSchema,
  action: mobileNetworkingContactUpdateActionSchema,
});

export const mobileNetworkingContactRecordSchema = z.object({
  contact: mobileNetworkingContactReferenceSchema,
  networkingState: mobileNetworkingStateSchema,
});

export const mobileEventSummarySchema = z.object({
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
  engagement: mobileEventEngagementSchema.optional(),
});

export const mobileDiscoverRankingModeSchema = z.enum([
  'best-match',
  'trending',
  'soonest',
]);

export const mobileDiscoverFormatSchema = z.enum([
  'all',
  'virtual',
  'in-person',
  'hybrid',
]);

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

export const localCalendarDateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

export const mobileEventCardSchema = z.object({
  id: z.string(),
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
  categories: z.record(z.string(), z.number().int().nonnegative()),
  tags: z.record(z.string(), z.number().int().nonnegative()),
});

export const mobileDiscoverTopPicksSchema = z.object({
  title: z.string(),
  cards: z.array(mobileEventCardSchema).min(1).max(3),
});

const pagedEventFeedShape = {
  header: mobileSurfaceHeaderSchema,
  totalCount: z.number().int().nonnegative(),
  nextPage: z.number().int().positive().nullable().optional(),
  events: z.array(mobileEventSummarySchema),
} as const;

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

export const mobileSavedEventsFeedSchema = z.object(pagedEventFeedShape);

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

export const mobileCalendarDaySummarySchema = z.object({
  dateKey: localCalendarDateKeySchema,
  dayNumber: z.number().int().min(1).max(31),
  inCurrentMonth: z.boolean(),
  isToday: z.boolean(),
  eventCount: z.number().int().nonnegative(),
  savedCount: z.number().int().nonnegative(),
  attendingCount: z.number().int().nonnegative(),
});

export const mobileCalendarEventSchema = mobileEventSummarySchema.extend({
  dateKey: localCalendarDateKeySchema,
  timezone: z.string().nullable().optional(),
  eventTypeId: z.string().nullable().optional(),
  eventTypeName: z.string().nullable().optional(),
  eventTypeColor: z.string().nullable().optional(),
  isAllDay: z.boolean().optional(),
  isFree: z.boolean().optional(),
});

export const mobileCalendarEventTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.string().nullable().optional(),
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
  tags: z.record(z.string(), z.number().int().nonnegative()),
});

export const mobileCalendarFeedSchema = z.object({
  header: mobileSurfaceHeaderSchema,
  month: z.object({
    monthStart: localCalendarDateKeySchema,
    monthEnd: localCalendarDateKeySchema,
    label: z.string(),
  }),
  today: localCalendarDateKeySchema,
  metrics: z.object({
    totalCount: z.number().int().nonnegative(),
    savedCount: z.number().int().nonnegative(),
    attendingCount: z.number().int().nonnegative(),
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
  days: z.array(mobileCalendarDaySummarySchema).length(42),
  events: z.array(mobileCalendarEventSchema),
  emptyState: z.object({
    title: z.string(),
    description: z.string().optional(),
    body: z.string().optional(),
  }),
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

export const mobileDashboardTopRecommendationSchema = z.object({
  event: mobileEventCardSchema,
  daysUntil: z.number().int().nonnegative(),
  impactLabel: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export const mobileDashboardCommitmentSchema = z.object({
  trackingId: z.string(),
  daysUntil: z.number().int().nonnegative(),
  event: mobileEventSummarySchema,
});

export const mobileDashboardPipelineInsightSchema = z.object({
  trackedUpcomingCount: z.number().int().nonnegative(),
  scoredUpcomingCount: z.number().int().nonnegative(),
  avgScore: z.number().int().nonnegative(),
  highFitCount: z.number().int().nonnegative(),
  topEvents: z.array(
    z.object({
      eventId: z.string(),
      title: z.string(),
      score: z.number().int().nonnegative(),
    })
  ),
});

export const mobileDashboardFunnelInsightSchema = z.object({
  savedOnly: z.number().int().nonnegative(),
  rsvped: z.number().int().nonnegative(),
  attended: z.number().int().nonnegative(),
});

export const mobileDashboardMonthlyPulseSchema = z.object({
  currentCount: z.number().int().nonnegative(),
  deltaLabel: z.string(),
  trend: z.array(
    z.object({
      label: z.string(),
      value: z.number().int().nonnegative(),
    })
  ),
});

export const mobileDashboardRecentWinSchema = z.object({
  event: mobileEventSummarySchema,
  score: z.number().int().nonnegative(),
  trackedAt: z.string(),
  attendedDate: z.string(),
  matchedSkills: z.array(z.string()),
  matchedGoals: z.array(z.string()),
  bookmarkedLeadDays: z.number().int().nonnegative().optional(),
  feedbackSubmitted: z.boolean(),
  actualValueRating: z.number().int().min(1).max(5).nullable().optional(),
});

export const mobileDashboardPerformanceSchema = z.object({
  summary: z.object({
    attendedCount: z.number().int().nonnegative(),
    ratedCount: z.number().int().nonnegative(),
    connectionsMade: z.number().int().nonnegative(),
  }),
  recentWins: z.array(mobileDashboardRecentWinSchema),
  hiddenCount: z.number().int().nonnegative(),
});

export const mobileDashboardEngagementStreakSchema = z.object({
  currentWeekStreak: z.number().int().nonnegative(),
  longestWeekStreak: z.number().int().nonnegative(),
  recentWeeks: z.array(
    z.object({
      weekKey: z.string(),
      active: z.boolean(),
    })
  ),
  nudgeMessage: z.string(),
});

export const mobileDashboardDiscoveryBreadthLabelSchema = z.enum([
  'narrow',
  'balanced',
  'broad',
]);

export const mobileDashboardDiscoveryBreadthSchema = z.object({
  categoryCount: z.number().int().nonnegative(),
  organizerCount: z.number().int().nonnegative(),
  formatCounts: z.object({
    virtual: z.number().int().nonnegative(),
    'in-person': z.number().int().nonnegative(),
    hybrid: z.number().int().nonnegative(),
  }),
  breadthLabel: mobileDashboardDiscoveryBreadthLabelSchema,
});

export const mobileDashboardNetworkPulseSchema = z.object({
  confirmedConnectionCount: z.number().int().nonnegative(),
  pendingRequestCount: z.number().int().nonnegative(),
  nextContactToConfirm: mobileNetworkingContactReferenceSchema
    .nullable()
    .optional(),
});

export const mobileDashboardPeerComparisonSchema = z.object({
  percentile: z.number().int().min(0).max(100),
  comparison: z.enum(['above', 'below', 'average']),
  sampleSize: z.number().int().nonnegative(),
  confidence: z.enum(['high', 'medium', 'low']),
  recommendation: z.string(),
});

export const mobileDashboardPredictionConfidenceSchema = z.enum([
  'not_enough_data',
  'learning',
  'calibrated',
]);

export const mobileDashboardPredictionAccuracyStateSchema = z.enum([
  'empty',
  'learning',
  'ready',
]);

export const mobileDashboardPredictionAccuracySchema = z.object({
  accuracy: z.number().min(0).max(100).nullable(),
  sampleSize: z.number().int().nonnegative(),
  confidenceLabel: mobileDashboardPredictionConfidenceSchema,
  state: mobileDashboardPredictionAccuracyStateSchema,
  unlockMessage: z.string().nullable().optional(),
});

export const mobileDashboardSkillProgressSchema = z.object({
  skill: z.string(),
  eventsAttended: z.number().int().nonnegative(),
  progressLevel: z.enum(['exploring', 'building', 'regular']),
  nextMilestone: z.string(),
});

export const mobileDashboardInsightMessageSchema = z.object({
  tone: z.enum(['success', 'info', 'warning']),
  message: z.string(),
});

export const mobileDashboardCareerImpactSchema = z.object({
  totalEvents: z.number().int().nonnegative(),
  skillAlignedCount: z.number().int().nonnegative(),
  skillAlignedPercentage: z.number().int().nonnegative(),
  goalAlignedCount: z.number().int().nonnegative(),
  goalAlignedPercentage: z.number().int().nonnegative(),
  networkingCount: z.number().int().nonnegative(),
  networkingPercentage: z.number().int().nonnegative(),
  skillProgress: z.array(mobileDashboardSkillProgressSchema),
  insights: z.array(mobileDashboardInsightMessageSchema),
});

export const mobileDashboardOutcomeStateSchema = z.enum([
  'empty',
  'early',
  'mature',
]);

export const mobileDashboardCareerOutcomesSchema = z.object({
  state: mobileDashboardOutcomeStateSchema,
  attendedCount: z.number().int().nonnegative(),
  upcomingCount: z.number().int().nonnegative(),
  feedbackCount: z.number().int().nonnegative(),
  unratedAttendedCount: z.number().int().nonnegative(),
  ratingsRemaining: z.number().int().nonnegative(),
  nextEventToRate: mobileEventSummarySchema.nullable().optional(),
  nextEventToConfirmConnections: mobileEventSummarySchema.nullable().optional(),
  averageRating: z.number().nullable().optional(),
  recommendationRate: z.number().nullable().optional(),
  totalConnectionsMade: z.number().int().nonnegative(),
  uniqueSkillsCount: z.number().int().nonnegative(),
  teaserMessage: z.string().nullable().optional(),
});

export const mobileDashboardSummarySchema = z.object({
  hero: mobileDashboardHeroSchema,
  metrics: z.array(mobileDashboardMetricSchema),
  recommendationsLabel: z.string(),
  recommendations: z.array(mobileEventCardSchema),
  upcomingLabel: z.string(),
  upcoming: z.array(mobileEventCardSchema),
  onboardingState: mobileDashboardOnboardingStateSchema,
  topRecommendation: mobileDashboardTopRecommendationSchema.nullable().optional(),
  upcomingCommitments: z.array(mobileDashboardCommitmentSchema).optional(),
  showOpenCommitmentSlot: z.boolean().optional(),
  insights: z
    .object({
      pipeline: mobileDashboardPipelineInsightSchema,
      funnel: mobileDashboardFunnelInsightSchema,
    })
    .optional(),
  monthlyPulse: mobileDashboardMonthlyPulseSchema.optional(),
  performance: mobileDashboardPerformanceSchema.optional(),
  engagementStreak: mobileDashboardEngagementStreakSchema.optional(),
  discoveryBreadth: mobileDashboardDiscoveryBreadthSchema.optional(),
  networkPulse: mobileDashboardNetworkPulseSchema.optional(),
  peerComparison: mobileDashboardPeerComparisonSchema.nullable().optional(),
  predictionAccuracy: mobileDashboardPredictionAccuracySchema.optional(),
  careerImpact: mobileDashboardCareerImpactSchema.optional(),
  careerOutcomes: mobileDashboardCareerOutcomesSchema.optional(),
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
  track: z.string().nullable().optional(),
  topics: z.array(z.string()).optional(),
  isSaved: z.boolean().optional(),
  speakers: z.array(mobileEventDetailSpeakerSchema),
});

export const mobileEventNetworkingPulseSchema = z.object({
  state: z.enum(['empty', 'active']),
  trendingTopic: z
    .object({
      label: z.string(),
      activityLabel: z.string(),
    })
    .nullable(),
  mostSavedSession: z
    .object({
      agendaItemId: z.string(),
      title: z.string(),
      saveCount: z.number().int().nonnegative(),
    })
    .nullable(),
});

export const mobileEventDetailSchema = z.object({
  event: mobileEventSummarySchema.extend({
    sourceUrl: z.string().nullable().optional(),
    registrationUrl: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    metaLabel: z.string().nullable().optional(),
  }),
  host: z
    .object({
      id: z.string().optional(),
      name: z.string(),
      logoUrl: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  tags: z.array(z.string()).optional(),
  agenda: z.array(mobileEventDetailAgendaItemSchema).optional(),
  speakerLineup: z.array(mobileEventDetailSpeakerSchema).optional(),
  networkingPulse: mobileEventNetworkingPulseSchema.optional(),
});

export const mobileOnboardingStatusSchema = z.object({
  onboarded: z.boolean(),
  source: z.enum(['career_profiles', 'legacy', 'none']),
});

export const mobileProfileSummarySchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  timezone: z.string().nullable(),
});

export const mobileCareerProfileSummarySchema = z.object({
  currentRole: z.string(),
  seniority: z.string(),
  industry: z.string(),
  companyName: z.string().nullable().optional(),
  primarySkills: z.array(z.string()),
  skillsToLearn: z.array(z.string()),
  interests: z.array(z.string()),
  careerGoals: z.array(z.string()),
  timeframe: z.string().nullable().optional(),
  learningStyle: z.array(z.string()).optional(),
  networkingGoals: z.array(z.string()).optional(),
  preferredEventTypes: z.array(z.string()).optional(),
});

export const mobileProfileStateSchema = z.object({
  profile: mobileProfileSummarySchema,
  socialProfile: socialProfileSchema,
  onboarding: mobileOnboardingStatusSchema,
  careerProfile: mobileCareerProfileSummarySchema.nullable().optional(),
});

export const mobileProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120).nullable().optional(),
  username: z.string().trim().max(30).nullable().optional(),
  headline: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(220).nullable().optional(),
  profileVisibility: profileVisibilitySchema.optional(),
  showAttendance: z.boolean().optional(),
});

export const mobileOnboardingTaxonomyOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  keywords: z.array(z.string()).optional(),
});

export const mobileOnboardingRoleGroupSchema = z.object({
  key: z.string(),
  label: z.string(),
  roles: z.array(z.string()),
});

export const mobileOnboardingRoleSuggestionSchema = z.object({
  current: z.array(z.string()).optional(),
  learn: z.array(z.string()).optional(),
});

export const mobileCareerOnboardingRoleStepSchema = z.object({
  currentRole: z.string().trim().min(1),
  seniority: z.string().trim().min(1),
  industry: z.string().trim(),
  companyName: z.string().trim().max(120).optional(),
  companySize: z.string().trim(),
});

export const mobileCareerOnboardingSkillsStepSchema = z.object({
  primarySkills: z.array(z.string().trim().min(1)).min(2),
  skillsToLearn: z.array(z.string().trim().min(1)),
  interests: z.array(z.string().trim().min(1)),
});

export const mobileCareerOnboardingGoalsStepSchema = z.object({
  careerGoals: z.array(z.string().trim().min(1)).min(1).max(2),
  timeframe: z.string().trim().min(1),
});

export const mobileCareerOnboardingPreferencesStepSchema = z.object({
  targetPath: z.string().trim().optional(),
  learningStyle: z.array(z.string().trim().min(1)),
  availableTime: z.string().trim(),
  budget: z.string().trim(),
});

export const mobileCareerOnboardingNetworkingStepSchema = z.object({
  networkingGoals: z.array(z.string().trim().min(1)),
  preferredEventTypes: z.array(z.string().trim().min(1)),
});

export const mobileCareerOnboardingTeamStepSchema = z.object({
  teamRole: z.string().trim(),
  collaborationStyle: z.array(z.string().trim().min(1)),
  teamSizePreference: z.string().trim(),
  communicationPreferences: z.array(z.string().trim().min(1)),
  teamGoals: z.array(z.string().trim().min(1)),
  mentorshipPreference: z.string().trim(),
  availabilityPattern: z.string().trim().nullable().optional(),
  projectTypePreferences: z.array(z.string().trim().min(1)),
});

export const mobileCareerOnboardingDataSchema = z.object({
  step1_role: mobileCareerOnboardingRoleStepSchema,
  step2_skills: mobileCareerOnboardingSkillsStepSchema,
  step3_goals: mobileCareerOnboardingGoalsStepSchema,
  step4_preferences: mobileCareerOnboardingPreferencesStepSchema,
  step5_networking: mobileCareerOnboardingNetworkingStepSchema,
  step6_teamBuilding: mobileCareerOnboardingTeamStepSchema,
});

export const mobileCareerOnboardingDraftSchema = z.object({
  step1_role: z.object({
    currentRole: z.string().trim().max(120),
    seniority: z.string().trim(),
    industry: z.string().trim(),
    companyName: z.string().trim().max(120).optional(),
    companySize: z.string().trim(),
  }),
  step2_skills: z.object({
    primarySkills: z.array(z.string().trim().min(1)),
    skillsToLearn: z.array(z.string().trim().min(1)),
    interests: z.array(z.string().trim().min(1)),
  }),
  step3_goals: z.object({
    careerGoals: z.array(z.string().trim().min(1)).max(2),
    timeframe: z.string().trim(),
  }),
  step4_preferences: mobileCareerOnboardingPreferencesStepSchema,
  step5_networking: mobileCareerOnboardingNetworkingStepSchema,
  step6_teamBuilding: mobileCareerOnboardingTeamStepSchema,
});

export const mobileOnboardingTaxonomySchema = z.object({
  roleGroups: z.array(mobileOnboardingRoleGroupSchema),
  skillOptions: z.array(mobileOnboardingTaxonomyOptionSchema),
  interestOptions: z.array(mobileOnboardingTaxonomyOptionSchema),
  roleSuggestions: z.record(z.string(), mobileOnboardingRoleSuggestionSchema),
});

export const mobileCareerOnboardingBootstrapSchema = z.object({
  status: mobileOnboardingStatusSchema,
  initialData: mobileCareerOnboardingDataSchema.nullable(),
  taxonomy: mobileOnboardingTaxonomySchema,
});

export const mobileCareerOnboardingRequestSchema = z.discriminatedUnion(
  'action',
  [
    z.object({
      action: z.literal('complete'),
      data: mobileCareerOnboardingDataSchema,
    }),
    z.object({
      action: z.literal('save-draft'),
      data: mobileCareerOnboardingDraftSchema,
    }),
    z.object({
      action: z.literal('skip'),
    }),
  ]
);

export type MobileEventAttendanceStatus = z.infer<
  typeof mobileEventAttendanceStatusSchema
>;
export type MobileSurfaceHeader = z.infer<typeof mobileSurfaceHeaderSchema>;
export type MobileEventEngagement = z.infer<typeof mobileEventEngagementSchema>;
export type MobileCalendarProvider = z.infer<
  typeof mobileCalendarProviderSchema
>;
export type MobileCalendarProviderStatus = z.infer<
  typeof mobileCalendarProviderStatusSchema
>;
export type MobileCalendarSyncState = z.infer<
  typeof mobileCalendarSyncStateSchema
>;
export type MobileCalendarConnectionStatus = z.infer<
  typeof mobileCalendarConnectionStatusSchema
>;
export type MobileGoogleCalendarSyncInput = z.infer<
  typeof mobileGoogleCalendarSyncInputSchema
>;
export type MobileGoogleCalendarBulkSyncResult = z.infer<
  typeof mobileGoogleCalendarBulkSyncResultSchema
>;
export type MobileEventEngagementUpdate = z.infer<
  typeof mobileEventEngagementUpdateSchema
>;
export type MobileEventNetworkingFeedback = z.infer<
  typeof mobileEventNetworkingFeedbackSchema
>;
export type MobileEventNetworkingFeedbackUpdate = z.infer<
  typeof mobileEventNetworkingFeedbackUpdateSchema
>;
export type MobileNetworkingContactUpdateAction = z.infer<
  typeof mobileNetworkingContactUpdateActionSchema
>;
export type MobileNetworkingContactTarget = z.infer<
  typeof mobileNetworkingContactTargetSchema
>;
export type MobileNetworkingContactUpdate = z.infer<
  typeof mobileNetworkingContactUpdateSchema
>;
export type MobileNetworkingContactRecord = z.infer<
  typeof mobileNetworkingContactRecordSchema
>;
export type MobileEventSummary = z.infer<typeof mobileEventSummarySchema>;
export type MobileDiscoverRankingMode = z.infer<
  typeof mobileDiscoverRankingModeSchema
>;
export type MobileDiscoverFormat = z.infer<typeof mobileDiscoverFormatSchema>;
export type MobileDiscoverCost = z.infer<typeof mobileDiscoverCostSchema>;
export type MobileDiscoverDateRange = z.infer<
  typeof mobileDiscoverDateRangeSchema
>;
export type MobileDiscoverFeedRequest = z.infer<
  typeof mobileDiscoverFeedRequestSchema
>;
export type MobileEventCard = z.infer<typeof mobileEventCardSchema>;
export type MobileDiscoverFeed = z.infer<typeof mobileDiscoverFeedSchema>;
export type MobileSavedEventsFeed = z.infer<typeof mobileSavedEventsFeedSchema>;
export type LocalCalendarDateKey = z.infer<typeof localCalendarDateKeySchema>;
export type MobileCalendarFeedRequest = z.infer<
  typeof mobileCalendarFeedRequestSchema
>;
export type MobileCalendarDaySummary = z.infer<
  typeof mobileCalendarDaySummarySchema
>;
export type MobileCalendarEvent = z.infer<typeof mobileCalendarEventSchema>;
export type MobileCalendarEventType = z.infer<
  typeof mobileCalendarEventTypeSchema
>;
export type MobileCalendarFeed = z.infer<typeof mobileCalendarFeedSchema>;
export type MobileDashboardSummary = z.infer<
  typeof mobileDashboardSummarySchema
>;
export type MobileDashboardTopRecommendation = z.infer<
  typeof mobileDashboardTopRecommendationSchema
>;
export type MobileDashboardCommitment = z.infer<
  typeof mobileDashboardCommitmentSchema
>;
export type MobileDashboardPipelineInsight = z.infer<
  typeof mobileDashboardPipelineInsightSchema
>;
export type MobileDashboardFunnelInsight = z.infer<
  typeof mobileDashboardFunnelInsightSchema
>;
export type MobileDashboardMonthlyPulse = z.infer<
  typeof mobileDashboardMonthlyPulseSchema
>;
export type MobileDashboardRecentWin = z.infer<
  typeof mobileDashboardRecentWinSchema
>;
export type MobileDashboardPerformance = z.infer<
  typeof mobileDashboardPerformanceSchema
>;
export type MobileDashboardEngagementStreak = z.infer<
  typeof mobileDashboardEngagementStreakSchema
>;
export type MobileDashboardDiscoveryBreadthLabel = z.infer<
  typeof mobileDashboardDiscoveryBreadthLabelSchema
>;
export type MobileDashboardDiscoveryBreadth = z.infer<
  typeof mobileDashboardDiscoveryBreadthSchema
>;
export type MobileDashboardNetworkPulse = z.infer<
  typeof mobileDashboardNetworkPulseSchema
>;
export type MobileDashboardPeerComparison = z.infer<
  typeof mobileDashboardPeerComparisonSchema
>;
export type MobileDashboardPredictionConfidence = z.infer<
  typeof mobileDashboardPredictionConfidenceSchema
>;
export type MobileDashboardPredictionAccuracyState = z.infer<
  typeof mobileDashboardPredictionAccuracyStateSchema
>;
export type MobileDashboardPredictionAccuracy = z.infer<
  typeof mobileDashboardPredictionAccuracySchema
>;
export type MobileDashboardSkillProgress = z.infer<
  typeof mobileDashboardSkillProgressSchema
>;
export type MobileDashboardInsightMessage = z.infer<
  typeof mobileDashboardInsightMessageSchema
>;
export type MobileDashboardCareerImpact = z.infer<
  typeof mobileDashboardCareerImpactSchema
>;
export type MobileDashboardOutcomeState = z.infer<
  typeof mobileDashboardOutcomeStateSchema
>;
export type MobileDashboardCareerOutcomes = z.infer<
  typeof mobileDashboardCareerOutcomesSchema
>;
export type MobileEventDetailSpeaker = z.infer<
  typeof mobileEventDetailSpeakerSchema
>;
export type MobileEventDetailAgendaItem = z.infer<
  typeof mobileEventDetailAgendaItemSchema
>;
export type MobileEventNetworkingPulse = z.infer<
  typeof mobileEventNetworkingPulseSchema
>;
export type MobileEventAgendaSave = z.infer<
  typeof mobileEventAgendaSaveSchema
>;
export type MobileEventDetail = z.infer<typeof mobileEventDetailSchema>;
export type MobileOnboardingStatus = z.infer<typeof mobileOnboardingStatusSchema>;
export type MobileProfileSummary = z.infer<typeof mobileProfileSummarySchema>;
export type MobileCareerProfileSummary = z.infer<
  typeof mobileCareerProfileSummarySchema
>;
export type MobileProfileState = z.infer<typeof mobileProfileStateSchema>;
export type MobileProfileUpdate = z.infer<typeof mobileProfileUpdateSchema>;
export type MobileOnboardingTaxonomyOption = z.infer<
  typeof mobileOnboardingTaxonomyOptionSchema
>;
export type MobileOnboardingRoleGroup = z.infer<
  typeof mobileOnboardingRoleGroupSchema
>;
export type MobileCareerOnboardingData = z.infer<
  typeof mobileCareerOnboardingDataSchema
>;
export type MobileCareerOnboardingDraft = z.infer<
  typeof mobileCareerOnboardingDraftSchema
>;
export type MobileOnboardingTaxonomy = z.infer<
  typeof mobileOnboardingTaxonomySchema
>;
export type MobileCareerOnboardingBootstrap = z.infer<
  typeof mobileCareerOnboardingBootstrapSchema
>;
export type MobileCareerOnboardingRequest = z.infer<
  typeof mobileCareerOnboardingRequestSchema
>;

// ---------------------------------------------------------------------------
// Notifications (in-app inbox)
// ---------------------------------------------------------------------------

export const mobileNotificationTypeSchema = z.enum([
  'post_reply',
  'comment_reply',
  'mention',
]);

// PostgreSQL's uuid type accepts canonical UUID text without requiring RFC
// version or variant bits. Some long-lived seeded circle IDs use that format,
// so validate the database representation rather than Zod's stricter RFC UUID.
export const postgresUuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid PostgreSQL UUID'
);

export const mobileNotificationItemSchema = z.object({
  id: z.string().uuid(),
  type: mobileNotificationTypeSchema,
  createdAt: z.string(),
  readAt: z.string().nullable(),
  actor: z
    .object({
      id: z.string().uuid().nullable(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
  circle: z
    .object({
      id: postgresUuidSchema.nullable(),
      slug: z.string().nullable(),
    })
    .nullable(),
  postId: z.string().uuid().nullable(),
  commentId: z.string().uuid().nullable(),
  preview: z.string().nullable(),
});

export const mobileNotificationListResponseSchema = z.object({
  items: z.array(mobileNotificationItemSchema),
  nextCursor: z.string().nullable(),
});

export const mobileNotificationMarkReadRequestSchema = z
  .object({
    ids: z.array(z.string().uuid()).max(200).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.all) !== Boolean(v.ids && v.ids.length > 0), {
    message: 'Provide either `ids` or `all`, not both.',
  });

export const mobileNotificationDismissRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  dismissed: z.boolean(),
});

export const mobileNotificationUnreadCountSchema = z.object({
  count: z.number().int().nonnegative(),
});

export const mobileNotificationPreferencesSchema = z.object({
  postReply: z.boolean(),
  commentReply: z.boolean(),
  mention: z.boolean(),
});

export const mobileNotificationPreferencesUpdateSchema =
  mobileNotificationPreferencesSchema.partial();

export type MobileNotificationType = z.infer<typeof mobileNotificationTypeSchema>;
export type MobileNotificationItem = z.infer<typeof mobileNotificationItemSchema>;
export type MobileNotificationListResponse = z.infer<
  typeof mobileNotificationListResponseSchema
>;
export type MobileNotificationMarkReadRequest = z.infer<
  typeof mobileNotificationMarkReadRequestSchema
>;
export type MobileNotificationDismissRequest = z.infer<
  typeof mobileNotificationDismissRequestSchema
>;
export type MobileNotificationUnreadCount = z.infer<
  typeof mobileNotificationUnreadCountSchema
>;
export type MobileNotificationPreferences = z.infer<
  typeof mobileNotificationPreferencesSchema
>;
export type MobileNotificationPreferencesUpdate = z.infer<
  typeof mobileNotificationPreferencesUpdateSchema
>;
