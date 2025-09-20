// src/app/dashboard/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { UserEventService } from '@/services/userEventService';
import { EventTypeService } from '@/services/eventTypeService';
import DashboardClientView from './DashboardClientView';
// 1. UPDATE IMPORTS: Use the new, canonical type names.
import type { TrackedEventRecord, EventType, Event } from '@/types';

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login?redirect=/dashboard');
    }

    // 2. UPDATE TYPE ANNOTATIONS: The local variables are now correctly typed.
    let initialTrackedEvents: TrackedEventRecord[] = [];
    let initialEventTypes: EventType[] = [];
    let initialUpcomingEvents: Event[] = [];

    try {
        // Load data with individual error handling for better resilience
        const [trackedEventsResult, eventTypesResult, upcomingEventsResult] = await Promise.allSettled([
            UserEventService.getLightweightTrackedEvents(user.id, supabase),
            EventTypeService.getEventTypes(supabase),
            EventService.getEvents({ startDate: new Date() }, supabase, 1, 50) // Reduced page size for reliability
        ]);

        // Handle tracked events
        if (trackedEventsResult.status === 'fulfilled') {
            initialTrackedEvents = trackedEventsResult.value;
        } else {
            console.error("Failed to load tracked events:", trackedEventsResult.reason);
        }

        // Handle event types
        if (eventTypesResult.status === 'fulfilled') {
            initialEventTypes = eventTypesResult.value;
        } else {
            console.error("Failed to load event types:", eventTypesResult.reason);
        }

        // Handle upcoming events with fallback
        if (upcomingEventsResult.status === 'fulfilled') {
            initialUpcomingEvents = upcomingEventsResult.value;
        } else {
            console.error("Failed to load upcoming events:", upcomingEventsResult.reason);
            // Provide empty array as fallback instead of failing completely
            initialUpcomingEvents = [];
        }

    } catch (error) {
        console.error("Critical error loading dashboard data:", error);
        // Ensure we have fallback values
        initialTrackedEvents = [];
        initialEventTypes = [];
        initialUpcomingEvents = [];
    }

    return (
        // The props passed here now match the updated `DashboardClientViewProps` interface.
        <DashboardClientView
            initialTrackedEvents={initialTrackedEvents}
            initialEventTypes={initialEventTypes}
            initialUpcomingEvents={initialUpcomingEvents}
        />
    );
}