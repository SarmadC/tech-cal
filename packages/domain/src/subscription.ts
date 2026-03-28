import { z } from 'zod';

export const subscriptionTierSchema = z.enum(['free', 'pro', 'team']);
export const subscriptionStatusSchema = z.enum([
  'active',
  'trialing',
  'past_due',
  'canceled',
  'expired',
]);
export const billingProviderSchema = z.enum(['paddle', 'revenuecat', 'manual']);

export const subscriptionEntitlementsSchema = z.object({
  calendar_sync: z.boolean(),
  full_history: z.boolean(),
  full_recommendations: z.boolean(),
  unlimited_bookmarks: z.boolean(),
});

export const DEFAULT_ENTITLEMENTS = {
  free: {
    calendar_sync: false,
    full_history: false,
    full_recommendations: false,
    unlimited_bookmarks: false,
  },
  pro: {
    calendar_sync: true,
    full_history: true,
    full_recommendations: true,
    unlimited_bookmarks: true,
  },
  team: {
    calendar_sync: true,
    full_history: true,
    full_recommendations: true,
    unlimited_bookmarks: true,
  },
} as const;

export const normalizedSubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: billingProviderSchema.default('paddle'),
  tier: subscriptionTierSchema,
  status: subscriptionStatusSchema,
  planType: z.enum(['monthly', 'annual']).nullable().optional(),
  entitlements: subscriptionEntitlementsSchema,
  trialEndsAt: z.string().nullable().optional(),
  currentPeriodEnd: z.string().nullable().optional(),
  providerCustomerId: z.string().nullable().optional(),
  providerProductId: z.string().nullable().optional(),
});

export const revenueCatReconcileSchema = z.object({
  customerId: z.string().min(1),
  entitlementId: z.string().min(1),
  productId: z.string().min(1),
  tier: subscriptionTierSchema,
  status: subscriptionStatusSchema,
  planType: z.enum(['monthly', 'annual']).nullable().optional(),
  currentPeriodStart: z.string().nullable().optional(),
  currentPeriodEnd: z.string().nullable().optional(),
  trialStartedAt: z.string().nullable().optional(),
  trialEndsAt: z.string().nullable().optional(),
  pastDueAt: z.string().nullable().optional(),
  entitlements: subscriptionEntitlementsSchema,
});

export const subscriptionOfferingSchema = z.object({
  identifier: z.string(),
  productIdentifier: z.string(),
  title: z.string(),
  description: z.string(),
  tier: subscriptionTierSchema,
  planType: z.enum(['monthly', 'annual']),
});

export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type BillingProvider = z.infer<typeof billingProviderSchema>;
export type SubscriptionEntitlements = z.infer<typeof subscriptionEntitlementsSchema>;
export type NormalizedSubscription = z.infer<typeof normalizedSubscriptionSchema>;
export type RevenueCatReconcileInput = z.infer<typeof revenueCatReconcileSchema>;
export type SubscriptionOffering = z.infer<typeof subscriptionOfferingSchema>;
