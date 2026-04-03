import { z } from 'zod';

const mobileEventAttendanceStatusSchema = z.enum([
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

export const mobileDiscoverFeedRequestSchema = z.object({
  searchTerm: z.string().max(200).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().max(100).nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  page: z.number().int().positive().optional(),
});

export const mobileDiscoverFeedSchema = z.object({
  header: mobileSurfaceHeaderSchema,
  totalCount: z.number().int().nonnegative(),
  nextPage: z.number().int().positive().nullable().optional(),
  events: z.array(mobileEventSummarySchema),
});

export const mobileDashboardSummarySchema = z.object({
  header: mobileSurfaceHeaderSchema,
  upcomingCount: z.number().int().nonnegative(),
  savedCount: z.number().int().nonnegative(),
  recommendationCount: z.number().int().nonnegative(),
  heroEvent: mobileEventSummarySchema.nullable().optional(),
  upcomingEvents: z.array(mobileEventSummarySchema).optional(),
  recommendedEvents: z.array(mobileEventSummarySchema).optional(),
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

export const mobileOnboardingCareerChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
});

export const mobileOnboardingCareerBootstrapSchema = z.object({
  roles: z.array(mobileOnboardingCareerChoiceSchema),
  goals: z.array(mobileOnboardingCareerChoiceSchema),
  regions: z.array(mobileOnboardingCareerChoiceSchema),
});

export type MobileSurfaceHeader = z.infer<typeof mobileSurfaceHeaderSchema>;
export type MobileEventEngagement = z.infer<typeof mobileEventEngagementSchema>;
export type MobileEventSummary = z.infer<typeof mobileEventSummarySchema>;
export type MobileDiscoverFeedRequest = z.infer<
  typeof mobileDiscoverFeedRequestSchema
>;
export type MobileDiscoverFeed = z.infer<typeof mobileDiscoverFeedSchema>;
export type MobileDashboardSummary = z.infer<
  typeof mobileDashboardSummarySchema
>;
export type MobileEventDetailSpeaker = z.infer<
  typeof mobileEventDetailSpeakerSchema
>;
export type MobileEventDetailAgendaItem = z.infer<
  typeof mobileEventDetailAgendaItemSchema
>;
export type MobileEventDetail = z.infer<typeof mobileEventDetailSchema>;
export type MobileOnboardingCareerBootstrap = z.infer<
  typeof mobileOnboardingCareerBootstrapSchema
>;
