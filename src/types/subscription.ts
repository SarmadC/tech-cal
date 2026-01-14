import type { Database } from './supabase';

// Type aliases for cleaner usage
export type SubscriptionTier = Database['public']['Enums']['subscription_tier'];
export type SubscriptionStatus = Database['public']['Enums']['subscription_status'];
export type PlanType = Database['public']['Enums']['plan_type'];

// Subscription row type
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

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

// Feature names for gate checks
export type FeatureName =
  | 'calendar_sync'
  | 'full_history'
  | 'full_recommendations'
  | 'unlimited_bookmarks'
  | 'detailed_insights'
  | 'career_analytics';

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
  | 'subscription.resumed';

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
  if (!activeStatuses.includes(subscription.status)) return false;

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

// Helper to check if subscription is in grace period
export function isInGracePeriod(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'past_due') return false;

  // Grace period is 3 days after past_due status
  // This would need to be tracked separately or calculated from status change timestamp
  return true; // Simplified for now
}
