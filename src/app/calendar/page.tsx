// src/app/calendar/page.tsx

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import CalendarClientView from './CalendarClientView';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { profileTransformer } from '@/utils/transformers';
import { AppProfile } from '@/types';


export default async function KureCalendarPage() {
    const supabase = createServerComponentClient({ cookies });

    // 1. Check authentication on the server
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
        redirect('/login');
    }

    // 2. Fetch all initial data in parallel using our services
    const [eventsResponse, categoriesResponse, profileResponse] = await Promise.all([
        EventService.getEvents(),
        EventTypeService.getEventTypesWithCounts(),
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    ]);

    // Handle potential errors from data fetching
    if (!eventsResponse.success || !categoriesResponse.success || profileResponse.error) {
        console.error("Failed to load initial calendar data:",
            eventsResponse.error || categoriesResponse.error || profileResponse.error
        );
        // Render with empty data to prevent a crash, or render a dedicated error component.
        return (
            <CalendarClientView
                initialEvents={[]}
                initialCategories={[]}
                profile={null}
            />
        );
    }

    // Transform the raw profile data into the AppProfile shape
    const profile: AppProfile | null = profileResponse.data
        ? profileTransformer.toApp(profileResponse.data)
        : null;

    // 3. Pass the clean, application-ready data as props to the Client Component
    return (
        <CalendarClientView
            initialEvents={eventsResponse.data || []}
            initialCategories={categoriesResponse.data || []}
            profile={profile}
        />
    );
}