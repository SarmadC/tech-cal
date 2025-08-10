// src/app/calendar/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';
import type { AppEvent, AppEventType, AppProfile } from '@/types'; // Import types for clarity

export default async function CalendarPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login?redirect=/calendar');
    }
    
    // Define variables to hold our data
    let initialEvents: AppEvent[] = [];
    let initialCategories: AppEventType[] = [];
    let profile: AppProfile | null = null;

    try {
        // Fetch all necessary data in parallel on the server.
        // If any of these promises reject (throw an error), the Promise.all will reject,
        // and the catch block will be executed.
        const [
            eventsData,
            categoriesData,
            profileData
        ] = await Promise.all([
            EventService.getEvents(undefined, supabase),
            EventTypeService.getEventTypesWithCounts(supabase),
            ProfileService.getProfile(user.id, supabase)
        ]);
        
        // If successful, assign the data to our variables.
        initialEvents = eventsData;
        initialCategories = categoriesData;
        profile = profileData;

    } catch (error) {
        // If any of the fetches failed, log the error on the server and show an error UI.
        console.error("Failed to load initial calendar data:", error);
        // This will be rendered on the server and sent to the client as static HTML.
        return <div>Error loading calendar data. Please refresh the page.</div>;
    }

    // Render the Client Component and pass the server-fetched data as props.
    // The `|| []` and `|| null` fallbacks are no longer strictly necessary due to the try/catch,
    // but they are good practice for ensuring the props are always the correct type.
    return (
        <CalendarClientView
            initialEvents={initialEvents || []}
            initialCategories={initialCategories || []}
            profile={profile || null}
        />
    );
}