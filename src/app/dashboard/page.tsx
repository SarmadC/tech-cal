// src/app/dashboard/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { UserEventService } from '@/services/userEventService';
import { EventTypeService } from '@/services/eventTypeService';
import DashboardClientView from './DashboardClientView';
import type { AppTrackedEvent, AppEventType, AppEvent } from '@/types'; // Import types

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login?redirect=/dashboard'); // Add redirect param for better UX
    }

    // --- CHANGED SECTION START ---
    let initialTrackedEvents: AppTrackedEvent[] = [];
    let initialEventTypes: AppEventType[] = [];
    let initialUpcomingEvents: AppEvent[] = [];

    try {
        // Fetch all three data sources in parallel.
        // If any fail, the catch block will execute.
        const [
            trackedEventsData,
            eventTypesData,
            upcomingEventsData
        ] = await Promise.all([
            UserEventService.getTrackedEvents(user.id, supabase),
            EventTypeService.getEventTypes(supabase),
            EventService.getEvents({ startDate: new Date() }, supabase)
        ]);
        
        // Assign data on success
        initialTrackedEvents = trackedEventsData;
        initialEventTypes = eventTypesData;
        initialUpcomingEvents = upcomingEventsData;

    } catch (error) {
        console.error("Failed to load initial dashboard data:", error);
        // In case of a data fetching error on the server, we can still render the client component.
        // We will pass it empty arrays, and it will show its own error or empty state.
        // This is a graceful way to handle server-side data fetching failures.
    }
    // --- CHANGED SECTION END ---

    // --- Pass the fetched data as props to the client component ---
    return (
        <DashboardClientView
            initialTrackedEvents={initialTrackedEvents}
            initialEventTypes={initialEventTypes}
            initialUpcomingEvents={initialUpcomingEvents}
        />
    );
}