'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { openCustomerPortal } from '@/lib/paddle';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import { Button } from '@/components/ui/button';
import { Warning } from '@phosphor-icons/react';

const SettingSection = ({
    title,
    description,
    children
}: {
    title: string,
    description?: string,
    children: React.ReactNode
}) => (
    <div className="grid grid-cols-12 gap-8 py-8 border-b border-zinc-200 dark:border-zinc-800 last:border-0">
        <div className="col-span-4 space-y-1">
            <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{title}</h3>
            {description && (
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
            )}
        </div>
        <div className="col-span-8 space-y-6">
            {children}
        </div>
    </div>
);

const SettingRow = ({
    label,
    description,
    value,
    action
}: {
    label: string,
    description?: string | React.ReactNode,
    value?: React.ReactNode,
    action?: React.ReactNode
}) => (
    <div className="flex items-start justify-between group min-h-[40px] py-1">
        <div className="space-y-0.5 max-w-[50%]">
            <div className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">{label}</div>
            {description && <div className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</div>}
        </div>
        <div className="flex items-center gap-6 pl-4 grow justify-end">
            {value && (
                <div className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {value}
                </div>
            )}
            {action && (
                <div className="shrink-0">
                    {action}
                </div>
            )}
        </div>
    </div>
);

export default function BillingSettings() {
    const {
        subscription,
        isLoading,
        isPro,
        isTrialing,
        trialDaysLeft,
        openUpgrade,
        accessEndsAt,
        daysUntilRenewal,
        gracePeriodDaysLeft,
        isCanceledButActive,
    } = useSubscription();

    // Determine plan display info
    const getPlanInfo = () => {
        if (!subscription || subscription.tier === 'free') {
            return {
                name: 'Free Plan',
                status: 'Active',
                statusColor: 'default',
                description: 'Basic access to all tech events.'
            };
        }
        if (isTrialing) {
            return {
                name: 'Pro Plan',
                status: trialDaysLeft ? `${trialDaysLeft} days left` : 'Trial ending',
                statusColor: 'warning',
                description: accessEndsAt ? `Trial ends on ${accessEndsAt.toLocaleDateString()}` : 'Your trial is active.'
            };
        }
        if (subscription.status === 'past_due') {
            return {
                name: 'Pro Plan',
                status: 'Payment Due',
                statusColor: 'error',
                description: gracePeriodDaysLeft !== null ? `Pay within ${gracePeriodDaysLeft} days to keep access.` : 'Payment required to continue.'
            };
        }
        if (subscription.status === 'canceled') {
            if (isCanceledButActive && accessEndsAt) {
                return {
                    name: `Pro Plan`,
                    status: 'Canceled',
                    statusColor: 'warning',
                    description: `Access continues until ${accessEndsAt.toLocaleDateString()}.`
                };
            }
            return {
                name: 'Pro Plan',
                status: 'Expired',
                statusColor: 'default',
                description: 'Your subscription has ended.'
            };
        }
        return {
            name: `Pro Plan (${subscription.plan_type === 'annual' ? 'Annual' : 'Monthly'})`,
            status: 'Active',
            statusColor: 'success',
            description: daysUntilRenewal && subscription.current_period_end
                ? `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : 'Your subscription is active.'
        };
    };

    const planInfo = getPlanInfo();
    const hasPaddleCustomer = Boolean(subscription?.paddle_customer_id);
    const canManageBilling = Boolean(subscription && subscription.tier !== 'free' && (hasPaddleCustomer || subscription.paddle_subscription_id));
    const awaitingBillingPortal = Boolean(subscription && subscription.tier !== 'free' && !canManageBilling);

    const handleManageBilling = (action: 'overview' | 'cancel' | 'update_payment' = 'overview') => {
        if (!subscription) return;
        if (!subscription.paddle_customer_id && !subscription.paddle_subscription_id) {
            alert('Your billing portal is still being prepared. Please try again shortly.');
            return;
        }
        openCustomerPortal(subscription, action);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-24">
                <BrandLoadingLogo size={24} className="text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Billing & Plans</h2>
                <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1">Manage your subscription, payment methods, and usage.</p>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800">
                {/* Subscription Section */}
                <SettingSection
                    title="Subscription"
                    description="View and manage your current plan details."
                >
                    <SettingRow
                        label="Current Plan"
                        description={planInfo.description}
                        value={
                            <div className="flex items-center gap-3">
                                <span>{planInfo.name}</span>
                                {isTrialing && (
                                    <span className="inline-flex px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] font-medium text-violet-700 dark:text-violet-400">
                                        Trial
                                    </span>
                                )}
                            </div>
                        }
                        action={
                            (!isPro && !isTrialing && !isCanceledButActive) ? (
                                <Button
                                    size="sm"
                                    className="h-8 text-[13px] bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium px-4 shadow-sm"
                                    onClick={() => openUpgrade('monthly')}
                                >
                                    Upgrade Plan
                                </Button>
                            ) : canManageBilling ? (
                                <Button
                                    variant="ghost"
                                    className="h-8 px-3 text-[13px] font-medium text-zinc-900 dark:text-zinc-200 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                                    onClick={() => handleManageBilling('overview')}
                                >
                                    Manage
                                </Button>
                            ) : null
                        }
                    />

                    {/* Payment Method */}
                    {(isPro || isTrialing || isCanceledButActive || canManageBilling) && (
                        <SettingRow
                            label="Payment Method"
                            description={awaitingBillingPortal ? "Setup in progress..." : "Securely managed via Paddle"}
                            value={
                                canManageBilling ? 'Card on file' : 'No payment method'
                            }
                            action={
                                canManageBilling && (
                                    <Button
                                        variant="ghost"
                                        className="h-8 px-3 text-[13px] font-medium text-zinc-900 dark:text-zinc-200 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                                        onClick={() => handleManageBilling('update_payment')}
                                    >
                                        Update
                                    </Button>
                                )
                            }
                        />
                    )}

                    {/* Invoices */}
                    {canManageBilling && (
                        <SettingRow
                            label="Invoices"
                            description="Access your past invoices and billing history."
                            action={
                                <Button
                                    variant="ghost"
                                    className="h-8 px-0 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-transparent underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4 group transition-colors"
                                    onClick={() => handleManageBilling('overview')}
                                >
                                    View History
                                </Button>
                            }
                        />
                    )}
                </SettingSection>

                {/* Usage Section */}
                <SettingSection
                    title="Usage"
                    description="Monitor your feature usage for the current billing period."
                >
                    <SettingRow
                        label="Saved Events"
                        description="Number of events saved to your personal list."
                        value={
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{(isPro || isTrialing) ? "Unlimited" : "5 / 5 Used"}</span>
                                <div className={`w-2 h-2 rounded-full ${(isPro || isTrialing) ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                            </div>
                        }
                    />

                    <SettingRow
                        label="Calendar Sync"
                        description="Automatic synchronization with Google Calendar."
                        value={
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{(isPro || isTrialing) ? "Active" : "Disabled"}</span>
                                <div className={`w-2 h-2 rounded-full ${(isPro || isTrialing) ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                            </div>
                        }
                    />
                </SettingSection>
            </div>

            {subscription?.status === 'past_due' && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-4 flex items-start gap-3">
                    <Warning weight="fill" className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="text-sm font-medium text-red-900 dark:text-red-200">Payment Failed</h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">
                            We couldn&apos;t process your payment. Please <button onClick={() => handleManageBilling('update_payment')} className="underline hover:text-red-900 dark:hover:text-red-100 font-medium">update your payment method</button> to avoid interruption.
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
}
