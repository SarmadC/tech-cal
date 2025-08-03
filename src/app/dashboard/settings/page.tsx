// src/app/dashboard/settings/page.tsx
import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/profileService';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

// Import the client component from its new, separate file
import SettingsTabs from './SettingTabs';

// This is now a pure Server Component
export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?redirect=/dashboard/settings');
    }

    const { data: profile } = await ProfileService.getProfile(user.id, supabase);

    return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-foreground-primary">Settings</h1>
                <p className="text-md text-foreground-secondary mt-1">Manage your account and subscription settings.</p>
            </header>
            {/* Suspense is great for streaming and handling client component loading */}
            <Suspense fallback={<div>Loading settings...</div>}>
                <SettingsTabs profile={profile || null} />
            </Suspense>
        </div>
    );
}