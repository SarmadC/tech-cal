import CommunityHub from '@/components/social/CommunityHub';
import { CommunityHubService } from '@/services/communityHubService';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { redirect } from 'next/navigation';
import type { CommunityHubData } from '@/types/community';

export default async function CommunityPage() {
    const viewerSupabase = await createClient();
    const {
        data: { user },
    } = await viewerSupabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let hubData: CommunityHubData | null = null;

    if (supabaseUrl && serviceRoleKey) {
        try {
            const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
            hubData = await CommunityHubService.getHubData({
                viewerId: user.id,
                viewerScopedClient: viewerSupabase,
                readClient: readSupabase,
            });
        } catch (error) {
            console.error('Community hub data fetch failed:', error);
        }
    }

    // Provide fallback empty data if fetch failed
    const data: CommunityHubData = hubData || {
        feed: [],
        circles: [],
        progress: {
            completionPercent: 0,
            completedWeight: 0,
            totalWeight: 100,
            tasks: [],
        },
        upcomingEvents: [],
        suggestedMembers: [],
    };

    return <CommunityHub data={data} />;
}
