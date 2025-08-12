// src/app/calendar/page.tsx (Updated)
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';
import type { AppEvent, AppEventType, AppProfile } from '@/types';

export default async function CalendarPage() {
    console.log('Calendar page: Checking authentication...');
    
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        console.log('Calendar page: No user found, redirecting to login');
        redirect('/login?redirect=/calendar');
    }

    console.log('Calendar page: User authenticated:', user.email);

    // Define variables to hold our data
    let events: AppEvent[] = [];
    let categories: AppEventType[] = [];
    let profile: AppProfile | null = null;

    try {
        console.log('Calendar page: Fetching data...');
        
        // Fetch all necessary data in parallel on the server.
        const [eventsData, categoriesData, profileData] = await Promise.allSettled([
            EventService.getEvents({}, supabase),
            EventTypeService.getEventTypes(supabase),
            ProfileService.getProfile(user.id, supabase)
        ]);

        // Handle events
        if (eventsData.status === 'fulfilled') {
            events = eventsData.value;
            console.log('Calendar page: Loaded', events.length, 'events');
        } else {
            console.error('Calendar page: Failed to load events:', eventsData.reason);
        }

        // Handle categories  
        if (categoriesData.status === 'fulfilled') {
            categories = categoriesData.value;
            console.log('Calendar page: Loaded', categories.length, 'categories');
        } else {
            console.error('Calendar page: Failed to load categories:', categoriesData.reason);
        }

        // Handle profile
        if (profileData.status === 'fulfilled') {
            profile = profileData.value;
            console.log('Calendar page: Loaded profile for:', profile?.fullName);
        } else {
            console.warn('Calendar page: Profile not found, user might be new:', profileData.reason);
            // This is okay for new users who haven't set up their profile yet
        }

    } catch (error) {
        console.error('Calendar page: Unexpected error during data fetching:', error);
        // We can still render the client component with empty data
        // The client component will handle showing appropriate error states
    }

    console.log('Calendar page: Rendering with data - Events:', events.length, 'Categories:', categories.length, 'Profile:', !!profile);

    // Render the Client Component and pass the server-fetched data as props.
    return (
        <CalendarClientView
            initialEvents={events}
            initialCategories={categories}
            profile={profile}
        />
    );
}