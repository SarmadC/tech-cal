'use client'

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProfileSettingsForm from './ProfileSettingsForm';
import BillingSettings from './BillingSettings';
import CareerProfileManager from '@/components/profile/CareerProfileManager';
import CalendarIntegrationSettings from '@/components/dashboard/CalendarIntegrationSettings';
import { ThemeSelector } from '@/components/ui/theme-selector';
import { MaterialIcon } from '@/components/ui/Icon';
import { AppProfile } from '@/types';


export default function SettingsTabs({ profile }: { profile: AppProfile | null }) {
    const searchParams = useSearchParams();

    // On desktop, we default to 'profile'.
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam || 'profile';

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
                return <BillingSettings />;
            case 'profile':
            default:
                return <ProfileSettingsForm profile={profile} />;
        }
    };

    // Desktop View: Sidebar + Content
    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0 lg:border-r lg:border-zinc-200 dark:lg:border-zinc-800 lg:pr-8">
                <nav className="sticky top-8 space-y-1">
                    {tabs.map(tab => (
                        <Link
                            key={tab.id}
                            href={`/dashboard/settings?tab=${tab.id}`}
                            className={`flex items-center px-4 py-3 rounded-lg text-sm transition-colors relative ${activeTab === tab.id
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium'
                                : 'text-zinc-500 dark:text-zinc-400 font-normal hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                                }`}
                        >
                            {activeTab === tab.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-zinc-900 dark:bg-zinc-50 rounded-r" />
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
