// src/app/calendar/page.tsx
import { createClient } from '@/utils/supabase/server';
// import { redirect } from 'next/navigation';  // Commented out but kept for easy re-enabling
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from './CalendarClientView';

export default async function CalendarPage() {
    console.log('🏗️ Calendar page loading...');

    const supabase = await createClient();
    const { data: { user }, error: _authError } = await supabase.auth.getUser();

    // Temporarily disable auth for debugging
    // if (_authError || !user) {
    //     console.log('❌ Auth failed, redirecting to login');
    //     redirect('/login');
    // }

    console.log('✅ User authenticated (or debug mode):', user?.email || 'no user');

    try {
        // Load events and categories (these should work)
        console.log('📅 Loading events and categories...');
        const [events, categories] = await Promise.all([
            EventService.getEventsWithMultiDaySupport({}, supabase),
            EventTypeService.getEventTypes(supabase),
        ]);

        console.log('✅ Events and categories loaded:', {
            events: events.length,
            categories: categories.length
        });

        // Load profile separately with error handling
        console.log('👤 Loading profile...');
        let profile = null;
        try {
            if (user?.id) {
                profile = await ProfileService.getProfile(user.id, supabase);
                console.log('✅ Profile loaded:', profile?.fullName);
            } else {
                console.log('⚠️ No user ID for profile loading (debug mode)');
            }
        } catch (profileError) {
            console.log('⚠️ Profile not found (normal for new users):', (profileError as Error).message);
            // This is fine - new users don't have profiles yet
        }

        console.log('🎉 Calendar ready to render');

        return (
            <CalendarClientView
                initialEvents={events}
                initialCategories={categories}
                profile={profile}
            />
        );

    } catch (error) {
        console.error('💥 Calendar loading failed:', error);

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