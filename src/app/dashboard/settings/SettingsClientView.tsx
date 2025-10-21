'use client';

import { Suspense } from 'react';
import { AppProfile } from '@/types';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import SettingsTabs from '@/app/dashboard/settings/SettingTabs';
import SettingsNavigation from '@/app/dashboard/settings/SettingsNavigation';
import { useIsMobile } from '@/hooks/useDeviceDetection';

interface SettingsClientViewProps {
    profile: AppProfile | null;
}

export default function SettingsClientView({ profile }: SettingsClientViewProps) {
    const isMobile = useIsMobile();

    // Main content wrapper that adjusts margin based on sidebar state
    const MainContentWithSidebarOffset = ({ children }: { children: React.ReactNode }) => {
        const { open } = useSidebar();
        return (
            <div 
                className={`flex-1 flex flex-col transition-[margin] duration-200 ease-in-out ${
                    !isMobile ? (open ? 'md:ml-64' : 'md:ml-16') : 'ml-0'
                }`}
            >
                {children}
            </div>
        );
    };

    return (
        <SidebarProvider>
            <div className="flex min-h-screen" style={{ backgroundColor: 'var(--background-main)' }}>
                {/* App Sidebar - Hidden on mobile */}
                {!isMobile && <AppSidebar />}
                
                <MainContentWithSidebarOffset>
                    {/* Navigation Header */}
                    <SettingsNavigation />

                    {/* Main Content */}
                    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground-primary)' }}>Settings</h1>
                            <p className="text-lg mt-2" style={{ color: 'var(--foreground-secondary)' }}>
                                Manage your account preferences, profile, and subscription settings.
                            </p>
                        </div>
                        
                        <Suspense fallback={
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center space-x-2" style={{ color: 'var(--foreground-secondary)' }}>
                                    <div 
                                        className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" 
                                        style={{ borderColor: 'var(--foreground-secondary)' }}
                                    />
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


