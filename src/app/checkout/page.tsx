'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner, ShoppingCart, CreditCard, Shield } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
import { useCheckout } from '@/contexts/CheckoutContext';

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: userLoading } = useAuth();
    const { openCheckout, setCheckoutUser, isOpen } = useCheckout();

    // Get plan from query params (default to monthly)
    const plan = searchParams.get('plan') as 'monthly' | 'annual' | null;
    const selectedPlan = plan === 'annual' ? 'annual' : 'monthly';

    // Update checkout context user when user loads
    useEffect(() => {
        if (user) {
            setCheckoutUser(user.id, user.email);
        }
    }, [user, setCheckoutUser]);

    const handleOpenCheckout = useCallback(() => {
        if (!user) {
            // Redirect to login with return URL
            const returnUrl = `/checkout?plan=${selectedPlan}`;
            router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
            return;
        }

        // Open the new overlay
        openCheckout(selectedPlan);
    }, [user, selectedPlan, router, openCheckout]);

    // Auto-open checkout for logged-in users who land here
    useEffect(() => {
        if (!userLoading && user && !isOpen) {
            // Small delay to ensure smooth transition
            const timer = setTimeout(() => {
                handleOpenCheckout();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [userLoading, user, isOpen, handleOpenCheckout]);

    if (userLoading) {
        return (
            <main className="min-h-screen bg-background-main flex items-center justify-center px-6">
                <div className="text-center">
                    <Spinner className="h-12 w-12 animate-spin text-accent-primary mx-auto" />
                    <p className="mt-4 text-lg text-foreground-secondary">
                        Loading...
                    </p>
                </div>
            </main>
        );
    }

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
                    <p className="text-foreground-secondary hidden md:block">
                        Opening secure checkout...
                    </p>
                    {/* Mobile visible button if auto-open blocked or closed */}
                    <div className="mt-6 md:hidden">
                        <Button onClick={handleOpenCheckout} size="lg" className="w-full">
                            Open Checkout
                        </Button>
                    </div>
                </div>

                {/* Simplified Background Content since Modal covers it mostly */}
                <div className="opacity-50 pointer-events-none blur-[1px]">
                    <div className="bg-background-secondary rounded-2xl border border-border p-8 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground-primary">
                                    Pro Plan — {selectedPlan === 'annual' ? 'Annual' : 'Monthly'}
                                </h2>
                            </div>
                        </div>
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
