// src/app/dashboard/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { UserEventService } from '@/services/userEventService';
import { EventTypeService } from '@/services/eventTypeService';
import DashboardClientView from './DashboardClientView'; // Import the new client component

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // --- Perform all data fetching on the server ---
    // We fetch all three data sources in parallel for maximum performance.
    const [
        trackedEventsResult,
        eventTypesResult,
        upcomingEventsResult
    ] = await Promise.all([
        UserEventService.getTrackedEvents(user.id, supabase),
        EventTypeService.getEventTypes(supabase),
        EventService.getEvents({ startDate: new Date() }, supabase)
    ]);

    // --- Pass the fetched data as props to the client component ---
    return (
        <DashboardClientView
            initialTrackedEvents={trackedEventsResult.data || []}
            initialEventTypes={eventTypesResult.data || []}
            initialUpcomingEvents={upcomingEventsResult.data || []}
        />
    );
}