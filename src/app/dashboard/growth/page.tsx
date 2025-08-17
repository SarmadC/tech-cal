// src/app/dashboard/growth/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { UserEventService } from '@/services/userEventService';
import GrowthClientView from './GrowthClientView';
// 1. UPDATE IMPORTS: Use the new, canonical type names.
import { TrackedEventRecord, Event } from '@/types';

// 2. UPDATE HELPER SIGNATURE: The helper function now accepts the new `TrackedEventRecord` type.
const getTopCategories = (trackedEvents: TrackedEventRecord[]) => {
    const attendedEvents = trackedEvents.filter((te: TrackedEventRecord) => te.status === 'attended');

    const categoryCount = attendedEvents.reduce((acc: Record<string, number>, te: TrackedEventRecord) => {
        if (te.event?.category?.name) {
            const categoryName = te.event.category.name;
            acc[categoryName] = (acc[categoryName] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);
};

export default async function GrowthPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login?redirect=/dashboard/growth');
    }

    // 3. UPDATE TYPE ANNOTATIONS: The local variables are now correctly typed.
    let trackedEvents: TrackedEventRecord[] = [];
    let initialOpportunities: Event[] = [];

    try {
        // These service calls now return the new types, so this works seamlessly.
        trackedEvents = await UserEventService.getTrackedEvents(user.id, supabase);

        const topCategories = getTopCategories(trackedEvents);
        const trackedEventIds = trackedEvents.map(e => e.eventId);

        if (topCategories.length > 0) {
            initialOpportunities = await EventService.getRecommendedEvents(topCategories, trackedEventIds, supabase);
        }
    } catch (error) {
        console.error("Failed to load initial data for Growth page:", error);
    }

    return (
        // The props passed here now match the updated `GrowthClientViewProps` interface.
        <GrowthClientView
            initialTrackedEvents={trackedEvents}
            initialOpportunities={initialOpportunities}
        />
    );
}