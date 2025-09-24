// src/app/dashboard/settings/page.tsx

import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/profileService';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import type { AppProfile } from '@/types'; // Import the type for clarity

import SettingsTabs from './SettingTabs';

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
        <div className="max-w-5xl mx-auto py-12 px-4 font-sans-all">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-foreground-primary">Settings</h1>
                <p className="text-md text-foreground-secondary mt-1">Manage your account and subscription settings.</p>
            </header>
            <Suspense fallback={<div>Loading settings...</div>}>
                {/* The `|| null` is a safeguard, ensuring we always pass a valid prop type. */}
                <SettingsTabs profile={profile || null} />
            </Suspense>

        </div>
    );
}