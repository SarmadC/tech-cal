import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { SITE_URL } from '@/config/site';
import AdaptiveCommunityPage from '@/components/social/AdaptiveCommunityPage';
import CommunityAppShell from '@/components/layout/CommunityAppShell';
import { resolveLegacyCommunityRedirect } from '@/components/social/community-page-shared';
import { CommunityNetworkingHomeService } from '@/services/communityNetworkingHomeService';

interface CommunityPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getSingleParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: 'Community | Kure-Cal',
  description:
    'See which events are best for meeting people, who you can meet there, and who to follow up with after.',
  alternates: {
    canonical: `${SITE_URL}/community`,
  },
};

export default async function CommunityPage({
  searchParams,
}: CommunityPageProps) {
  const resolvedSearchParams = await searchParams;
  const legacyRedirect = resolveLegacyCommunityRedirect({
    tab: getSingleParam(resolvedSearchParams?.tab),
    search: getSingleParam(resolvedSearchParams?.search),
    q: getSingleParam(resolvedSearchParams?.q),
    cursor: getSingleParam(resolvedSearchParams?.cursor) || null,
  });

  if (legacyRedirect) {
    redirect(legacyRedirect);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Community feed is not configured.');
  }

  const viewerSupabase = await createClient();
  const {
    data: { user },
  } = await viewerSupabase.auth.getUser();

  const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const homeData = user
    ? await CommunityNetworkingHomeService.getHomeData({
        viewerId: user.id,
        readClient: readSupabase,
      })
    : CommunityNetworkingHomeService.createEmptyData(false);

  const viewModel = {
    isSignedIn: Boolean(user),
    ...homeData,
  };

  return (
    <CommunityAppShell>
      <AdaptiveCommunityPage viewModel={viewModel} />
    </CommunityAppShell>
  );
}
