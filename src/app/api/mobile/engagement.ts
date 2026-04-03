import type { MobileEventEngagement } from '@kurecal/domain';

import type { SupabaseClientType, TrackedEventRecord } from '@/types';

export function engagementFromTrackedEvent(
  record: TrackedEventRecord
): MobileEventEngagement {
  return {
    isBookmarked: record.isBookmarked,
    status: record.status,
  };
}

export async function loadEngagementMap(
  supabaseClient: SupabaseClientType,
  userId: string,
  eventIds: string[]
): Promise<Map<string, MobileEventEngagement>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseClient
    .from('user_events')
    .select('event_id, is_bookmarked, status')
    .eq('user_id', userId)
    .in('event_id', eventIds);

  if (error) {
    throw error;
  }

  function normalizeStatus(
    status: string | null
  ): MobileEventEngagement['status'] {
    if (
      status === 'attending' ||
      status === 'attended' ||
      status === 'cancelled'
    ) {
      return status;
    }

    return null;
  }

  return new Map(
    (data ?? []).map(
      (row: {
        event_id: string;
        is_bookmarked: boolean | null;
        status: string | null;
      }) => [
        row.event_id,
        {
          isBookmarked: row.is_bookmarked ?? false,
          status: normalizeStatus(row.status),
        },
      ]
    )
  );
}
