// src/app/dashboard/settings/page.tsx

import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/profileService';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import type { AppProfile } from '@/types'; // Import the type for clarity

import SettingsTabs from './SettingTabs';
import SettingsNavigation from './SettingsNavigation';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?redirect=/dashboard/settings');
    }

    // --- CHANGED SECTION START ---
    let profile: AppProfile | null = null;
    try {
        // The service now returns the profile directly or throws an error.
        // We no longer destructure `{ data: profile }`.
        profile = await ProfileService.getProfile(user.id, supabase);
    } catch (error) {
        // If the profile is not found or another error occurs, log it and handle gracefully.
        console.error("Failed to fetch profile for settings page:", error);
        // We can still render the page, but the profile-dependent parts will show empty states.
        // The `profile` variable will remain null.
    }
    // --- CHANGED SECTION END ---

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--background-main)' }}>
            {/* Navigation Header */}
            <SettingsNavigation />

            {/* Main Content */}
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
        </div>
    );
}