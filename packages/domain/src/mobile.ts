import { z } from 'zod';

export const mobileSurfaceHeaderSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
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
});

export const mobileEventDetailSchema = z.object({
  event: mobileEventSummarySchema.extend({
    sourceUrl: z.string().nullable().optional(),
    registrationUrl: z.string().nullable().optional(),
  }),
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
export type MobileEventSummary = z.infer<typeof mobileEventSummarySchema>;
export type MobileDiscoverFeedRequest = z.infer<
  typeof mobileDiscoverFeedRequestSchema
>;
export type MobileDiscoverFeed = z.infer<typeof mobileDiscoverFeedSchema>;
export type MobileDashboardSummary = z.infer<
  typeof mobileDashboardSummarySchema
>;
export type MobileEventDetail = z.infer<typeof mobileEventDetailSchema>;
export type MobileOnboardingCareerBootstrap = z.infer<
  typeof mobileOnboardingCareerBootstrapSchema
>;
