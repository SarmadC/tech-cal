// src/app/calendar/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';
import { TechCalendarDayView } from '@/components/calendar/TechCalendarDayView';

type CalendarViewType = 'month' | 'week' | 'day';

interface SearchParams {
    view?: string;
    date?: string;
    [key: string]: string | string[] | undefined;
}

export default async function CalendarPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect('/login');
    }

    // Await the searchParams Promise
    const params = await searchParams;
    const view = (params.view as CalendarViewType) || 'month';
    const dateParam = params.date as string;
    const currentDate = dateParam ? new Date(dateParam) : new Date();

    try {
        // Fetch data in parallel
        const [events, categories, profile] = await Promise.all([
            EventService.getEvents({}, supabase),
            EventTypeService.getEventTypes(supabase),
            ProfileService.getProfile(user.id, supabase),
        ]);

        // Special handling for day view
        if (view === 'day') {
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);

            const dayEvents = events.filter(event => {
                const eventStart = new Date(event.startTime);
                return eventStart >= dayStart && eventStart <= dayEnd;
            });

            return (
                <TechCalendarDayView
                    events={dayEvents}
                    initialDate={currentDate}
                />
            );
        }

        // Default calendar view
        return (
            <CalendarClientView
                initialEvents={events}
                initialCategories={categories}
                profile={profile}
            />
        );
    } catch (error) {
        console.error('Error loading calendar:', error);
        redirect('/dashboard');
    }
}