'use client';

import Link from 'next/link';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { openCustomerPortal } from '@/lib/paddle';
import { CircleNotch, Lightning, ShieldCheck, Ticket, Receipt, CreditCard } from '@phosphor-icons/react';

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
            name: `Pro Plan ${subscription.plan_type === 'annual' ? 'Annual' : 'Monthly'}`,
            status: 'Active',
            statusColor: 'success'
        };
    };

    const planInfo = getPlanInfo();
    const hasPaddleCustomer = Boolean(subscription?.paddle_customer_id);
    const canManageBilling = Boolean(subscription && subscription.tier !== 'free' && hasPaddleCustomer);
    const awaitingBillingPortal = Boolean(subscription && subscription.tier !== 'free' && !hasPaddleCustomer);

    const handleManageBilling = () => {
        if (!subscription) return;

        if (!subscription.paddle_customer_id) {
            if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                window.alert('Your billing portal is still being prepared. Please try again shortly or reach out to support if you need immediate help.');
            }
            return;
        }

        openCustomerPortal(subscription);
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

    const currentFeatures = (isPro || isTrialing) ? proFeatures : freeFeatures;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Plan Card - Linear Style "Ticket" */}
            <div className="group relative overflow-hidden rounded-xl border border-[var(--mono-border-default)] bg-[var(--mono-bg-surface)] shadow-sm transition-all hover:shadow-md">

                {(isPro || isTrialing) && (
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/5 pointer-events-none" />
                )}

                <div className="p-5">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex gap-3">
                            <div className={`h-10 w-10 flex items-center justify-center rounded-lg border shadow-sm ${isPro || isTrialing
                                ? 'bg-gradient-to-br from-violet-500/20 to-indigo-600/5 border-violet-500/20 text-violet-600 dark:text-violet-400'
                                : 'bg-[var(--mono-bg-hover)] border-[var(--mono-border-default)] text-[var(--mono-text-secondary)]'
                                }`}>
                                {(isPro || isTrialing) ? <Lightning size={20} weight="fill" /> : <Ticket size={20} weight="duotone" />}
                            </div>
                            <div>
                                <h4 className="text-[15px] font-semibold text-[var(--mono-text-primary)] leading-tight">{planInfo.name}</h4>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${planInfo.statusColor === 'success'
                                        ? 'bg-green-500/5 text-green-600 border-green-500/20'
                                        : planInfo.statusColor === 'warning'
                                            ? 'bg-amber-500/5 text-amber-600 border-amber-500/20'
                                            : planInfo.statusColor === 'error'
                                                ? 'bg-red-500/5 text-red-600 border-red-500/20'
                                                : 'bg-[var(--mono-bg-subtle)] text-[var(--mono-text-secondary)] border-[var(--mono-border-default)]'
                                        }`}>
                                        {planInfo.status}
                                    </span>
                                    <span className="text-[12px] text-[var(--mono-text-tertiary)]">
                                        {subscription?.current_period_end
                                            ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                                            : 'Free tier'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feature List as Compact Grid */}
                    <div className="space-y-2 mb-6">
                        {currentFeatures.map((feature, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                                <ShieldCheck size={14} weight="fill" className={`mt-0.5 shrink-0 ${isPro || isTrialing ? 'text-violet-500/80' : 'text-[var(--mono-text-tertiary)]'}`} />
                                <span className="text-[13px] text-[var(--mono-text-secondary)] leading-tight">{feature}</span>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    {canManageBilling ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={handleManageBilling}
                                className="w-full bg-[var(--mono-text-primary)] text-[var(--mono-bg-main)] hover:bg-[var(--mono-text-secondary)] hover:opacity-95 h-9 text-[13px] font-medium rounded-lg shadow-sm transition-all"
                            >
                                Manage
                            </Button>
                            {isTrialing && (
                                <Link href="/pricing" className="w-full">
                                    <Button
                                        variant="outline"
                                        className="w-full h-9 text-[13px] font-medium rounded-lg border-[var(--mono-border-strong)] bg-transparent hover:bg-[var(--mono-bg-hover)] transition-all"
                                    >
                                        Compare Plans
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ) : (isPro || isTrialing) ? (
                        <div className="rounded-lg border border-[var(--mono-border-default)] bg-[var(--mono-bg-hover)]/40 px-4 py-3 text-[12px] text-[var(--mono-text-secondary)]">
                            We're finalizing your billing portal. Please try again shortly or contact support if you need to make changes immediately.
                        </div>
                    ) : (
                        <Button
                            onClick={() => openUpgrade('monthly')}
                            className="w-full bg-[var(--mono-text-primary)] text-[var(--mono-bg-main)] hover:bg-[var(--mono-text-secondary)] hover:opacity-95 h-10 text-[13px] font-medium rounded-lg shadow-sm transition-all relative overflow-hidden group"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Upgrade to Pro
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Payment Method - Compact Row Design */}
            <div>
                <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-2 px-1 uppercase tracking-wider">
                    Payment Method
                </h3>
                <div className="rounded-xl overflow-hidden bg-[var(--mono-bg-surface)] border border-[var(--mono-border-default)] shadow-sm">
                    {canManageBilling ? (
                        <div className="flex items-center justify-between p-3 pl-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-10 rounded border border-[var(--mono-border-default)] bg-[var(--mono-bg-subtle)] flex items-center justify-center text-[var(--mono-text-secondary)] shadow-sm">
                                    <CreditCard size={18} weight="duotone" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[13px] font-medium text-[var(--mono-text-primary)]">
                                        Card on file
                                    </p>
                                    <p className="text-[11px] text-[var(--mono-text-tertiary)] flex items-center gap-1">
                                        Secure via Paddle
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={handleManageBilling}
                                className="h-8 text-[12px] font-medium text-[var(--mono-text-secondary)] hover:text-[var(--mono-text-primary)] hover:bg-[var(--mono-bg-hover)] px-3 rounded-lg"
                            >
                                Update
                            </Button>
                        </div>
                    ) : awaitingBillingPortal ? (
                        <div className="p-3 text-[12px] text-[var(--mono-text-secondary)] flex items-center gap-2">
                            <MaterialIcon name="hourglass_empty" size={18} color="var(--mono-text-tertiary)" />
                            Billing portal link will appear once Paddle confirms your subscription.
                        </div>
                    ) : (
                        <button
                            onClick={handleManageBilling}
                            className="w-full flex items-center justify-between p-3 pl-4 hover:bg-[var(--mono-bg-hover)]/50 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-10 rounded border border-dashed border-[var(--mono-border-strong)] bg-transparent flex items-center justify-center text-[var(--mono-text-tertiary)] group-hover:border-[var(--mono-text-secondary)] transition-colors">
                                    <CreditCard size={18} />
                                </div>
                                <div className="text-left">
                                    <span className="text-[13px] font-medium text-[var(--mono-text-secondary)] group-hover:text-[var(--mono-text-primary)] transition-colors">Add Payment Method</span>
                                </div>
                            </div>
                            <div className="h-8 w-8 flex items-center justify-center text-[var(--mono-text-tertiary)]">
                                <MaterialIcon name="chevron_right" size={18} />
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* Invoices Link - More Subtle */}
            {canManageBilling && (
                <div className="flex justify-center">
                    <button
                        onClick={handleManageBilling}
                        className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--mono-text-tertiary)] hover:text-[var(--mono-text-primary)] transition-colors py-2 px-3 rounded-md hover:bg-[var(--mono-bg-surface)]"
                    >
                        <Receipt size={14} weight="duotone" />
                        View Invoices & Billing History
                    </button>
                </div>
            )}
        </div>
    );
}
