// src/app/calendar/page.tsx (Final Corrected Version)

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

import CalendarClientView from './CalendarClientView';
import { AppEvent, AppEventType, SupabaseEvent, SupabaseEventType } from '@/types';
import { mapSupabaseEventToAppEvent, mapSupabaseEventTypeToAppEventType } from '@/lib/dataMapper';

// Helper function for server-side data fetching
async function getInitialCalendarData(supabaseClient: SupabaseClient): Promise<{ initialEvents: AppEvent[], initialCategories: AppEventType[] }> {
    const [
        { data: eventTypesData, error: eventTypesError },
        { data: eventsData, error: eventsError },
    ] = await Promise.all([
        supabaseClient.from('event_type').select('*').order('name'),
        supabaseClient.from('events').select('*').order('start_time', { ascending: true }),
    ]);

    if (eventTypesError || eventsError) {
        console.error('Error fetching initial data:', eventTypesError || eventsError);
        return { initialEvents: [], initialCategories: [] };
    }

    const mappedEvents = (eventsData as SupabaseEvent[] || []).map(mapSupabaseEventToAppEvent);
    const mappedEventTypes = (eventTypesData as SupabaseEventType[] || []).map(cat => ({
        ...mapSupabaseEventTypeToAppEventType(cat),
        eventCount: (eventsData as SupabaseEvent[])?.filter(e => e.event_type_id === cat.id).length || 0,
    }));

    return { initialEvents: mappedEvents, initialCategories: mappedEventTypes };
}


// The page itself is an async Server Component
export default async function KureCalendarPage() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
        redirect('/login');
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

    // 2. Fetch initial data on the server
    const { initialEvents, initialCategories } = await getInitialCalendarData(supabase);

    // 3. Pass all necessary data as props to the Client Component
    return (
        <CalendarClientView
            initialEvents={initialEvents}
            initialCategories={initialCategories}
            profile={profile}
        />
    );
}