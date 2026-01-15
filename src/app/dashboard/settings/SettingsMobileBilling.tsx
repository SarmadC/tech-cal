'use client';

import Link from 'next/link';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { openCustomerPortal } from '@/lib/paddle';
import { Spinner } from '@phosphor-icons/react';

export default function SettingsMobileBilling() {
    const { subscription, isLoading, isPro, isTrialing, trialDaysLeft, openUpgrade } = useSubscription();

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
            return { name: 'Pro Plan', status: 'Canceled', statusColor: 'error' };
        }
        return {
            name: `Pro Plan (${subscription.plan_type === 'annual' ? 'Annual' : 'Monthly'})`,
            status: 'Active',
            statusColor: 'success'
        };
    };

    const planInfo = getPlanInfo();

    const handleManageBilling = () => {
        if (subscription) {
            openCustomerPortal(subscription);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Spinner className="h-8 w-8 animate-spin text-[var(--mono-text-tertiary)]" />
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
        'All personalized recommendations'
    ];

    const currentFeatures = (isPro || isTrialing) ? proFeatures : freeFeatures;

    return (
        <div className="space-y-6">
            {/* Current Plan Section */}
            <div>
                <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-3 px-1 uppercase tracking-[0.05em]">
                    Current Plan
                </h3>
                <div className="rounded-lg overflow-hidden bg-[var(--mono-bg-surface)] border border-[var(--mono-border-default)] p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h4 className="text-[17px] font-semibold text-[var(--mono-text-primary)] mb-1">{planInfo.name}</h4>
                            <p className="text-[13px] text-[var(--mono-text-secondary)]">
                                {subscription?.current_period_end
                                    ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                                    : 'Current plan'
                                }
                            </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                            planInfo.statusColor === 'success'
                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                : planInfo.statusColor === 'warning'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : planInfo.statusColor === 'error'
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-[var(--mono-bg-hover)] text-[var(--mono-text-primary)] border-[var(--mono-border-strong)]'
                        }`}>
                            {planInfo.status.toUpperCase()}
                        </span>
                    </div>

                    <div className="space-y-3 mb-6">
                        {currentFeatures.map((feature, i) => (
                            <div key={i} className="flex items-center gap-3 text-[13px] text-[var(--mono-text-secondary)]">
                                <MaterialIcon name="check-circle" size={16} className="text-green-500" />
                                {feature}
                            </div>
                        ))}
                    </div>

                    {(isPro || isTrialing) ? (
                        <div className="flex gap-3">
                            <Button
                                onClick={handleManageBilling}
                                className="flex-1 bg-[var(--mono-text-primary)] text-[var(--mono-bg-main)] hover:bg-[var(--mono-text-secondary)] h-10 text-sm font-medium rounded-md transition-colors"
                            >
                                Manage Subscription
                            </Button>
                            {isTrialing && (
                                <Link href="/pricing">
                                    <Button
                                        variant="outline"
                                        className="h-10 text-sm font-medium rounded-md"
                                    >
                                        Plans
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <Button
                            onClick={() => openUpgrade('monthly')}
                            className="w-full bg-[var(--mono-text-primary)] text-[var(--mono-bg-main)] hover:bg-[var(--mono-text-secondary)] h-10 text-sm font-medium rounded-md transition-colors"
                        >
                            Upgrade to Pro
                        </Button>
                    )}
                </div>
            </div>

            {/* Payment Method Section */}
            <div>
                <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-3 px-1 uppercase tracking-[0.05em]">
                    Payment Method
                </h3>
                <div className="rounded-lg overflow-hidden bg-[var(--mono-bg-surface)] border border-[var(--mono-border-default)]">
                    {(isPro || isTrialing) && subscription?.paddle_subscription_id ? (
                        <>
                            <div className="p-5 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--mono-bg-hover)] flex items-center justify-center">
                                    <MaterialIcon name="credit-card" size={20} className="text-[var(--mono-text-primary)]" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-medium text-[var(--mono-text-primary)]">
                                        Payment method on file
                                    </p>
                                    <p className="text-[11px] text-[var(--mono-text-tertiary)]">
                                        Managed by Paddle
                                    </p>
                                </div>
                            </div>
                            <div className="border-t border-[var(--mono-border-default)]">
                                <button
                                    onClick={handleManageBilling}
                                    className="w-full h-[48px] flex items-center justify-center text-[13px] font-medium text-[var(--mono-text-primary)] hover:bg-[var(--mono-bg-hover)] transition-colors"
                                >
                                    Update Payment Method
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                <div className="w-10 h-10 rounded-full bg-[var(--mono-bg-hover)] flex items-center justify-center mb-3">
                                    <MaterialIcon name="credit-card" size={20} className="text-[var(--mono-text-tertiary)]" />
                                </div>
                                <p className="text-[13px] text-[var(--mono-text-secondary)] mb-1">No payment method added</p>
                                <p className="text-[11px] text-[var(--mono-text-tertiary)]">Add a card to upgrade your plan</p>
                            </div>
                            <div className="border-t border-[var(--mono-border-default)]">
                                <button
                                    onClick={() => openUpgrade('monthly')}
                                    className="w-full h-[48px] flex items-center justify-center text-[13px] font-medium text-[var(--mono-text-primary)] hover:bg-[var(--mono-bg-hover)] transition-colors"
                                >
                                    Add Payment Method
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Billing History Link */}
            {(isPro || isTrialing) && subscription?.paddle_subscription_id && (
                <div className="px-1">
                    <button
                        onClick={handleManageBilling}
                        className="flex items-center gap-2 text-[13px] text-[var(--mono-text-secondary)] hover:text-[var(--mono-text-primary)] transition-colors"
                    >
                        <MaterialIcon name="time" size={16} />
                        View Billing History
                    </button>
                </div>
            )}
        </div>
    );
}
