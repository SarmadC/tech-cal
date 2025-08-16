import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';

// The 'CalendarViewType' and 'SearchParams' types are no longer needed here.

export default async function CalendarPage() { // The 'searchParams' prop has been removed.
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect('/login');
    }

    try {
        // Fetch all the necessary data on the server.
        const [events, categories, profile] = await Promise.all([
            EventService.getEvents({}, supabase),
            EventTypeService.getEventTypes(supabase),
            ProfileService.getProfile(user.id, supabase),
        ]);

        // Pass the initial data to the client component, which will handle all view logic.
        return (
            <CalendarClientView
                initialEvents={events}
                initialCategories={categories}
                profile={profile}
            />
        );
    } catch (error) {
        console.error('Error loading calendar data:', error);
        // Redirect to a safe page if data fetching fails.
        redirect('/dashboard?error=calendar-load-failed');
    }
}