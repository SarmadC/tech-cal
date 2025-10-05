// src/app/calendar/page.tsx

// This route needs dynamic rendering for user authentication and data fetching
export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
// EventService no longer needed - using server-side filtering
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';

export default async function CalendarPage() {
    const supabase = await createClient();
    const { data: { user }, error: _authError } = await supabase.auth.getUser();

    // Re-enable authentication
    if (_authError || !user) {
        redirect('/login');
    }

    try {
        // Load categories for filter options
        const categories = await EventTypeService.getEventTypes(supabase);

        // Load profile separately with error handling
        let profile = null;
        try {
            if (user?.id) {
                profile = await ProfileService.getProfile(user.id, supabase);
            }
        } catch (_profileError) {
            // This is fine - new users don't have profiles yet
        }
        return (
            <CalendarClientView
                initialEvents={[]} // No longer needed - events loaded via server-side filtering
                initialCategories={categories}
                profile={profile}
            />
        );

    } catch (error) {
        console.error('Calendar loading failed:', error);

        // Fallback to minimal calendar
        return (
            <CalendarClientView
                initialEvents={[]}
                initialCategories={[]}
                profile={null}
            />
        );
    }
}