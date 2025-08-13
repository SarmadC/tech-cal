// src/app/calendar/page.tsx (Final Version)

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';
import { DayViewClientWrapper } from './DayViewClientWrapper';


export default async function CalendarPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login?redirect=/calendar');
    }

    const view = searchParams.view || 'month';

    // ========================================================================
    // RENDER THE DAY VIEW (Using the Wrapper)
    // ========================================================================
    if (view === 'day') {
        const dateParam = searchParams.date as string | undefined;
        // Parse date from URL or default to today. Add robust checking.
        const currentDate = dateParam && !isNaN(new Date(dateParam).getTime())
            ? new Date(dateParam)
            : new Date();

        const startOfDay = new Date(currentDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const eventsForDay = await EventService.getEvents(
            { startDate: startOfDay, endDate: endOfDay },
            supabase
        );

        return (
            <DayViewClientWrapper
                initialDate={currentDate}
                initialEvents={eventsForDay}
            />
        );
    }

    // ========================================================================
    // RENDER THE DEFAULT MONTH/WEEK VIEW (This logic is unchanged)
    // ========================================================================
    const [eventsData, categoriesData, profileData] = await Promise.allSettled([
        EventService.getEvents({}, supabase),
        EventTypeService.getEventTypes(supabase),
        ProfileService.getProfile(user.id, supabase)
    ]);

    const events = eventsData.status === 'fulfilled' ? eventsData.value : [];
    const categories = categoriesData.status === 'fulfilled' ? categoriesData.value : [];
    const profile = profileData.status === 'fulfilled' ? profileData.value : null;

    return (
        <CalendarClientView
            initialEvents={events}
            initialCategories={categories}
            profile={profile}
        />
    );
}