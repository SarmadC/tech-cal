import { z } from 'zod';

import { profileVisibilitySchema, socialProfileSchema } from './socialProfile';

export const mobileEventAttendanceStatusSchema = z.enum([
  'attending',
  'attended',
  'cancelled',
]);

export const mobileSurfaceHeaderSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
});

export const mobileEventEngagementSchema = z.object({
  isBookmarked: z.boolean(),
  status: mobileEventAttendanceStatusSchema.nullable().optional(),
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
  categories: z.record(z.number().int().nonnegative()),
  tags: z.record(z.number().int().nonnegative()),
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
  tags: z.record(z.number().int().nonnegative()),
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

export const mobileDashboardNetworkPulseTopEventSchema = z.object({
  eventId: z.string(),
  title: z.string(),
  connectionsMade: z.number().int().nonnegative(),
});

export const mobileDashboardNetworkPulseSchema = z.object({
  totalConnectionsMade: z.number().int().nonnegative(),
  connectionsPerEvent: z.number().nonnegative(),
  topConnectingEvent: mobileDashboardNetworkPulseTopEventSchema
    .nullable()
    .optional(),
  networkingEventRatio: z.number().int().nonnegative(),
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
  speakers: z.array(mobileEventDetailSpeakerSchema),
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
  timezone: z.string().trim().max(120).nullable().optional(),
  username: z.string().trim().max(30).nullable().optional(),
  headline: z.string().trim().max(120).nullable().optional(),
  profileVisibility: profileVisibilitySchema.optional(),
  showAttendance: z.boolean().optional(),
});

export const mobileOnboardingTaxonomyOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
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

export const mobileOnboardingTaxonomySchema = z.object({
  roleGroups: z.array(mobileOnboardingRoleGroupSchema),
  skillOptions: z.array(mobileOnboardingTaxonomyOptionSchema),
  interestOptions: z.array(mobileOnboardingTaxonomyOptionSchema),
  roleSuggestions: z.record(mobileOnboardingRoleSuggestionSchema),
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
      action: z.literal('skip'),
    }),
  ]
);

export type MobileEventAttendanceStatus = z.infer<
  typeof mobileEventAttendanceStatusSchema
>;
export type MobileSurfaceHeader = z.infer<typeof mobileSurfaceHeaderSchema>;
export type MobileEventEngagement = z.infer<typeof mobileEventEngagementSchema>;
export type MobileEventEngagementUpdate = z.infer<
  typeof mobileEventEngagementUpdateSchema
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
export type MobileDashboardNetworkPulseTopEvent = z.infer<
  typeof mobileDashboardNetworkPulseTopEventSchema
>;
export type MobileDashboardNetworkPulse = z.infer<
  typeof mobileDashboardNetworkPulseSchema
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
export type MobileOnboardingTaxonomy = z.infer<
  typeof mobileOnboardingTaxonomySchema
>;
export type MobileCareerOnboardingBootstrap = z.infer<
  typeof mobileCareerOnboardingBootstrapSchema
>;
export type MobileCareerOnboardingRequest = z.infer<
  typeof mobileCareerOnboardingRequestSchema
>;
