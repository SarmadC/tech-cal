// src/app/discover/page.tsx
import { createClient } from '@/utils/supabase/server';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import { CareerProfileService } from '@/services/careerProfileService';
import DiscoverClientView from '../../discover/DiscoverClientView';
import type { FilteredEventsData } from '@/types';
import {
    buildUserLocationFromProfileContext,
    loadFilteredEventsData,
    normalizeFilteredEventsRequest,
} from '@/services/filteredEventsService';
import { getDiscoverDefaultSort } from '@/utils/discoverDefaults';

export default async function DiscoverPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const [categories, profile, profileContext, careerProfile] = await Promise.all([
            EventTypeService.getEventTypes(supabase),
            user?.id
                ? ProfileService.getProfile(user.id, supabase).catch(() => null)
                : Promise.resolve(null),
            user?.id
                ? (async () => {
                    try {
                        const { data } = await supabase
                            .from('profiles')
                            .select('preferences, timezone, location')
                            .eq('id', user.id)
                            .single();
                        return data;
                    } catch {
                        return null;
                    }
                })()
                : Promise.resolve(null),
            user?.id
                ? CareerProfileService.getCareerProfile(user.id, supabase).catch(() => null)
                : Promise.resolve(null),
        ]);

        const discoverDefaultSort = getDiscoverDefaultSort(profile);
        let initialQueryData: { success: true; data: FilteredEventsData } | undefined;

        if (user?.id) {
            try {
                const normalizedRequest = normalizeFilteredEventsRequest({
                    ...discoverDefaultSort,
                    page: 1,
                    pageSize: 50,
                    surface: 'discover',
                });

                const data = await loadFilteredEventsData({
                    request: normalizedRequest,
                    supabase,
                    userId: user.id,
                    careerProfile,
                    userLocation: buildUserLocationFromProfileContext(profileContext),
                    requestId: 'discover-ssr',
                    skipColdStart: false,
                });

                initialQueryData = { success: true, data };
            } catch {
                // Non-fatal: client will fetch on its own
            }
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
