// src/app/calendar/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';

export default async function CalendarPage() {
    const supabase = await createClient();
    const { data: { user }, error: _authError } = await supabase.auth.getUser();

    // Re-enable authentication
    if (_authError || !user) {
        redirect('/login');
    }

    try {
        // Load events with robust fallback, then categories
        let events = [] as Awaited<ReturnType<typeof EventService.getEventsWithAgendaAndMultiDaySupport>>;
        try {
            events = await EventService.getEventsWithAgendaAndMultiDaySupport({}, supabase);
        } catch (_err) {
            // Fallback to simpler queries if the combined join fails
            try {
                events = await EventService.getEventsWithMultiDaySupport({}, supabase);
            } catch (__err) {
                // Convert basic events to MultiDayEvent format for consistency
                const basicEvents = await EventService.getEvents({}, supabase);
                events = basicEvents.map(event => ({
                    ...event,
                    isMultiDay: false,
                    eventPattern: 'single' as const,
                    agenda: undefined
                }));
            }
        }

        const categories = await EventTypeService.getEventTypes(supabase);

        // Load profile separately with error handling
        let profile = null;
        try {
            if (user?.id) {
                profile = await ProfileService.getProfile(user.id, supabase);
            }
        } catch (_profileError) {
            // This is fine - new users don't have profiles yet
        }

        return (
            <CalendarClientView
                initialEvents={events}
                initialCategories={categories}
                profile={profile}
            />
        );

    } catch (error) {
        console.error('Calendar loading failed:', error);

        // Fallback to minimal calendar
        return (
            <CalendarClientView
                initialEvents={[]}
                initialCategories={[]}
                profile={null}
            />
        );
    }
}