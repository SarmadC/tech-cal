// src/app/dashboard/settings/SettingsTabs.tsx
'use client' // This entire file is now a client component

import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // Standard, top-level import
import ProfileSettingsForm from './ProfileSettingsForm';
import CareerProfileManager from '@/components/profile/CareerProfileManager';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AppProfile } from '@/types';

// The component itself is unchanged
export default function SettingsTabs({ profile }: { profile: AppProfile | null }) {
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'profile';

    const tabs = [
        { id: 'profile', label: 'Profile' },
        { id: 'career', label: 'Career Profile' },
        { id: 'appearance', label: 'Appearance' },
        { id: 'billing', label: 'Billing' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'career':
                return <CareerProfileManager />;
            case 'appearance':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground-primary mb-2">Theme</h3>
                            <p className="text-sm text-foreground-secondary mb-4">
                                Choose between light and dark themes or let the system decide.
                            </p>
                            <div className="flex items-center justify-between p-4 border border-border-default rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-foreground-primary">Dark mode</p>
                                    <p className="text-xs text-foreground-tertiary">Toggle between light and dark themes</p>
                                </div>
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                );
            case 'billing':
                return <div className="p-6">Billing and subscription management goes here.</div>;
            case 'profile':
            default:
                return <ProfileSettingsForm profile={profile} />;
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-8">
            <aside className="md:w-1/4">
                <nav className="flex flex-col space-y-2">
                    {tabs.map(tab => (
                        <Link
                            key={tab.id}
                            href={`/dashboard/settings?tab=${tab.id}`}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-accent-primary/10 text-accent-primary'
                                : 'text-foreground-secondary hover:bg-background-secondary'
                                }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </nav>
            </aside>
            <main className="flex-1">
                <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}