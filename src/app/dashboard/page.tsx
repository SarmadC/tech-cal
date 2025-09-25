// src/app/dashboard/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { UserEventService } from '@/services/userEventService';
import DashboardClientView from './DashboardClientView';

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login?redirect=/dashboard');
    }

    // Fetch dashboard data server-side to prevent redundant client-side fetching
    const [eventTypesResult, upcomingEventsResult, trackedEventsResult] = await Promise.allSettled([
        EventTypeService.getEventTypes(supabase),
        EventService.getEvents({ startDate: new Date() }, supabase, 1, 100),
        UserEventService.getLightweightTrackedEvents(user.id, supabase)
    ]);

    // Extract data or use empty arrays as fallbacks
    const initialEventTypes = eventTypesResult.status === 'fulfilled' ? eventTypesResult.value : [];
    const initialUpcomingEvents = upcomingEventsResult.status === 'fulfilled' ? upcomingEventsResult.value : [];
    const initialTrackedEvents = trackedEventsResult.status === 'fulfilled' ? trackedEventsResult.value : [];

    return (
        <DashboardClientView
            initialEventTypes={initialEventTypes}
            initialUpcomingEvents={initialUpcomingEvents}
            initialTrackedEvents={initialTrackedEvents}
        />
    );
}