'use client';

import { Suspense } from 'react';
import { AppProfile } from '@/types';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import SettingsTabs from '@/app/dashboard/settings/SettingTabs';
import SettingsNavigation from '@/app/dashboard/settings/SettingsNavigation';
import SettingsMobileView from '@/app/dashboard/settings/SettingsMobileView';
import { useIsMobile } from '@/hooks/useDeviceDetection';

interface SettingsClientViewProps {
    profile: AppProfile | null;
}

export default function SettingsClientView({ profile }: SettingsClientViewProps) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Suspense fallback={<div className="p-4 text-zinc-500">Loading settings...</div>}>
                <SettingsMobileView profile={profile || null} />
            </Suspense>
        );
    }

    // Main content wrapper that adjusts margin based on sidebar state
    const MainContentWithSidebarOffset = ({ children }: { children: React.ReactNode }) => {
        const { open } = useSidebar();
        return (
            <div
                className={`flex-1 flex flex-col transition-[margin] duration-200 ease-in-out ${open ? 'md:ml-64' : 'md:ml-16'
                    }`}
            >
                {children}
            </div>
        );
    };

    return (
        <SidebarProvider>
            <div className="responsive-page-shell flex min-h-[100dvh] overflow-x-clip" style={{ backgroundColor: 'var(--background-main)' }}>
                {/* App Sidebar - Hidden on mobile */}
                <AppSidebar />

                <MainContentWithSidebarOffset>
                    {/* Navigation Header */}
                    <SettingsNavigation />

                    {/* Main Content */}
                    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground-primary)' }}>Settings</h1>
                            <p className="text-lg mt-2" style={{ color: 'var(--foreground-secondary)' }}>
                                Manage your account preferences, profile, and subscription settings.
                            </p>
                        </div>

                        <Suspense fallback={
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center space-x-2" style={{ color: 'var(--foreground-secondary)' }}>
                                    <BrandLoadingLogo size={20} inline label={null} />
                                    <span>Loading settings...</span>
                                </div>
                            </div>
                        }>
                            <SettingsTabs profile={profile || null} />
                        </Suspense>
                    </div>
                </MainContentWithSidebarOffset>
            </div>
        </SidebarProvider>
    );
}
