'use client';

import { type ReactNode, useState } from 'react';
import { useSubscriptionContext } from '@/contexts';
import type { SubscriptionEntitlements } from '@/types/subscription';
import UpgradeModal from '@/components/ui/UpgradeModal';

type FeatureGateFeature = keyof SubscriptionEntitlements | 'pro';

interface FeatureGateProps {
  /**
   * The feature to check access for.
   * Use 'pro' to check for general Pro access.
   */
  feature: FeatureGateFeature;

  /**
   * Content to show when user has access to the feature.
   */
  children: ReactNode;

  /**
   * Content to show when user doesn't have access.
   * If not provided, a default blurred placeholder is shown.
   */
  fallback?: ReactNode;

  /**
   * Custom feature name for the upgrade modal.
   * Defaults to a formatted version of the feature key.
   */
  featureLabel?: string;

  /**
   * Whether to show the upgrade modal when fallback is clicked.
   * @default true
   */
  showUpgradeOnClick?: boolean;

  /**
   * If true, wraps the fallback in a clickable container.
   * @default true
   */
  clickable?: boolean;

  /**
   * Custom class name for the wrapper.
   */
  className?: string;

  /**
   * Callback when upgrade is initiated.
   */
  onUpgradeClick?: () => void;
}

/**
 * FeatureGate - Conditionally renders content based on subscription access.
 *
 * Wraps children and shows them only if user has access to the specified feature.
 * Shows a fallback (default: blurred card) with upgrade prompt otherwise.
 *
 * @example
 * ```tsx
 * <FeatureGate feature="full_history" featureLabel="Full History">
 *   <HistoryTimeline />
 * </FeatureGate>
 *
 * <FeatureGate feature="pro" fallback={<BasicInsights />}>
 *   <DetailedInsights />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  featureLabel,
  showUpgradeOnClick = true,
  clickable = true,
  className,
  onUpgradeClick,
}: FeatureGateProps) {
  const { isPro, isTrialing, canAccessFeature, startTrial, openUpgrade, isLoading } =
    useSubscriptionContext();
  const [showModal, setShowModal] = useState(false);

  // Determine if user has access
  const hasAccess =
    feature === 'pro'
      ? isPro || isTrialing
      : canAccessFeature(feature as keyof SubscriptionEntitlements);

  // Show loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div className="animate-pulse rounded-lg bg-muted/50 h-32" />
      </div>
    );
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Format feature label for display
  const displayLabel =
    featureLabel ||
    (feature === 'pro'
      ? 'Pro features'
      : feature
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()));

  // Handle click on fallback
  const handleClick = () => {
    if (!showUpgradeOnClick) return;
    onUpgradeClick?.();
    setShowModal(true);
  };

  // Determine modal variant
  const modalVariant = isPro || isTrialing ? 'upgradePrompt' : 'trialStart';

  // Default fallback is a blurred placeholder
  const defaultFallback = (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
      {/* Blurred overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/60 z-10" />

      {/* Locked icon and text */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path
              fillRule="evenodd"
              d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <span className="text-sm font-medium text-foreground">
          Unlock {displayLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          Upgrade to Pro for full access
        </span>
      </div>

      {/* Placeholder content for blur effect */}
      <div className="opacity-30" aria-hidden="true">
        <div className="space-y-3">
          <div className="h-5 w-1/2 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-20 w-full rounded bg-muted" />
        </div>
      </div>
    </div>
  );

  const fallbackContent = fallback ?? defaultFallback;

  return (
    <>
      {clickable ? (
        <div
          className={`cursor-pointer transition-transform hover:scale-[1.01] ${className ?? ''}`}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          aria-label={`Unlock ${displayLabel}`}
        >
          {fallbackContent}
        </div>
      ) : (
        <div className={className}>{fallbackContent}</div>
      )}

      <UpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        variant={modalVariant}
        featureName={displayLabel}
        onStartTrial={async () => {
          await startTrial();
          setShowModal(false);
        }}
        onUpgrade={async () => {
          await openUpgrade();
          setShowModal(false);
        }}
      />
    </>
  );
}

/**
 * Blurred card wrapper for premium content.
 * Shows a preview of the content with blur overlay and upgrade CTA.
 */
export function BlurredPremiumCard({
  children,
  feature,
  featureLabel,
  className,
}: {
  children: ReactNode;
  feature: FeatureGateFeature;
  featureLabel?: string;
  className?: string;
}) {
  const { startTrial, openUpgrade, isPro, isTrialing } = useSubscriptionContext();
  const [showModal, setShowModal] = useState(false);

  const displayLabel =
    featureLabel ||
    (feature === 'pro'
      ? 'Pro features'
      : String(feature)
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()));

  const modalVariant = isPro || isTrialing ? 'upgradePrompt' : 'trialStart';

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-xl cursor-pointer transition-transform hover:scale-[1.01] ${className ?? ''}`}
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowModal(true);
          }
        }}
        aria-label={`Unlock ${displayLabel}`}
      >
        {/* Blurred content */}
        <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
          {children}
        </div>

        {/* Overlay with CTA */}
        <div className="absolute inset-0 bg-background/40 flex flex-col items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-foreground">
            Unlock {displayLabel}
          </span>
        </div>
      </div>

      <UpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        variant={modalVariant}
        featureName={displayLabel}
        onStartTrial={async () => {
          await startTrial();
          setShowModal(false);
        }}
        onUpgrade={async () => {
          await openUpgrade();
          setShowModal(false);
        }}
      />
    </>
  );
}

export default FeatureGate;
