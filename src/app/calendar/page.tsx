import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';

export default async function CalendarPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    try {
        const [events, categories, profile] = await Promise.all([
            EventService.getEventsWithMultiDaySupport({}, supabase), // ← THIS EXACT LINE
            EventTypeService.getEventTypes(supabase),
            ProfileService.getProfile(user.id, supabase),
        ]);

        // Pass the initial data to the client component
        return (
            <CalendarClientView
                initialEvents={events}
                initialCategories={categories}
                profile={profile}
            />
        );
    } catch (error) {
        console.error('Error loading calendar data:', error);
        redirect('/dashboard?error=calendar-load-failed');
    }
}