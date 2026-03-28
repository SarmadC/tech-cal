import type { MobileEventEngagement } from '@kurecal/domain';
import type { SupabaseClientType, TrackedEventRecord } from '@/types';

export function engagementFromTrackedEvent(record: TrackedEventRecord): MobileEventEngagement {
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

  const { data, error } = await (supabaseClient as any)
    .from('user_events')
    .select('event_id, is_bookmarked, status')
    .eq('user_id', userId)
    .in('event_id', eventIds);

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((row: { event_id: string; is_bookmarked: boolean; status: MobileEventEngagement['status'] }) => [
      row.event_id,
      {
        isBookmarked: row.is_bookmarked ?? false,
        status: row.status ?? null,
      },
    ])
  );
}
