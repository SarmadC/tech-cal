import type { AppProfile } from '@/types';

import { isProfileEmpty } from '@/utils/profileTypeGuards';

export interface DiscoverDefaultSort {
  sortBy: 'career-impact' | 'popularity';
  sortDirection: 'desc' | 'asc';
}

export function getDiscoverDefaultSort(profile: AppProfile | null): DiscoverDefaultSort {
  if (profile && !isProfileEmpty(profile)) {
    return {
      sortBy: 'career-impact',
      sortDirection: 'desc',
    };
  }

  return {
    sortBy: 'popularity',
    sortDirection: 'asc',
  };
}
