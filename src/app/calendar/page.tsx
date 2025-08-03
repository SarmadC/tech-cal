// src/app/calendar/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';

// This is a Server Component. It can be async.
export default async function CalendarPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // Securely redirect on the server if the user is not logged in.
        redirect('/login?redirect=/calendar');
    }

    // Fetch all necessary data in parallel on the server.
    const [
        eventsResult,
        categoriesResult,
        profileResult
    ] = await Promise.all([
        EventService.getEvents(undefined, supabase),
        EventTypeService.getEventTypesWithCounts(supabase),
        ProfileService.getProfile(user.id, supabase)
    ]);

    // Handle potential errors during the server-side fetch.
    if (!eventsResult.success || !categoriesResult.success) {
        // You can render a more sophisticated error component here.
        return <div>Error loading calendar data. Please try again later.</div>;
    }

    // Render the Client Component and pass the server-fetched data as props.
    return (
        <CalendarClientView
            initialEvents={eventsResult.data || []}
            initialCategories={categoriesResult.data || []}
            profile={profileResult.data || null}
        />
    );
}