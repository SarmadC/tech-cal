// src/app/calendar/page.tsx

// This route needs dynamic rendering for user authentication and data fetching
export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
// EventService no longer needed - using server-side filtering
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import CalendarClientView from '../../calendar/CalendarClientView';

export default async function CalendarPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Enforce view parameter - redirect to month view if missing
    const params = await searchParams;
    const view = params.view;
    if (!view) {
        redirect('/calendar?view=month');
    }

    // Redirect discover view to the dedicated discover page
    if (view === 'discover') {
        redirect('/events');
    }

    try {
        // Load categories for filter options
        const categories = await EventTypeService.getEventTypes(supabase);

        // Load profile separately with error handling
        let profile = null;
        try {
            if (user?.id) {
                profile = await ProfileService.getProfile(user.id, supabase);
            }
        } catch (_profileError) {
            // This is fine - new users don't have profiles yet
        }

        // Parse search params into initial filters
        const parseArrayParam = (param: string | string[] | undefined) =>
            param ? (Array.isArray(param) ? param : param.split(',')) : [];

        const tags = parseArrayParam(params.tags);
        if (params.circle) {
            tags.push(Array.isArray(params.circle) ? params.circle[0] : params.circle);
        }

        const initialFilters = {
            categories: parseArrayParam(params.categories),
            tags: tags.length > 0 ? tags : undefined,
            locations: parseArrayParam(params.locations),
            format: typeof params.format === 'string' ? params.format : undefined,
            cost: typeof params.cost === 'string' ? params.cost : undefined,
            difficulty: typeof params.difficulty === 'string' ? params.difficulty : undefined,
            budget: typeof params.budget === 'string' ? params.budget : undefined,
        };

        return (
            <CalendarClientView
                initialEvents={[]} // No longer needed - events loaded via server-side filtering
                initialCategories={categories}
                profile={profile}
                initialFilters={initialFilters}
            />
        );

    } catch (error) {
        console.error('Calendar loading failed:', error);

        // Fallback to minimal calendar
        return (
            <CalendarClientView
                initialEvents={[]}
                initialCategories={[]}
                profile={null}
                initialFilters={{}}
            />
        );
    }
}
