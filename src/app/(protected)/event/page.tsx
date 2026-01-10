import { createClient } from '@/utils/supabase/server';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import EventListView from '@/components/events/EventListView';

export default async function EventsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const [categories, profile, locationResult] = await Promise.all([
        EventTypeService.getEventTypes(supabase),
        ProfileService.getProfile(user.id, supabase).catch(() => null),
        supabase
            .from('events')
            .select('location')
            .not('location', 'is', null)
            .order('location', { ascending: true })
            .limit(500),
    ]);

    const locations = Array.from(
        new Set(
            (locationResult.data ?? [])
                .map((record) => record.location as string | null)
                .filter((value): value is string => Boolean(value?.trim())),
        ),
    );

    return (
        <EventListView
            initialCategories={categories}
            profile={profile}
            locationOptions={locations}
        />
    );
}

