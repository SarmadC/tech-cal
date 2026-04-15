'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle, WarningCircle, ArrowClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import posthog from 'posthog-js';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';

// Maximum time to wait for subscription to become active (30 seconds)
const MAX_WAIT_TIME_MS = 30000;
// Polling interval (2 seconds)
const POLL_INTERVAL_MS = 2000;

type VerificationStatus = 'checking' | 'success' | 'pending' | 'error';

export default function BillingSuccessPage() {
  const { subscription, isLoading, refreshSubscription } = useSubscription();
  const [status, setStatus] = useState<VerificationStatus>('checking');
  const [_elapsedTime, setElapsedTime] = useState(0);
  const hasTrackedPageView = useRef(false);

  const isSubscriptionActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  // Track billing success page view (only once)
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      posthog.capture('billing_success_viewed', {
        initial_subscription_status: subscription?.status || 'unknown',
      });
    }
  }, [subscription?.status]);

  // Poll for subscription status
  const checkSubscription = useCallback(async () => {
    await refreshSubscription();
  }, [refreshSubscription]);

  useEffect(() => {
    // If already active, we're done
    if (isSubscriptionActive && !isLoading) {
      setStatus('success');
      return;
    }

    // If still loading initially, wait
    if (isLoading) return;

    // Start polling
    const startTime = Date.now();
    const pollInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);

      if (elapsed >= MAX_WAIT_TIME_MS) {
        clearInterval(pollInterval);
        setStatus('pending');
        return;
      }

      await checkSubscription();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [isSubscriptionActive, isLoading, checkSubscription]);

  // Update status when subscription changes
  useEffect(() => {
    if (isSubscriptionActive && !isLoading) {
      setStatus('success');
    }
  }, [isSubscriptionActive, isLoading]);

  const handleRetry = async () => {
    setStatus('checking');
    setElapsedTime(0);
    await checkSubscription();

    // If still not active after refresh, set to pending
    if (!isSubscriptionActive) {
      setStatus('pending');
    }
  };

  // Loading/checking state
  if (status === 'checking' || isLoading) {
    return (
      <main className="responsive-page-shell min-h-[100dvh] bg-background-main px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-background-secondary p-6 shadow-xl sm:p-10">
          <div className="flex flex-col items-center justify-center py-8">
            <BrandLoadingLogo className="h-10 w-10 text-amber-600" inline size={40} />
            <p className="mt-4 text-lg font-medium text-foreground-primary">
              Confirming your subscription...
            </p>
            <p className="mt-2 text-sm text-foreground-secondary">
              This may take a few moments
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Pending state (subscription not yet active after timeout)
  if (status === 'pending') {
    return (
      <main className="responsive-page-shell min-h-[100dvh] bg-background-main px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-background-secondary p-6 shadow-xl sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100">
              <WarningCircle weight="fill" size={28} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-foreground-primary">
                Payment received
              </h1>
              <p className="text-sm text-foreground-secondary">
                Your payment was successful! Your subscription is being activated and should be ready shortly.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              If your subscription is not active within a few minutes, use our{' '}
              <Link href="/contact" className="font-medium underline">
                contact form
              </Link>
              {' '}and include your order details.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={handleRetry} variant="outline">
              <ArrowClockwise className="mr-2 h-4 w-4" />
              Check again
            </Button>
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Success state
  return (
    <main className="responsive-page-shell min-h-[100dvh] bg-background-main px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-background-secondary p-6 shadow-xl sm:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
            <CheckCircle weight="fill" size={28} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-foreground-primary">You're all set with Pro</h1>
            <p className="text-sm text-foreground-secondary">
              Your subscription is active. Connect your calendar and unlock full history and recommendations.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-background-main p-4">
            <h2 className="text-sm font-semibold text-foreground-primary">Next steps</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground-secondary">
              <li>• Connect Google/Outlook calendar for automatic sync</li>
              <li>• Review your dashboard insights with full history</li>
              <li>• Explore all personalized recommendations</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-background-main p-4">
            <h2 className="text-sm font-semibold text-foreground-primary">Need help?</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground-secondary">
              <li>• Manage billing anytime from Settings → Billing</li>
              <li>
                • Questions?{' '}
                <Link href="/contact" className="underline">
                  Contact support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings?tab=integrations">Connect calendar</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
