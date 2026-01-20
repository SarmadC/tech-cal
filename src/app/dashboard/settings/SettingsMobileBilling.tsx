'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { openCustomerPortal } from '@/lib/paddle';
import { CircleNotch, ShieldCheck, Receipt, CreditCard } from '@phosphor-icons/react';

export default function SettingsMobileBilling() {
    const {
        subscription,
        isLoading,
        isPro,
        isTrialing,
        trialDaysLeft,
        openUpgrade,
        isCanceledButActive
    } = useSubscription();

    // Determine plan display info
    const getPlanInfo = () => {
        if (!subscription || subscription.tier === 'free') {
            return { name: 'Free Plan', status: 'Active', statusColor: 'default' };
        }
        if (isTrialing) {
            return {
                name: 'Pro Plan (Trial)',
                status: trialDaysLeft ? `${trialDaysLeft} days left` : 'Trial',
                statusColor: 'warning'
            };
        }
        if (subscription.status === 'past_due') {
            return { name: 'Pro Plan', status: 'Payment Due', statusColor: 'error' };
        }
        if (subscription.status === 'canceled') {
            if (isCanceledButActive) {
                return { name: 'Pro Plan', status: 'Canceled', statusColor: 'warning' };
            }
            return { name: 'Pro Plan', status: 'Canceled', statusColor: 'error' };
        }
        return {
            name: `Pro Plan ${subscription.plan_type === 'annual' ? 'Annual' : 'Monthly'}`,
            status: 'Active',
            statusColor: 'success'
        };
    };

    const planInfo = getPlanInfo();
    const hasPaddleCustomer = Boolean(subscription?.paddle_customer_id);
    // Allow if we have customer ID OR subscription ID (for self-healing)
    const canManageBilling = Boolean(subscription && subscription.tier !== 'free' && (hasPaddleCustomer || subscription.paddle_subscription_id));
    const awaitingBillingPortal = Boolean(subscription && subscription.tier !== 'free' && !canManageBilling);

    const handleManageBilling = (action: 'overview' | 'cancel' | 'update_payment' = 'overview') => {
        if (!subscription) return;

        // If free tier, redirect to upgrade instead of trying to open portal
        if (subscription.tier === 'free') {
            openUpgrade('monthly');
            return;
        }

        if (!subscription.paddle_customer_id && !subscription.paddle_subscription_id) {
            if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                window.alert('Your billing portal is still being prepared. Please try again shortly or reach out to support if you need immediate help.');
            }
            return;
        }

        openCustomerPortal(subscription, action);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <CircleNotch weight="bold" className="h-5 w-5 animate-spin text-[var(--mono-text-tertiary)]" />
            </div>
        );
    }

    const freeFeatures = [
        'Full access to all tech events',
        'Save up to 5 events',
        'Last 30 days of history'
    ];

    const proFeatures = [
        'Google Calendar sync',
        'Unlimited saved events',
        'Full learning history',
        'Personalized recommendations'
    ];

    const showProFeatures = isPro || isTrialing || isCanceledButActive;
    const currentFeatures = showProFeatures ? proFeatures : freeFeatures;

    return (

        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Section: Current Plan */}
            <div className="space-y-3">
                <h3 className="text-[13px] font-medium text-[var(--mono-text-secondary)]">Current Plan</h3>
                <div className="flex items-start justify-between group">
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-[15px] font-medium text-[var(--mono-text-primary)]">{planInfo.name}</h4>
                            {/* Linear-style Status Dot */}
                            <div className={`w-1.5 h-1.5 rounded-full ${planInfo.statusColor === 'success' ? 'bg-green-500' :
                                planInfo.statusColor === 'warning' ? 'bg-violet-500' :
                                    planInfo.statusColor === 'error' ? 'bg-red-500' :
                                        'bg-zinc-400'
                                }`} />
                        </div>
                        {/* Status / Trial Info - Subtle */}
                        <div className={`text-[13px] mt-0.5 ${planInfo.statusColor === 'warning' ? 'text-violet-500' :
                            planInfo.statusColor === 'error' ? 'text-red-500' :
                                'text-[var(--mono-text-tertiary)]'
                            }`}>
                            {planInfo.status === 'Active' && subscription?.current_period_end ?
                                `Renews ${new Date(subscription.current_period_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` :
                                planInfo.status
                            }
                        </div>
                    </div>

                    {/* Actions - Right Aligned Ghost Buttons */}
                    <div className="flex items-center gap-2">
                        {!canManageBilling && !showProFeatures ? (
                            <Button
                                onClick={() => openUpgrade('monthly')}
                                className="h-8 bg-[var(--mono-text-primary)] text-[var(--mono-bg-main)] hover:opacity-90 px-3 text-[13px] font-medium rounded-md transition-all shadow-sm"
                            >
                                Upgrade
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                onClick={() => handleManageBilling('overview')}
                                className="h-8 text-[13px] font-medium text-[var(--mono-text-secondary)] hover:text-[var(--mono-text-primary)] hover:bg-[var(--mono-bg-hover)] px-3 rounded-md -mr-2"
                            >
                                Manage
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="h-[1px] w-full bg-[var(--mono-border-default)] opacity-40" />

            {/* Section: Payment Method */}
            <div className="space-y-3">
                <h3 className="text-[13px] font-medium text-[var(--mono-text-secondary)]">Payment Method</h3>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-[var(--mono-text-tertiary)]">
                            <CreditCard size={20} weight="duotone" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[14px] text-[var(--mono-text-primary)]">
                                {canManageBilling ? 'Card on file' : 'No payment method'}
                            </span>
                            {canManageBilling && (
                                <span className="text-[12px] text-[var(--mono-text-tertiary)]">Secure via Paddle</span>
                            )}
                        </div>
                    </div>

                    {canManageBilling && (
                        <Button
                            variant="ghost"
                            onClick={() => handleManageBilling('update_payment')}
                            className="h-8 text-[13px] font-medium text-[var(--mono-text-secondary)] hover:text-[var(--mono-text-primary)] hover:bg-[var(--mono-bg-hover)] px-3 rounded-md -mr-2"
                        >
                            Update
                        </Button>
                    )}
                </div>
            </div>

            <div className="h-[1px] w-full bg-[var(--mono-border-default)] opacity-40" />

            {/* Section: Invoices */}
            {canManageBilling && (
                <>
                    <div className="space-y-3">
                        <h3 className="text-[13px] font-medium text-[var(--mono-text-secondary)]">Invoices</h3>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-[var(--mono-text-tertiary)]">
                                    <Receipt size={20} weight="duotone" />
                                </div>
                                <span className="text-[14px] text-[var(--mono-text-primary)]">Billing History</span>
                            </div>

                            <Button
                                variant="ghost"
                                onClick={() => handleManageBilling('overview')}
                                className="h-8 text-[13px] font-medium text-[var(--mono-text-secondary)] hover:text-[var(--mono-text-primary)] hover:bg-[var(--mono-bg-hover)] px-3 rounded-md -mr-2 group"
                            >
                                View <span className="ml-1 opacity-50 group-hover:opacity-100 transition-opacity">↗</span>
                            </Button>
                        </div>
                    </div>
                    <div className="h-[1px] w-full bg-[var(--mono-border-default)] opacity-40" />
                </>
            )}


            {/* Section: Usage */}
            <div className="space-y-3">
                <h3 className="text-[13px] font-medium text-[var(--mono-text-secondary)]">Usage</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[14px] text-[var(--mono-text-primary)]">Saved Events</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] text-[var(--mono-text-secondary)]">
                                {showProFeatures ? 'Unlimited' : '5 / 5'}
                            </span>
                            {showProFeatures && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[14px] text-[var(--mono-text-primary)]">Calendar Sync</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] text-[var(--mono-text-secondary)]">
                                {showProFeatures ? 'Active' : 'Disabled'}
                            </span>
                            {showProFeatures && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
