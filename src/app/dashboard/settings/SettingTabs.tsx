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
import { SettingsLayout } from '@/components/settings/SettingsLayout';

export default function SettingsTabs({ profile }: { profile: AppProfile | null }) {
    const searchParams = useSearchParams();

    // On desktop, we default to 'profile'.
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam || 'profile';

    const navigationItems: any[] = [
        { key: 'account_header', type: 'header', label: 'Account' },
        { key: 'profile', href: '/dashboard/settings?tab=profile', label: 'Profile', icon: 'person' },
        { key: 'career', href: '/dashboard/settings?tab=career', label: 'Career Profile', icon: 'work' },
        { key: 'appearance', href: '/dashboard/settings?tab=appearance', label: 'Preferences', icon: 'tune' }, // Renamed to Permissions/Preferences conceptually

        { key: 'workspace_header', type: 'header', label: 'Workspace' },
        { key: 'integrations', href: '/dashboard/settings?tab=integrations', label: 'Integrations', icon: 'extension' },
        { key: 'billing', href: '/dashboard/settings?tab=billing', label: 'Billing', icon: 'credit_card' },
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
                        <div className="mb-6">
                            <h2 className="text-lg font-medium text-[var(--foreground-primary)] mb-1">Theme & Appearance</h2>
                            <p className="text-sm text-[var(--foreground-secondary)]">Customize how the application looks for you.</p>
                        </div>
                        <ThemeSelector />
                    </div>
                );
            case 'billing':
                return <BillingSettings />;
            case 'profile':
            default:
                return <ProfileSettingsForm profile={profile} />;
        }
    };

    return (
        <SettingsLayout
            navigationItems={navigationItems}
            title="Settings"
            description="Manage your account, preferences, and workspace settings."
        >
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
        </SettingsLayout>
    );
}
