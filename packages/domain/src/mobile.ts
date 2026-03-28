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
import { communityCircleSummarySchema } from './community';

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

export type {
  MobileCareerOnboardingBootstrap,
  MobileCareerOnboardingCompletePayload,
  MobileCareerOnboardingSkipPayload,
};
