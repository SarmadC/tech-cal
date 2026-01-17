'use client'

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProfileSettingsForm from './ProfileSettingsForm';
import CareerProfileManager from '@/components/profile/CareerProfileManager';
import CalendarIntegrationSettings from '@/components/dashboard/CalendarIntegrationSettings';
import { ThemeSelector } from '@/components/ui/theme-selector';
import { MaterialIcon } from '@/components/ui/Icon';
import { AppProfile } from '@/types';
import { useSubscription } from '@/hooks/useSubscription';
import { openCustomerPortal } from '@/lib/paddle';
import { Spinner, Warning, CalendarX, Clock } from '@phosphor-icons/react';

export default function SettingsTabs({ profile }: { profile: AppProfile | null }) {
    const searchParams = useSearchParams();
    const {
        subscription,
        isLoading: subLoading,
        isPro,
        isTrialing,
        trialDaysLeft,
        openUpgrade,
        accessEndsAt,
        daysUntilRenewal,
        gracePeriodDaysLeft,
        isCanceledButActive,
    } = useSubscription();

    // On desktop, we default to 'profile'.
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam || 'profile';

    // Determine plan display info
    const getPlanInfo = () => {
        if (!subscription || subscription.tier === 'free') {
            return {
                name: 'Free Plan',
                status: 'Active',
                statusColor: 'success' as const,
                dateLabel: null
            };
        }
        if (isTrialing) {
            return {
                name: 'Pro Plan (Trial)',
                status: trialDaysLeft ? `${trialDaysLeft} days left` : 'Trial ending',
                statusColor: 'warning' as const,
                dateLabel: accessEndsAt ? `Trial ends ${accessEndsAt.toLocaleDateString()}` : null
            };
        }
        if (subscription.status === 'past_due') {
            return {
                name: `Pro Plan (${subscription.plan_type === 'annual' ? 'Annual' : 'Monthly'})`,
                status: gracePeriodDaysLeft !== null ? `${gracePeriodDaysLeft} days to pay` : 'Payment required',
                statusColor: 'error' as const,
                dateLabel: 'Update payment to continue access'
            };
        }
        if (subscription.status === 'canceled') {
            // Canceled but still has access
            if (isCanceledButActive && accessEndsAt) {
                return {
                    name: `Pro Plan (${subscription.plan_type === 'annual' ? 'Annual' : 'Monthly'})`,
                    status: 'Canceled',
                    statusColor: 'warning' as const,
                    dateLabel: `Access until ${accessEndsAt.toLocaleDateString()}`
                };
            }
            // Canceled and no access
            return {
                name: 'Pro Plan',
                status: 'Expired',
                statusColor: 'error' as const,
                dateLabel: 'Subscription ended'
            };
        }
        // Active subscription
        return {
            name: `Pro Plan (${subscription.plan_type === 'annual' ? 'Annual' : 'Monthly'})`,
            status: 'Active',
            statusColor: 'success' as const,
            dateLabel: daysUntilRenewal !== null && subscription.current_period_end
                ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : null
        };
    };

    const planInfo = getPlanInfo();

    const handleManageBilling = () => {
        if (subscription) {
            openCustomerPortal(subscription);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: 'person' },
        { id: 'career', label: 'Career Profile', icon: 'work' },
        { id: 'integrations', label: 'Integrations', icon: 'extension' },
        { id: 'appearance', label: 'Appearance', icon: 'palette' },
        { id: 'billing', label: 'Billing', icon: 'credit_card' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'career':
                return <CareerProfileManager />;
            case 'integrations':
                return <CalendarIntegrationSettings />;
            case 'appearance':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground-primary)' }}>Theme</h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--foreground-secondary)' }}>
                                Choose your interface appearance.
                            </p>
                            <ThemeSelector />
                        </div>
                    </div>
                );
            case 'billing':
                if (subLoading) {
                    return (
                        <div className="flex items-center justify-center py-12">
                            <Spinner className="h-8 w-8 animate-spin text-accent-primary" />
                        </div>
                    );
                }

                const freeFeatures = [
                    'Full access to all tech events',
                    'Save up to 5 events',
                    'Last 30 days of history',
                    'Top 3 personalized recommendations'
                ];

                const proFeatures = [
                    'Google Calendar sync',
                    'Unlimited saved events',
                    'Full learning history',
                    'All personalized recommendations',
                    'Detailed career insights & analytics'
                ];

                const currentFeatures = (isPro || isTrialing || isCanceledButActive) ? proFeatures : freeFeatures;

                // Features user will lose when downgraded
                const featuresLosing = [
                    'Google Calendar sync',
                    'Unlimited saved events',
                    'Full learning history'
                ];

                return (
                    <div className="space-y-6">
                        {/* Trial countdown banner */}
                        {isTrialing && trialDaysLeft !== null && (
                            <div
                                className="flex items-center gap-3 p-4 rounded-lg border"
                                style={{
                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    borderColor: 'rgba(245, 158, 11, 0.3)'
                                }}
                            >
                                <Clock size={24} weight="fill" className="text-amber-500 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                        {trialDaysLeft === 0
                                            ? 'Your trial ends today!'
                                            : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your trial`}
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                        Upgrade now to keep your Pro features
                                    </p>
                                </div>
                                <button
                                    onClick={() => openUpgrade('monthly')}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                >
                                    Upgrade Now
                                </button>
                            </div>
                        )}

                        {/* Past due warning banner */}
                        {subscription?.status === 'past_due' && (
                            <div
                                className="flex items-center gap-3 p-4 rounded-lg border"
                                style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderColor: 'rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                <Warning size={24} weight="fill" className="text-red-500 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                        Payment failed - action required
                                    </p>
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                        {gracePeriodDaysLeft !== null && gracePeriodDaysLeft > 0
                                            ? `Update your payment method within ${gracePeriodDaysLeft} day${gracePeriodDaysLeft === 1 ? '' : 's'} to keep your subscription`
                                            : 'Your subscription will be canceled soon if payment is not updated'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleManageBilling}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                                >
                                    Update Payment
                                </button>
                            </div>
                        )}

                        {/* Canceled but active warning */}
                        {isCanceledButActive && (
                            <div
                                className="flex items-start gap-3 p-4 rounded-lg border"
                                style={{
                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    borderColor: 'rgba(245, 158, 11, 0.3)'
                                }}
                            >
                                <CalendarX size={24} weight="fill" className="text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                        Your subscription has been canceled
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 mb-2">
                                        You&apos;ll retain Pro access until {accessEndsAt?.toLocaleDateString()}. After that, you&apos;ll lose:
                                    </p>
                                    <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                                        {featuresLosing.map((f, i) => (
                                            <li key={i} className="flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-amber-500" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <button
                                    onClick={handleManageBilling}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0"
                                >
                                    Reactivate
                                </button>
                            </div>
                        )}

                        <div>
                            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground-primary)' }}>Subscription</h3>
                            <p className="text-sm mb-6" style={{ color: 'var(--foreground-secondary)' }}>
                                Manage your subscription and billing information.
                            </p>

                            <div
                                className="border rounded-lg p-6"
                                style={{
                                    backgroundColor: 'var(--background-main)',
                                    borderColor: 'var(--border-default)'
                                }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-base font-medium" style={{ color: 'var(--foreground-primary)' }}>{planInfo.name}</h4>
                                        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                            {planInfo.dateLabel || 'Current plan'}
                                        </p>
                                    </div>
                                    <span
                                        className="px-3 py-1 text-xs font-medium rounded-full"
                                        style={{
                                            backgroundColor: planInfo.statusColor === 'success' ? 'var(--success-light)'
                                                : planInfo.statusColor === 'warning' ? 'rgba(245, 158, 11, 0.1)'
                                                : 'rgba(239, 68, 68, 0.1)',
                                            color: planInfo.statusColor === 'success' ? 'var(--success)'
                                                : planInfo.statusColor === 'warning' ? '#f59e0b'
                                                : '#ef4444'
                                        }}
                                    >
                                        {planInfo.status}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {currentFeatures.map((feature, i) => (
                                        <div key={i} className="flex items-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                            <MaterialIcon name="check" size={16} className="mr-2" color="var(--success)" />
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                <div
                                    className="mt-6 pt-4 border-t flex gap-3"
                                    style={{ borderColor: 'var(--border-default)' }}
                                >
                                    {(isPro || isTrialing || isCanceledButActive) ? (
                                        <>
                                            <button
                                                onClick={handleManageBilling}
                                                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-accent-primary text-accent-primary-foreground hover:bg-accent-primary-hover"
                                            >
                                                Manage Subscription
                                            </button>
                                            {(isTrialing || isCanceledButActive) && (
                                                <Link
                                                    href="/pricing"
                                                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-border-default text-foreground-secondary hover:bg-background-secondary"
                                                >
                                                    View Plans
                                                </Link>
                                            )}
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => openUpgrade('monthly')}
                                            className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-accent-primary text-accent-primary-foreground hover:bg-accent-primary-hover"
                                        >
                                            Upgrade to Pro
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground-primary)' }}>Billing Information</h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--foreground-secondary)' }}>
                                Your billing details and payment history.
                            </p>

                            <div
                                className="border rounded-lg p-6"
                                style={{
                                    backgroundColor: 'var(--background-main)',
                                    borderColor: 'var(--border-default)'
                                }}
                            >
                                {subscription?.paddle_subscription_id ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center">
                                                    <MaterialIcon name="credit-card" size={20} color="var(--accent-primary)" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium" style={{ color: 'var(--foreground-primary)' }}>
                                                        Payment method on file
                                                    </p>
                                                    <p className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>
                                                        Managed by Paddle
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleManageBilling}
                                                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-border-default text-foreground-secondary hover:bg-background-secondary"
                                            >
                                                Update Payment Method
                                            </button>
                                            <button
                                                onClick={handleManageBilling}
                                                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-border-default text-foreground-secondary hover:bg-background-secondary"
                                            >
                                                View Billing History
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <MaterialIcon name="credit-card" size={48} className="mx-auto mb-4" color="var(--foreground-tertiary)" />
                                        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                            No billing information on file
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--foreground-tertiary)' }}>
                                            Billing details will appear here when you upgrade to a paid plan
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'profile':
            default:
                return <ProfileSettingsForm profile={profile} />;
        }
    };

    // Desktop View: Sidebar + Content
    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0 lg:border-r lg:border-white/5 lg:pr-8">
                <nav className="sticky top-8 space-y-1">
                    {tabs.map(tab => (
                        <Link
                            key={tab.id}
                            href={`/dashboard/settings?tab=${tab.id}`}
                            className={`flex items-center px-4 py-3 rounded-lg text-sm transition-colors relative ${activeTab === tab.id
                                ? 'bg-white/5 text-white font-medium'
                                : 'text-zinc-500 font-normal'
                                } hover:bg-white/5 hover:text-white`}
                        >
                            {activeTab === tab.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white rounded-r" />
                            )}
                            <span className="truncate">{tab.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
                <div className="lg:p-8">
                    {/* Explicitly disable animations to prevent "rolling" effect on tab change */}
                    <div className="integration-settings-wrapper">
                        <style jsx global>{`
                            .integration-settings-wrapper * {
                                transition: none !important;
                                animation: none !important;
                                transform: none !important;
                            }
                        `}</style>
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
}