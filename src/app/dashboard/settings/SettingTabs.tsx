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
import { Spinner } from '@phosphor-icons/react';

export default function SettingsTabs({ profile }: { profile: AppProfile | null }) {
    const searchParams = useSearchParams();
    const { subscription, isLoading: subLoading, isPro, isTrialing, trialDaysLeft, openUpgrade } = useSubscription();

    // On desktop, we default to 'profile'.
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam || 'profile';

    // Determine plan display info
    const getPlanInfo = () => {
        if (!subscription || subscription.tier === 'free') {
            return { name: 'Free Plan', status: 'Active', statusColor: 'success' };
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

                const currentFeatures = (isPro || isTrialing) ? proFeatures : freeFeatures;

                return (
                    <div className="space-y-6">
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
                                            {subscription?.current_period_end
                                                ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                                                : 'Current plan'
                                            }
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
                                    {(isPro || isTrialing) ? (
                                        <>
                                            <button
                                                onClick={handleManageBilling}
                                                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-accent-primary text-accent-primary-foreground hover:bg-accent-primary-hover"
                                            >
                                                Manage Subscription
                                            </button>
                                            {isTrialing && (
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
                                {(isPro || isTrialing) && subscription?.paddle_subscription_id ? (
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
                                        <button
                                            onClick={handleManageBilling}
                                            className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-border-default text-foreground-secondary hover:bg-background-secondary"
                                        >
                                            Update Payment Method
                                        </button>
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