// src/app/dashboard/growth/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { UserEventService } from '@/services/userEventService';
import GrowthClientView from './GrowthClientView';
import { AppTrackedEvent } from '@/types';

const getTopCategories = (trackedEvents: AppTrackedEvent[]) => {
    const attendedEvents = trackedEvents.filter(te => te.status === 'attended');

    const categoryCount = attendedEvents.reduce((acc, te) => {
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

    const trackedEventsResult = await UserEventService.getTrackedEvents(user.id, supabase);
    const trackedEvents = trackedEventsResult.data || [];

    const topCategories = getTopCategories(trackedEvents);
    const trackedEventIds = trackedEvents.map(e => e.eventId);

    let opportunitiesResult;
    if (topCategories.length > 0) {
        opportunitiesResult = await EventService.getRecommendedEvents(topCategories, trackedEventIds, supabase);
    }

    return (
        <GrowthClientView
            initialTrackedEvents={trackedEvents}
            initialOpportunities={opportunitiesResult?.data || []}
        />
    );
}