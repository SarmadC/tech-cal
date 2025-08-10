// src/app/dashboard/growth/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { UserEventService } from '@/services/userEventService';
import GrowthClientView from './GrowthClientView';
import { AppTrackedEvent, AppEvent } from '@/types';

const getTopCategories = (trackedEvents: AppTrackedEvent[]) => {
    const attendedEvents = trackedEvents.filter((te: AppTrackedEvent) => te.status === 'attended');

    const categoryCount = attendedEvents.reduce((acc: Record<string, number>, te: AppTrackedEvent) => {
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

    // --- CHANGED SECTION START ---
    let trackedEvents: AppTrackedEvent[] = [];
    let initialOpportunities: AppEvent[] = [];

    try {
        // Service now returns data directly or throws.
        trackedEvents = await UserEventService.getTrackedEvents(user.id, supabase);

        const topCategories = getTopCategories(trackedEvents);
        const trackedEventIds = trackedEvents.map(e => e.eventId);

        if (topCategories.length > 0) {
            // Service now returns data directly or throws.
            initialOpportunities = await EventService.getRecommendedEvents(topCategories, trackedEventIds, supabase);
        }
    } catch (error) {
        console.error("Failed to load initial data for Growth page:", error);
        // We will pass empty arrays to the client component.
        // The client component's useQuery hooks will attempt to refetch and can show their own error state.
    }
    // --- CHANGED SECTION END ---

    return (
        <GrowthClientView
            initialTrackedEvents={trackedEvents}
            initialOpportunities={initialOpportunities}
        />
    );
}