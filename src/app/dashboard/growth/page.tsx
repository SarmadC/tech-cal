// src/app/dashboard/growth/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import GrowthClientView from './GrowthClientView';

// We no longer need EventService, UserEventService, or the helper function here.
// The client component is now fully responsible for its data.

export default async function GrowthPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login?redirect=/dashboard/growth');
    }

    // --- FIX: All server-side data fetching is removed. ---
    // The GrowthClientView now fetches analytics and opportunities itself.
    // We pass an empty array for initialOpportunities to prevent any layout shift,
    // and the initialTrackedEvents prop is removed as it's no longer used.

    return (
        <GrowthClientView
            initialOpportunities={[]}
        />
    );
}