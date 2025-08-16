import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { UserEventService } from '@/services/userEventService';
import { EventTypeService } from '@/services/eventTypeService';
import DashboardClientView from './DashboardClientView';
import type { AppTrackedEvent, AppEventType, AppEvent } from '@/types';

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login?redirect=/dashboard');
    }

    let initialTrackedEvents: AppTrackedEvent[] = [];
    let initialEventTypes: AppEventType[] = [];
    let initialUpcomingEvents: AppEvent[] = [];

    try {
        const [
            trackedEventsData,
            eventTypesData,
            upcomingEventsData
        ] = await Promise.all([
            // FIX: Use the lightweight function to fetch ALL tracked events efficiently for the initial server render.
            // This ensures calculations like "Total Tracked" are correct on page load.
            UserEventService.getLightweightTrackedEvents(user.id, supabase),

            EventTypeService.getEventTypes(supabase),

            // We can also apply pagination here for the initial load of upcoming events.
            EventService.getEvents({ startDate: new Date() }, supabase, 1, 100)
        ]);

        initialTrackedEvents = trackedEventsData;
        initialEventTypes = eventTypesData;
        initialUpcomingEvents = upcomingEventsData;

    } catch (error) {
        console.error("Failed to load initial dashboard data:", error);
        // Gracefully handle server-side errors by passing empty arrays.
        // The client component will then show its own error or empty state.
    }

    return (
        <DashboardClientView
            initialTrackedEvents={initialTrackedEvents}
            initialEventTypes={initialEventTypes}
            initialUpcomingEvents={initialUpcomingEvents}
        />
    );
}