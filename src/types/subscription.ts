import type { Database } from './supabase';

// Type aliases for cleaner usage
export type SubscriptionTier = Database['public']['Enums']['subscription_tier'];
export type SubscriptionStatus = Database['public']['Enums']['subscription_status'];
export type PlanType = Database['public']['Enums']['plan_type'];
export type BillingProvider = 'manual' | 'paddle' | 'revenuecat';

// Subscription row type
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export interface RevenueCatReconcileInput {
  customerId: string;
  entitlementId: string;
  productId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  planType?: PlanType | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  pastDueAt?: string | null;
  entitlements?: Partial<SubscriptionEntitlements> | null;
}

export interface NormalizedMobileSubscription {
  id: string;
  userId: string;
  provider: BillingProvider;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  planType: PlanType | null;
  entitlements: SubscriptionEntitlements;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  providerCustomerId: string | null;
  providerProductId: string | null;
}

export interface SubscriptionOffering {
  identifier: string;
  productIdentifier: string;
  title: string;
  description: string;
  tier: SubscriptionTier;
  planType: PlanType;
}

// Entitlements structure (matches the jsonb column default)
export interface SubscriptionEntitlements {
  calendar_sync: boolean;
  full_history: boolean;
  full_recommendations: boolean;
  unlimited_bookmarks: boolean;
}

// Default entitlements by tier
export const DEFAULT_ENTITLEMENTS: Record<SubscriptionTier, SubscriptionEntitlements> = {
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
};

// Feature names for gate checks (matches SubscriptionEntitlements keys)
export type FeatureName = keyof SubscriptionEntitlements;

// Subscription context state
export interface SubscriptionState {
  subscription: Subscription | null;
  isLoading: boolean;
  error: Error | null;
  isPro: boolean;
  isTrialing: boolean;
  trialDaysLeft: number | null;
}

// Subscription limits for free tier
export const FREE_TIER_LIMITS = {
  maxBookmarks: 5,
  historyDays: 30,
  maxRecommendations: 3,
} as const;

// Paddle webhook event types
export type PaddleWebhookEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.past_due'
  | 'subscription.activated'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'subscription.trialing';

// Paddle subscription status mapping
// Note: Paddle 'paused' status maps to 'active' because paused users retain access
// until they cancel or their billing period ends
export const PADDLE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  paused: 'active', // Paused users keep access until resume/cancel
};

// Helper to check if user has access to a feature
export function hasFeatureAccess(
  subscription: Subscription | null,
  feature: keyof SubscriptionEntitlements
): boolean {
  if (!subscription) return false;

  // Check if actively subscribed or trialing
  const activeStatuses: SubscriptionStatus[] = ['active', 'trialing'];
  const isActive = activeStatuses.includes(subscription.status);
  const isPastDueWithGrace = subscription.status === 'past_due' && isInGracePeriod(subscription);

  // Allow 'canceled' status if within billing period (graceful cancellation)
  let isCanceledButActive = false;
  if (subscription.status === 'canceled' && subscription.current_period_end) {
    if (new Date(subscription.current_period_end).getTime() > Date.now()) {
        isCanceledButActive = true;
    }
  }

  if (!isActive && !isCanceledButActive && !isPastDueWithGrace) return false;

  // Trialing users always have full access to all features
  // This is a safety net in case entitlements weren't set correctly in the DB
  if (subscription.status === 'trialing') {
    return true;
  }

  // Check entitlements - safely cast from Json
  const entitlements = subscription.entitlements as unknown as SubscriptionEntitlements;
  return entitlements?.[feature] ?? false;
}

// Helper to calculate trial days left
export function getTrialDaysLeft(subscription: Subscription | null): number | null {
  if (!subscription || subscription.status !== 'trialing') return null;
  if (!subscription.trial_ends_at) return null;

  const trialEnd = new Date(subscription.trial_ends_at);
  const now = new Date();
  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

// Grace period duration in days
export const GRACE_PERIOD_DAYS = 7;

// Helper to check if subscription is in grace period (7 days for past_due)
export function isInGracePeriod(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'past_due') return false;

  // Calculate days since status changed to past_due (use past_due_at if present)
  const pastDueAtValue = subscription.past_due_at || subscription.updated_at;
  const pastDueAt = new Date(pastDueAtValue);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - pastDueAt.getTime()) / (1000 * 60 * 60 * 24));

  return daysSinceUpdate < GRACE_PERIOD_DAYS;
}

// Helper to get grace period end date for past_due subscriptions
export function getGracePeriodEndsAt(subscription: Subscription | null): Date | null {
  if (!subscription || subscription.status !== 'past_due') return null;

  const pastDueAtValue = subscription.past_due_at || subscription.updated_at;
  const pastDueAt = new Date(pastDueAtValue);
  const gracePeriodEnd = new Date(pastDueAt);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  return gracePeriodEnd;
}

// Helper to get days remaining in grace period
export function getGracePeriodDaysLeft(subscription: Subscription | null): number | null {
  if (!subscription || subscription.status !== 'past_due') return null;

  const gracePeriodEnd = getGracePeriodEndsAt(subscription);
  if (!gracePeriodEnd) return null;

  const now = new Date();
  const diffMs = gracePeriodEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

// Helper to get the date when access ends (for canceled/trialing users)
export function getAccessEndsAt(subscription: Subscription | null): Date | null {
  if (!subscription) return null;

  // For trialing users, access ends when trial ends
  if (subscription.status === 'trialing' && subscription.trial_ends_at) {
    return new Date(subscription.trial_ends_at);
  }

  // For canceled users with remaining period, access ends at period end
  if (subscription.status === 'canceled' && subscription.current_period_end) {
    return new Date(subscription.current_period_end);
  }

  // For past_due users, access ends at grace period end
  if (subscription.status === 'past_due') {
    return getGracePeriodEndsAt(subscription);
  }

  return null;
}

// Helper to check if trial has expired (was trialing, now free or canceled)
export function isTrialExpired(subscription: Subscription | null): boolean {
  if (!subscription) return false;

  // Check if user had a trial that has ended
  if (!subscription.trial_ends_at) return false;

  const trialEnd = new Date(subscription.trial_ends_at);
  const now = new Date();

  const isCanceledButActive = subscription.status === 'canceled' &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() > now.getTime();

  const isPastDueWithGrace = subscription.status === 'past_due' && isInGracePeriod(subscription);

  // Trial is expired if:
  // 1. Trial end date is in the past AND
  // 2. User is not currently active (trialing, active, canceled-but-active, or in grace)
  const hasTrialEnded = trialEnd.getTime() < now.getTime();
  const isNotActive = subscription.status !== 'trialing' &&
                      subscription.status !== 'active' &&
                      !isCanceledButActive &&
                      !isPastDueWithGrace;

  return hasTrialEnded && isNotActive;
}
