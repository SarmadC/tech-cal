// src/app/dashboard/settings/page.tsx

import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/profileService';
import type { AppProfile } from '@/types'; // Import the type for clarity

import SettingsClientView from '@/app/dashboard/settings/SettingsClientView';

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Protected layout guards auth; this is a safety check only
        return null;
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

    return <SettingsClientView profile={profile} />;
}
