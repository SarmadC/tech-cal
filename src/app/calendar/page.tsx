import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';
// Import the Client Wrapper, which will handle the Day View logic
import { DayViewClientWrapper } from './DayViewClientWrapper';

type CalendarViewType = 'month' | 'week' | 'day';

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

    // FIX for TypeScript errors: Access properties directly.
    const view = (searchParams.view as CalendarViewType) || 'month';
    const dateParam = searchParams.date as string | undefined;

    // ========================================================================
    // RENDER THE DAY VIEW (Using the Wrapper)
    // ========================================================================
    if (view === 'day') {
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

        // FIX for missing props: Render the wrapper which provides the props.
        return (
            <DayViewClientWrapper
                initialDate={currentDate}
                initialEvents={eventsForDay}
            />
        );
    }

    // ========================================================================
    // RENDER THE DEFAULT MONTH/WEEK VIEW
    // ========================================================================

    // Default to Month/Week view - No changes needed to the data fetching
    const [eventsData, categoriesData, profileData] = await Promise.allSettled([
        EventService.getEvents({}, supabase),
        EventTypeService.getEventTypes(supabase),
        ProfileService.getProfile(user.id, supabase)
    ]);
    const events = eventsData.status === 'fulfilled' ? eventsData.value : [];
    const categories = categoriesData.status === 'fulfilled' ? categoriesData.value : [];
    const profile = profileData.status === 'fulfilled' ? profileData.value : null;

    // This component will handle its own logic for displaying the month/week
    return (
        <CalendarClientView
            initialEvents={events}
            initialCategories={categories}
            profile={profile}
        />
    );
}