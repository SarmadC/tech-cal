// src/app/calendar/page.tsx (Refactored to use Services)

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

import CalendarClientView from './CalendarClientView';
// The service layer is now the primary way to interact with data
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { profileTransformer } from '@/utils/transformers'; // To map the profile
import { AppProfile } from '@/types'; // Import the AppProfile type

// The helper function is no longer needed here, as the logic now lives in the services.

// The page itself is an async Server Component
export default async function KureCalendarPage() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // 1. Check authentication on the server
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
        redirect('/login');
    }

    // 2. Fetch all initial data in parallel using our new services
    const [eventsResponse, categoriesResponse, profileResponse] = await Promise.all([
        EventService.getEvents(), // Gets all events, already enriched
        EventTypeService.getEventTypesWithCounts(), // Gets categories with counts
        supabase.from('profiles').select('*').eq('id', session.user.id).single(), // Fetch raw profile
    ]);

    // Handle potential errors from data fetching
    if (!eventsResponse.success || !categoriesResponse.success || profileResponse.error) {
        // You can render a dedicated error component here for a better user experience
        console.error("Failed to load initial calendar data:",
            eventsResponse.error || categoriesResponse.error || profileResponse.error
        );
        // For now, we'll pass empty arrays to prevent a crash.
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