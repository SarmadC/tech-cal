'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner, ShoppingCart, CreditCard, Shield } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';

// Paddle checkout functions
import {
  initPaddle,
  openProMonthlyCheckout,
  openProAnnualCheckout,
  isPaddleConfigured,
  PADDLE_PRICES,
} from '@/lib/paddle';

type CheckoutStatus = 'loading' | 'ready' | 'opening' | 'error';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: userLoading } = useAuth();
  
  const [status, setStatus] = useState<CheckoutStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  
  // Get plan from query params (default to monthly)
  const plan = searchParams.get('plan') as 'monthly' | 'annual' | null;
  const selectedPlan = plan === 'annual' ? 'annual' : 'monthly';
  
  // Initialize Paddle on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initPaddle();
        setStatus('ready');
      } catch (err) {
        console.error('Failed to initialize Paddle:', err);
        setError('Failed to load checkout. Please refresh the page.');
        setStatus('error');
      }
    };
    
    if (!isPaddleConfigured()) {
      setError('Checkout is not configured. Please contact support.');
      setStatus('error');
      return;
    }
    
    init();
  }, []);
  
  // Open checkout when user is loaded and Paddle is ready
  const openCheckout = useCallback(async () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = `/checkout?plan=${selectedPlan}`;
      router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
      return;
    }
    
    setStatus('opening');
    
    try {
      if (selectedPlan === 'annual') {
        await openProAnnualCheckout(user.id, user.email || undefined);
      } else {
        await openProMonthlyCheckout(user.id, user.email || undefined);
      }
      // Checkout overlay is now open - status stays as 'opening'
      // The overlay handles completion/cancellation
      setStatus('ready');
    } catch (err) {
      console.error('Failed to open checkout:', err);
      setError('Failed to open checkout. Please try again.');
      setStatus('error');
    }
  }, [user, selectedPlan, router]);
  
  // Auto-open checkout for logged-in users
  useEffect(() => {
    if (!userLoading && user && status === 'ready') {
      // Small delay to ensure Paddle is fully ready
      const timer = setTimeout(() => {
        openCheckout();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userLoading, user, status, openCheckout]);
  
  // Show loading state
  if (userLoading || status === 'loading') {
    return (
      <main className="min-h-screen bg-background-main flex items-center justify-center px-6">
        <div className="text-center">
          <Spinner className="h-12 w-12 animate-spin text-accent-primary mx-auto" />
          <p className="mt-4 text-lg text-foreground-secondary">
            Preparing checkout...
          </p>
        </div>
      </main>
    );
  }
  
  // Show error state
  if (status === 'error') {
    return (
      <main className="min-h-screen bg-background-main flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground-primary mb-4">
            Checkout Error
          </h1>
          <p className="text-foreground-secondary mb-8">
            {error || 'Something went wrong. Please try again.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pricing">Back to Pricing</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }
  
  // Show checkout page (for logged-out users or while waiting)
  const priceDisplay = selectedPlan === 'annual' 
    ? { price: '$99', period: '/year', savings: 'Save 17%' }
    : { price: '$12', period: '/month', savings: null };
  
  return (
    <main className="min-h-screen bg-background-main py-16 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="h-8 w-8 text-accent-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground-primary mb-4">
            Complete Your Subscription
          </h1>
          <p className="text-foreground-secondary">
            {user 
              ? 'Click below to open the secure checkout'
              : 'Sign in to continue with your subscription'
            }
          </p>
        </div>
        
        {/* Plan Summary */}
        <div className="bg-background-secondary rounded-2xl border border-border p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground-primary">
                Pro Plan — {selectedPlan === 'annual' ? 'Annual' : 'Monthly'}
              </h2>
              <p className="text-foreground-secondary mt-1">
                7-day free trial included
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-foreground-primary">
                  {priceDisplay.price}
                </span>
                <span className="text-foreground-tertiary ml-1">
                  {priceDisplay.period}
                </span>
              </div>
              {priceDisplay.savings && (
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {priceDisplay.savings}
                </span>
              )}
            </div>
          </div>
          
          <ul className="space-y-3 text-foreground-secondary mb-6">
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Google Calendar sync
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited saved events
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Full career insights & analytics
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              All personalized recommendations
            </li>
          </ul>
          
          {/* Plan Toggle */}
          <div className="flex gap-2 mb-6">
            <Link
              href="/checkout?plan=monthly"
              className={`flex-1 text-center py-2 px-4 rounded-lg border transition-colors ${
                selectedPlan === 'monthly'
                  ? 'bg-accent-primary text-accent-primary-foreground border-accent-primary'
                  : 'border-border text-foreground-secondary hover:border-accent-primary/50'
              }`}
            >
              Monthly
            </Link>
            <Link
              href="/checkout?plan=annual"
              className={`flex-1 text-center py-2 px-4 rounded-lg border transition-colors ${
                selectedPlan === 'annual'
                  ? 'bg-accent-primary text-accent-primary-foreground border-accent-primary'
                  : 'border-border text-foreground-secondary hover:border-accent-primary/50'
              }`}
            >
              Annual (Save 17%)
            </Link>
          </div>
          
          {/* CTA Button */}
          {user ? (
            <Button 
              onClick={openCheckout} 
              className="w-full py-6 text-lg"
              disabled={status === 'opening'}
            >
              {status === 'opening' ? (
                <>
                  <Spinner className="mr-2 h-5 w-5 animate-spin" />
                  Opening Checkout...
                </>
              ) : (
                'Start 7-Day Free Trial'
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => router.push(`/login?next=${encodeURIComponent(`/checkout?plan=${selectedPlan}`)}`)}
              className="w-full py-6 text-lg"
            >
              Sign In to Continue
            </Button>
          )}
        </div>
        
        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-6 text-foreground-tertiary text-sm">
          <div className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Secure checkout
          </div>
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Cancel anytime
          </div>
        </div>
        
        {/* Back Link */}
        <div className="text-center mt-8">
          <Link 
            href="/pricing" 
            className="text-foreground-secondary hover:text-foreground-primary transition-colors"
          >
            ← Back to pricing
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background-main flex items-center justify-center">
        <Spinner className="h-12 w-12 animate-spin text-accent-primary" />
      </main>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
