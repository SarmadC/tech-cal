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
        const [
            trackedEventsData,
            eventTypesData,
            upcomingEventsData
        ] = await Promise.all([
            // These service calls now return the new types, so this works seamlessly.
            UserEventService.getLightweightTrackedEvents(user.id, supabase),
            EventTypeService.getEventTypes(supabase),
            EventService.getEvents({ startDate: new Date() }, supabase, 1, 100)
        ]);

        initialTrackedEvents = trackedEventsData;
        initialEventTypes = eventTypesData;
        initialUpcomingEvents = upcomingEventsData;

    } catch (error) {
        console.error("Failed to load initial dashboard data:", error);
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