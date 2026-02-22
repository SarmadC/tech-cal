import CommunityDirectory from '@/components/social/CommunityDirectory';
import CommunityLaunchpad from '@/components/social/CommunityLaunchpad';
import { CommunityLaunchpadService } from '@/services/communityLaunchpadService';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { redirect } from 'next/navigation';

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

  if (!supabaseUrl || !serviceRoleKey) {
    return <CommunityDirectory />;
  }

  let launchpadData: Awaited<ReturnType<typeof CommunityLaunchpadService.getLaunchpadData>> | null = null;

  try {
    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    launchpadData = await CommunityLaunchpadService.getLaunchpadData({
      viewerId: user.id,
      viewerScopedClient: viewerSupabase,
      readClient: readSupabase,
    });
  } catch (error) {
    console.error('Community launchpad gate failed; falling back to directory view.', error);
  }

  if (launchpadData?.showLaunchpad) {
    return <CommunityLaunchpad data={launchpadData} />;
  }

  return <CommunityDirectory />;
}
