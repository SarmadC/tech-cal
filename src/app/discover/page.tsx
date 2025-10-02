// src/app/discover/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import DiscoverClientView from './DiscoverClientView';

export default async function DiscoverPage() {
    const supabase = await createClient();
    const { data: { user }, error: _authError } = await supabase.auth.getUser();

    // Re-enable authentication
    if (_authError || !user) {
        redirect('/login?redirect=/discover');
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

        return (
            <DiscoverClientView
                initialCategories={categories}
                profile={profile}
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
