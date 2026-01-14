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
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
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
        .single();

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

    // Dynamically import Paddle to avoid SSR issues
    const { openProMonthlyCheckout } = await import('@/lib/paddle');
    await openProMonthlyCheckout(user.id, user.email);
  }, [user?.id, user?.email]);

  // Open upgrade checkout
  const openUpgrade = useCallback(async (plan: 'monthly' | 'annual' = 'monthly') => {
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    const paddle = await import('@/lib/paddle');
    if (plan === 'annual') {
      await paddle.openProAnnualCheckout(user.id, user.email);
    } else {
      await paddle.openProMonthlyCheckout(user.id, user.email);
    }
  }, [user?.id, user?.email]);

  // Load subscription on mount and when user changes
  useEffect(() => {
    isMounted.current = true;
    loadSubscription();

    return () => {
      isMounted.current = false;
      // Cancel any in-flight request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadSubscription]);

  // Computed values
  const isPro = subscription?.status === 'active' && subscription?.tier === 'pro';
  const isTrialing = subscription?.status === 'trialing';
  const trialDaysLeft = getTrialDaysLeft(subscription);

  const canAccessFeature = useCallback(
    (feature: keyof SubscriptionEntitlements): boolean => {
      return hasFeatureAccess(subscription, feature);
    },
    [subscription]
  );

  // Feature limits based on tier
  const bookmarkLimit = isPro || isTrialing
    ? Infinity
    : FREE_TIER_LIMITS.maxBookmarks;

  const historyDays = isPro || isTrialing
    ? Infinity
    : FREE_TIER_LIMITS.historyDays;

  const maxRecommendations = isPro || isTrialing
    ? Infinity
    : FREE_TIER_LIMITS.maxRecommendations;

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
  return subscription.status === 'active' || subscription.status === 'trialing';
}
