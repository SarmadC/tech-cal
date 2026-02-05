/**
 * SubscriptionContext
 *
 * Provides subscription state globally throughout the app.
 * Handles caching, refresh, and provides helpers for feature gating.
 */

'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
} from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import type { Subscription, SubscriptionEntitlements } from '@/types/subscription';
import { TrialExpiredGuard } from '@/components/subscription/TrialExpiredGuard';

interface SubscriptionContextType {
  // Subscription state
  subscription: Subscription | null;
  isLoading: boolean;
  error: Error | null;

  // Computed booleans
  isPro: boolean;
  isTrialing: boolean;
  isFree: boolean;
  isTrialExpired: boolean;
  isCanceledButActive: boolean;
  hasUsedTrial: boolean;

  // Trial info
  trialDaysLeft: number | null;

  // Billing dates
  accessEndsAt: Date | null;
  daysUntilRenewal: number | null;
  gracePeriodDaysLeft: number | null;

  // Feature access
  canAccessFeature: (feature: keyof SubscriptionEntitlements) => boolean;

  // Feature limits
  bookmarkLimit: number;
  historyDays: number;
  maxRecommendations: number;

  // Actions
  refreshSubscription: () => Promise<void>;
  startTrial: () => Promise<void>;
  openUpgrade: (plan?: 'monthly' | 'annual') => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const {
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
    isTrialExpired,
    isCanceledButActive,
    hasUsedTrial,
  } = useSubscription();

  const value = useMemo<SubscriptionContextType>(
    () => ({
      subscription,
      isLoading,
      error,
      isPro,
      isTrialing,
      isFree: !isPro && !isTrialing,
      isTrialExpired,
      isCanceledButActive,
      hasUsedTrial,
      trialDaysLeft,
      accessEndsAt,
      daysUntilRenewal,
      gracePeriodDaysLeft,
      canAccessFeature,
      bookmarkLimit,
      historyDays,
      maxRecommendations,
      refreshSubscription,
      startTrial,
      openUpgrade,
    }),
    [
      subscription,
      isLoading,
      error,
      isPro,
      isTrialing,
      isTrialExpired,
      isCanceledButActive,
      hasUsedTrial,
      trialDaysLeft,
      accessEndsAt,
      daysUntilRenewal,
      gracePeriodDaysLeft,
      canAccessFeature,
      bookmarkLimit,
      historyDays,
      maxRecommendations,
      refreshSubscription,
      startTrial,
      openUpgrade,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      <TrialExpiredGuard>
        {children}
      </TrialExpiredGuard>
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access subscription context.
 * Must be used within a SubscriptionProvider.
 */
export function useSubscriptionContext(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}

/**
 * Hook to check if user can access a premium feature.
 * Returns true if user has access, false otherwise.
 */
export function useCanAccessFeature(feature: keyof SubscriptionEntitlements): boolean {
  const { canAccessFeature } = useSubscriptionContext();
  return canAccessFeature(feature);
}

/**
 * Hook to get trial days left.
 * Returns null if not on trial.
 */
export function useTrialDaysLeft(): number | null {
  const { trialDaysLeft } = useSubscriptionContext();
  return trialDaysLeft;
}

/**
 * Hook to check if user is on pro tier (active or trialing).
 */
export function useIsPro(): boolean {
  const { isPro, isTrialing } = useSubscriptionContext();
  return isPro || isTrialing;
}
