// src/app/dashboard/settings/SettingsTabs.tsx
'use client' // This entire file is now a client component

import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // Standard, top-level import
import ProfileSettingsForm from './ProfileSettingsForm';
import { AppProfile } from '@/types';

// The component itself is unchanged
export default function SettingsTabs({ profile }: { profile: AppProfile | null }) {
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'profile';

    const tabs = [
        { id: 'profile', label: 'Profile' },
        { id: 'billing', label: 'Billing' },
    ];

    const renderContent = () => {
        switch (activeTab) {
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