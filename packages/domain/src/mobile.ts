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

export const mobileDiscoverFeedRequestSchema = z.object({
  searchTerm: z.string().max(200).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().max(100).nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  page: z.number().int().positive().optional(),
});

export const localCalendarDateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

const pagedEventFeedShape = {
  header: mobileSurfaceHeaderSchema,
  totalCount: z.number().int().nonnegative(),
  nextPage: z.number().int().positive().nullable().optional(),
  events: z.array(mobileEventSummarySchema),
} as const;

export const mobileDiscoverFeedSchema = z.object(pagedEventFeedShape);

export const mobileSavedEventsFeedSchema = z.object(pagedEventFeedShape);

export const mobileCalendarFeedRequestSchema = z.object({
  monthStart: localCalendarDateKeySchema.optional(),
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
  eventTypeName: z.string().nullable().optional(),
  eventTypeColor: z.string().nullable().optional(),
  isAllDay: z.boolean().optional(),
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
  days: z.array(mobileCalendarDaySummarySchema).length(42),
  events: z.array(mobileCalendarEventSchema),
  emptyState: z.object({
    title: z.string(),
    description: z.string(),
  }),
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
export type MobileDiscoverFeedRequest = z.infer<
  typeof mobileDiscoverFeedRequestSchema
>;
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
export type MobileCalendarFeed = z.infer<typeof mobileCalendarFeedSchema>;
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
