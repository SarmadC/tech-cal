import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import EventListView from '@/components/events/EventListView';

export const metadata: Metadata = {
    title: 'Discover Events',
    description: 'Browse and filter formatted technical events',
};

// Revalidate every hour
export const revalidate = 3600;

async function getLocations() {
    const supabase = await createClient();
    // We can't easily get *distinct* values efficiently without a dedicated RPC or improved query, 
    // but for now let's try to get them from a simple query or just fetch active events and extract.
    // Actually, `rpc('get_event_locations')` would be ideal if it existed.
    // Let's rely on fetching a list of active events' locations to populate this, 
    // OR just pass empty if too complex, but better to have some.
    // A simple approach:
    const { data } = await supabase
        .from('events')
        .select('location')
        .eq('status', 'confirmed')
        .not('location', 'is', null)
        // limit to recent/future events to keep list relevant? 
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

    if (!data) return [];

    // Client-side unique because Supabase .select('distinct') isn't standard in JS client the same way
    // actually .select('location', { count: 'exact', head: false }) isn't distinct.
    // We process in JS:
    const locations = Array.from(new Set(data.map(d => d.location).filter(l => l) as string[]));
    return locations.sort();
}

export default async function EventsPage() {
    const supabase = await createClient();

    // Parallel data fetching
    const [
        categories,
        { data: { user } },
    ] = await Promise.all([
        EventTypeService.getEventTypesWithCounts(supabase),
        supabase.auth.getUser(),
    ]);

    let profile = null;
    if (user) {
        try {
            profile = await ProfileService.getProfile(user.id, supabase);
        } catch (error) {
            console.error('Failed to fetch profile for events page:', error);
            // Continue without profile
        }
    }

    // Fetch locations separately or logic here
    const locationOptions = await getLocations();

    return (
        <EventListView
            initialCategories={categories}
            profile={profile}
            locationOptions={locationOptions}
        />
    );
}
