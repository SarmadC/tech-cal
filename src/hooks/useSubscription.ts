/**
 * useSubscription Hook
 *
 * Manages subscription state with caching and automatic refresh.
 * Uses a "fail sticky" strategy to avoid downgrading paying users on transient errors.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import {
  type Subscription,
  type SubscriptionEntitlements,
  type FeatureName,
  getTrialDaysLeft,
  hasFeatureAccess,
  FREE_TIER_LIMITS,
  isInGracePeriod,
  getGracePeriodDaysLeft,
  getAccessEndsAt,
  isTrialExpired as checkTrialExpired,
} from '@/types/subscription';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

interface SubscriptionCache {
  subscription: Subscription | null;
  cachedAt: number;
}

// In-memory cache per user
const subscriptionCache = new Map<string, SubscriptionCache>();

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  isLoading: boolean;
  error: Error | null;
  isPro: boolean;
  isTrialing: boolean;
  trialDaysLeft: number | null;
  canAccessFeature: (feature: keyof SubscriptionEntitlements) => boolean;
  bookmarkLimit: number;
  historyDays: number;
  maxRecommendations: number;
  refreshSubscription: () => Promise<void>;
  startTrial: () => Promise<void>;
  openUpgrade: (plan?: 'monthly' | 'annual') => Promise<void>;
  // New computed values for billing UI
  accessEndsAt: Date | null;
  daysUntilRenewal: number | null;
  gracePeriodDaysLeft: number | null;
  isTrialExpired: boolean;
  isCanceledButActive: boolean;
  hasUsedTrial: boolean;
}

import { useCheckout } from '@/contexts/CheckoutContext';

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const { openCheckout, setCheckoutUser } = useCheckout();
  const { supabase, isReady } = useSupabaseSafe();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Reference to track if component is mounted
  const isMounted = useRef(true);
  // AbortController ref for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get cached subscription if available and not expired
  const getCachedSubscription = useCallback((userId: string): Subscription | null => {
    const cached = subscriptionCache.get(userId);
    if (!cached) return null;

    const isExpired = Date.now() - cached.cachedAt > CACHE_TTL;
    if (isExpired) {
      subscriptionCache.delete(userId);
      return null;
    }

    return cached.subscription;
  }, []);

  // Cache subscription
  const cacheSubscription = useCallback((userId: string, sub: Subscription | null) => {
    subscriptionCache.set(userId, {
      subscription: sub,
      cachedAt: Date.now(),
    });
  }, []);

  // Invalidate cache for user
  const invalidateCache = useCallback((userId: string) => {
    subscriptionCache.delete(userId);
  }, []);

  // Load subscription from database
  const loadSubscription = useCallback(async (forceRefresh = false) => {
    if (!user?.id || !supabase || !isReady) {
      if (isMounted.current) {
        setIsLoading(false);
      }
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedSubscription(user.id);
      if (cached) {
        if (isMounted.current) {
          setSubscription(cached);
          setIsLoading(false);
        }
        return;
      }
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (isMounted.current) {
        setIsLoading(true);
      }

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .abortSignal(abortControllerRef.current.signal)
        .maybeSingle();

      // Don't update state if component unmounted or request was aborted
      if (!isMounted.current) return;

      if (fetchError) {
        // On error, try to use cached value (fail sticky)
        const cached = getCachedSubscription(user.id);
        if (cached) {
          console.warn('[useSubscription] Fetch failed, using cached value');
          setSubscription(cached);
          setError(new Error(fetchError.message));
        } else {
          // No cache, treat as free tier
          console.error('[useSubscription] Fetch failed, no cache available:', fetchError);
          setError(new Error(fetchError.message));
          setSubscription(null);
        }
      } else {
        setSubscription(data);
        cacheSubscription(user.id, data);
        setError(null);
      }
    } catch (err) {
      // Ignore abort errors (expected when cancelling requests)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('[useSubscription] Error loading subscription:', err);

      if (!isMounted.current) return;

      // Fail sticky - use cached value if available
      const cached = getCachedSubscription(user.id);
      if (cached) {
        setSubscription(cached);
      }
      setError(err instanceof Error ? err : new Error('Failed to load subscription'));
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [user?.id, supabase, isReady, getCachedSubscription, cacheSubscription]);

  // Refresh subscription (force refresh from database)
  const refreshSubscription = useCallback(async () => {
    if (user?.id) {
      invalidateCache(user.id);
    }
    await loadSubscription(true);
  }, [user?.id, invalidateCache, loadSubscription]);

  // Start trial - opens Paddle checkout with trial
  const startTrial = useCallback(async () => {
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    // Prevent users who've already used their trial from starting another one
    if (subscription?.trial_started_at) {
      throw new Error('You have already used your free trial. Please upgrade to Pro to continue.');
    }

    // Dynamically import Paddle to avoid SSR issues - Still needed for initialization checks if any
    // const { openProMonthlyCheckout } = await import('@/lib/paddle');
    // await openProMonthlyCheckout(user.id, user.email);
    
    // Set user info for checkout context
    setCheckoutUser(user.id, user.email);
    openCheckout('monthly'); // Standard trial start is monthly
  }, [user?.id, user?.email, openCheckout, setCheckoutUser, subscription?.trial_started_at]);

  // Open upgrade checkout
  const openUpgrade = useCallback(async (plan: 'monthly' | 'annual' = 'monthly') => {
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    // const paddle = await import('@/lib/paddle');
    setCheckoutUser(user.id, user.email);
    if (plan === 'annual') {
      // await paddle.openProAnnualCheckout(user.id, user.email);
      openCheckout('annual');
    } else {
      // await paddle.openProMonthlyCheckout(user.id, user.email);
      openCheckout('monthly');
    }
  }, [user?.id, user?.email, openCheckout, setCheckoutUser]);

  // Store loadSubscription in a ref to avoid dependency issues
  const loadSubscriptionRef = useRef(loadSubscription);
  loadSubscriptionRef.current = loadSubscription;

  // Load subscription on mount and when user changes
  // Using primitive dependencies to avoid infinite re-renders
  useEffect(() => {
    isMounted.current = true;
    loadSubscriptionRef.current();

    return () => {
      isMounted.current = false;
      // Cancel any in-flight request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isReady]);

  // Computed values
  const isCanceledButActive = !!(subscription?.status === 'canceled' &&
   subscription?.current_period_end &&
   new Date(subscription.current_period_end).getTime() > Date.now());

  const isPastDueWithGrace = !!(subscription?.status === 'past_due' && isInGracePeriod(subscription));

  const isPro = !!((subscription?.status === 'active' || isPastDueWithGrace || isCanceledButActive) && subscription?.tier !== 'free');
  const isTrialing = subscription?.status === 'trialing';
  const trialDaysLeft = getTrialDaysLeft(subscription);

  const canAccessFeature = useCallback(
    (feature: keyof SubscriptionEntitlements): boolean => {
      return hasFeatureAccess(subscription, feature);
    },
    [subscription]
  );

  // Feature limits based on tier
  const bookmarkLimit = isPro || isTrialing || isPastDueWithGrace || isCanceledButActive
    ? Infinity
    : FREE_TIER_LIMITS.maxBookmarks;

  const historyDays = isPro || isTrialing || isPastDueWithGrace || isCanceledButActive
    ? Infinity
    : FREE_TIER_LIMITS.historyDays;

  const maxRecommendations = isPro || isTrialing || isPastDueWithGrace || isCanceledButActive
    ? Infinity
    : FREE_TIER_LIMITS.maxRecommendations;

  // New computed values for billing UI
  const accessEndsAt = getAccessEndsAt(subscription);
  const gracePeriodDaysLeft = getGracePeriodDaysLeft(subscription);
  const trialExpired = checkTrialExpired(subscription);
  
  // Check if user has already used a free trial (cannot trial again)
  const hasUsedTrial = !!(subscription?.trial_started_at);

  // Calculate days until renewal for active subscribers
  const daysUntilRenewal = (() => {
    if (!subscription || subscription.status !== 'active' || !subscription.current_period_end) {
      return null;
    }
    const renewalDate = new Date(subscription.current_period_end);
    const now = new Date();
    const diffMs = renewalDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  })();

  return {
    subscription,
    isLoading,
    error,
    isPro,
    isTrialing,
    trialDaysLeft,
    canAccessFeature,
    bookmarkLimit,
    historyDays,
    maxRecommendations,
    refreshSubscription,
    startTrial,
    openUpgrade,
    // New computed values
    accessEndsAt,
    daysUntilRenewal,
    gracePeriodDaysLeft,
    isTrialExpired: trialExpired,
    isCanceledButActive,
    hasUsedTrial,
  };
}

/**
 * Invalidate subscription cache for a user.
 * Call this from webhook handlers or after subscription changes.
 */
export function invalidateSubscriptionCache(userId: string): void {
  subscriptionCache.delete(userId);
}

/**
 * Clear all subscription cache entries.
 * Call this on logout to prevent memory leaks.
 */
export function clearAllSubscriptionCache(): void {
  subscriptionCache.clear();
}

/**
 * Check if subscription is in active state (active or trialing).
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  
  const isCanceledButActive = subscription.status === 'canceled' &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() > Date.now();

  const isPastDueWithGrace = subscription.status === 'past_due' && isInGracePeriod(subscription);

  return subscription.status === 'active' ||
    subscription.status === 'trialing' ||
    isPastDueWithGrace ||
    !!isCanceledButActive;
}
