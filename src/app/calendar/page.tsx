// src/app/calendar/page.tsx

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import CalendarClientView from './CalendarClientView';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { profileTransformer } from '@/utils/transformers';
import { AppProfile } from '@/types';
import { Database } from '@/types/supabase'; // Import the Database type

export default async function KureCalendarPage() {
    const supabase = createServerComponentClient<Database>({ cookies });


    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
        redirect('/login');
    }

    const [eventsResponse, categoriesResponse, profileResponse] = await Promise.all([
        EventService.getEvents(undefined, supabase),
        EventTypeService.getEventTypesWithCounts(supabase),
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    ]);

    if (!eventsResponse.success || !categoriesResponse.success || profileResponse.error) {
        console.error("Failed to load initial calendar data:",
            eventsResponse.error || categoriesResponse.error || profileResponse.error
        );
        return (
            <CalendarClientView
                initialEvents={[]}
                initialCategories={[]}
                profile={null}
            />
        );
    }


    const profile: AppProfile | null = profileResponse.data
        ? profileTransformer.toApp(profileResponse.data)
        : null;


    return (
        <CalendarClientView
            initialEvents={eventsResponse.data || []}
            initialCategories={categoriesResponse.data || []}
            profile={profile}
        />
    );
}