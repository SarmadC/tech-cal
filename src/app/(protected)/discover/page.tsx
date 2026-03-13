// src/app/discover/page.tsx
import { createClient } from '@/utils/supabase/server';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import { EventService } from '@/services/eventServices';
import DiscoverClientView from '../../discover/DiscoverClientView';
import type { FilteredEventsData } from '@/hooks/useUnifiedServerFiltering';
import type { Event } from '@/types';

export default async function DiscoverPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        // Fetch categories and profile in parallel
        const [categories, profile] = await Promise.all([
            EventTypeService.getEventTypes(supabase),
            user?.id
                ? ProfileService.getProfile(user.id, supabase).catch(() => null)
                : Promise.resolve(null),
        ]);

        // Pre-fetch first page of events server-side to eliminate the initial client-side
        // round-trip and dramatically improve LCP. Uses stale-while-revalidate on the client.
        let initialQueryData: { success: true; data: FilteredEventsData } | undefined;
        try {
            const now = new Date();
            const events = await EventService.getEventsWithMultiDay(
                { startDate: now, status: ['approved'] },
                supabase,
                1,
                50
            );
            initialQueryData = {
                success: true,
                data: {
                    events: events as Event[],
                    pagination: {
                        page: 1,
                        pageSize: 50,
                        total: events.length,
                        hasMore: events.length === 50,
                    },
                    stats: {
                        processingTimeMs: 0,
                        filteredCount: events.length,
                        totalCount: events.length,
                    },
                    isColdStart: false,
                },
            };
        } catch {
            // Non-fatal: client will fetch on its own
        }

        return (
            <DiscoverClientView
                initialCategories={categories}
                profile={profile}
                initialQueryData={initialQueryData}
            />
        );

    } catch (error) {
        console.error('Discover page loading failed:', error);

        // Fallback to minimal discover view
        return (
            <DiscoverClientView
                initialCategories={[]}
                profile={null}
            />
        );
    }
}
