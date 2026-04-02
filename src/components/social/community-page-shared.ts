import type { CommunityNetworkingHomeData } from '@/types/community';

export interface CommunityNetworkingHomeViewModel extends CommunityNetworkingHomeData {
  isSignedIn: boolean;
}

export function resolveLegacyCommunityRedirect({
  tab,
  search,
  q,
  cursor,
}: {
  tab?: string;
  search?: string;
  q?: string;
  cursor?: string | null;
}): string | null {
  if (tab === 'circles' || tab === 'directory' || search?.trim() || q?.trim() || cursor) {
    return '/community';
  }

  return null;
}

export function formatCommunityTabCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
