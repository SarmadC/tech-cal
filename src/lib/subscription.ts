/**
 * Server-side subscription utilities
 *
 * Provides helpers for checking subscription status in API routes.
 * Uses the same entitlement logic as the client-side hook.
 *
 * @server-only
 */

import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { Subscription, SubscriptionEntitlements } from '@/types/subscription';
import { FREE_TIER_LIMITS } from '@/types/subscription';

// Create service role client for admin operations
function getServiceClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Get subscription for the currently authenticated user.
 * Uses the user's session from cookies.
 */
export async function getSubscription(): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[subscription] Failed to fetch subscription:', error.message);
    return null;
  }

  return data;
}

/**
 * Get subscription for a specific user by ID.
 * Uses service role - only use in trusted server contexts.
 */
export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[subscription] Failed to fetch subscription for user:', userId, error.message);
    return null;
  }

  return data;
}

/**
 * Check if user has Pro access (active or trialing).
 */
export async function isPro(userIdOrSubscription?: string | Subscription | null): Promise<boolean> {
  let subscription: Subscription | null;

  if (typeof userIdOrSubscription === 'string') {
    subscription = await getSubscriptionByUserId(userIdOrSubscription);
  } else if (userIdOrSubscription && typeof userIdOrSubscription === 'object') {
    subscription = userIdOrSubscription;
  } else {
    subscription = await getSubscription();
  }

  if (!subscription) return false;

  const isCanceledButActive = !!(subscription.status === 'canceled' && 
    subscription.current_period_end && 
    new Date(subscription.current_period_end).getTime() > Date.now());

  return (
    (subscription.status === 'active' && subscription.tier !== 'free') || 
    subscription.status === 'trialing' ||
    subscription.status === 'past_due' ||
    (isCanceledButActive && subscription.tier !== 'free')
  );
}

/**
 * Check if user is currently on trial.
 */
export async function isTrialing(userIdOrSubscription?: string | Subscription | null): Promise<boolean> {
  let subscription: Subscription | null;

  if (typeof userIdOrSubscription === 'string') {
    subscription = await getSubscriptionByUserId(userIdOrSubscription);
  } else if (userIdOrSubscription && typeof userIdOrSubscription === 'object') {
    subscription = userIdOrSubscription;
  } else {
    subscription = await getSubscription();
  }

  return subscription?.status === 'trialing';
}

/**
 * Check if user can access a specific feature.
 */
export async function canAccessFeature(
  feature: keyof SubscriptionEntitlements,
  userIdOrSubscription?: string | Subscription | null
): Promise<boolean> {
  let subscription: Subscription | null;

  if (typeof userIdOrSubscription === 'string') {
    subscription = await getSubscriptionByUserId(userIdOrSubscription);
  } else if (userIdOrSubscription && typeof userIdOrSubscription === 'object') {
    subscription = userIdOrSubscription;
  } else {
    subscription = await getSubscription();
  }

  if (!subscription) return false;

  // Check if actively subscribed or trialing or past_due (grace period)
  const isCanceledButActive = subscription.status === 'canceled' && 
    subscription.current_period_end && 
    new Date(subscription.current_period_end).getTime() > Date.now();

  if (subscription.status !== 'active' && 
      subscription.status !== 'trialing' && 
      subscription.status !== 'past_due' &&
      !isCanceledButActive
  ) {
    return false;
  }

  // Trialing users always have full access
  if (subscription.status === 'trialing') {
    return true;
  }

  const entitlements = subscription.entitlements as unknown as SubscriptionEntitlements;
  return entitlements?.[feature] ?? false;
}

/**
 * Require Pro access for an API route.
 * Returns the subscription if authorized, throws if not.
 *
 * @example
 * ```ts
 * export async function GET() {
 *   const subscription = await requirePro();
 *   // Proceed with Pro-only logic
 * }
 * ```
 */
export async function requirePro(): Promise<Subscription> {
  const subscription = await getSubscription();

  if (!subscription) {
    // Check if user is authenticated to distinguish between 401 and 403
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SubscriptionError('Authentication required', 401);
    }
    
    // User is authenticated but has no subscription row -> Free tier
    throw new SubscriptionError('Upgrade to Pro required', 403);
  }

  const hasAccess = await isPro(subscription);
  if (!hasAccess) {
    throw new SubscriptionError('Upgrade to Pro required', 403);
  }

  return subscription;
}

/**
 * Require access to a specific feature for an API route.
 * Returns the subscription if authorized, throws if not.
 *
 * @example
 * ```ts
 * export async function GET() {
 *   const subscription = await requireFeature('full_history');
 *   // Proceed with feature-specific logic
 * }
 * ```
 */
export async function requireFeature(feature: keyof SubscriptionEntitlements): Promise<Subscription> {
  const subscription = await getSubscription();

  if (!subscription) {
    // Check if user is authenticated to distinguish between 401 and 403
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SubscriptionError('Authentication required', 401);
    }
    
     // User is authenticated but has no subscription row -> Free tier
    throw new SubscriptionError(`Upgrade to Pro to access ${feature}`, 403);
  }

  const hasAccess = await canAccessFeature(feature, subscription);
  if (!hasAccess) {
    throw new SubscriptionError(`Upgrade to Pro to access ${feature}`, 403);
  }

  return subscription;
}

/**
 * Get feature limits for a subscription.
 */
export function getFeatureLimits(subscription: Subscription | null): {
  bookmarkLimit: number;
  historyDays: number;
  maxRecommendations: number;
} {
  const isCanceledButActive = subscription?.status === 'canceled' && 
    subscription?.current_period_end && 
    new Date(subscription.current_period_end).getTime() > Date.now();

  const hasPro =
    subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'past_due' || isCanceledButActive) &&
    subscription.tier !== 'free';

  return {
    bookmarkLimit: hasPro ? Infinity : FREE_TIER_LIMITS.maxBookmarks,
    historyDays: hasPro ? Infinity : FREE_TIER_LIMITS.historyDays,
    maxRecommendations: hasPro ? Infinity : FREE_TIER_LIMITS.maxRecommendations,
  };
}

/**
 * Custom error class for subscription-related errors.
 */
export class SubscriptionError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = 'SubscriptionError';
    this.statusCode = statusCode;
  }
}

/**
 * Higher-order function to wrap API route handlers with subscription checks.
 *
 * @example
 * ```ts
 * export const GET = withSubscription(
 *   async (request, subscription) => {
 *     // Handler has access to validated subscription
 *     return NextResponse.json({ tier: subscription.tier });
 *   },
 *   { requirePro: true }
 * );
 * ```
 */
export function withSubscription<T>(
  handler: (request: Request, subscription: Subscription) => Promise<T>,
  options: { requirePro?: boolean; requireFeature?: keyof SubscriptionEntitlements } = {}
): (request: Request) => Promise<T | Response> {
  return async (request: Request) => {
    try {
      let subscription: Subscription;

      if (options.requireFeature) {
        subscription = await requireFeature(options.requireFeature);
      } else if (options.requirePro) {
        subscription = await requirePro();
      } else {
        const sub = await getSubscription();
        if (!sub) {
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        subscription = sub;
      }

      return handler(request, subscription);
    } catch (error) {
      if (error instanceof SubscriptionError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }
  };
}

/**
 * Calculate the date cutoff for history access.
 * Free tier: 30 days, Pro: null (no limit)
 */
export function getHistoryCutoffDate(subscription: Subscription | null): Date | null {
  const limits = getFeatureLimits(subscription);

  if (limits.historyDays === Infinity) {
    return null; // No cutoff for Pro users
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - limits.historyDays);
  return cutoff;
}
