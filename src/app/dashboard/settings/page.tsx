// src/app/dashboard/settings/page.tsx (Updated with API tab removed)
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

// You would create these as separate, focused components
// import { ProfileSettings } from '@/components/settings/ProfileSettings';
// import { BillingSettings } from '@/components/settings/BillingSettings';

// --- Placeholder components for demonstration ---
const ProfileSettings = () => <div className="p-6 bg-background-main rounded-lg border border-border-color">Profile settings form goes here.</div>;
const BillingSettings = () => <div className="p-6 bg-background-main rounded-lg border border-border-color">Billing and subscription management goes here.</div>;
// ------------------------------------------------

const tabs = [
    { id: 'profile', label: 'Profile' },
    // REMOVED: { id: 'api', label: 'API Keys' },
    { id: 'billing', label: 'Billing' },
];

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'profile';

    const renderContent = () => {
        switch (activeTab) {
            // REMOVED: case 'api': return <ApiKeysSettings />;
            case 'billing':
                return <BillingSettings />;
            case 'profile':
            default:
                return <ProfileSettings />;
        }
    };

    return (
        <ProtectedRoute>
            <div className="max-w-5xl mx-auto py-12 px-4">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground-primary">Settings</h1>
                    <p className="text-md text-foreground-secondary mt-1">Manage your account and subscription settings.</p>
                </header>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Navigation */}
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

                    {/* Main Content Area */}
                    <main className="flex-1">
                        {renderContent()}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}