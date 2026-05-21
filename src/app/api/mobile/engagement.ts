import type { MobileEventEngagement } from '@kurecal/domain';

import type { SupabaseClientType, TrackedEventRecord } from '@/types';

export function engagementFromTrackedEvent(
  record: TrackedEventRecord
): MobileEventEngagement {
  const calendarSync = buildGoogleCalendarSyncState(record);

  return {
    isBookmarked: record.isBookmarked,
    status: record.status,
    ...(calendarSync ? { calendarSync } : {}),
  };
}

function buildGoogleCalendarSyncState(
  record: TrackedEventRecord | {
    calendar_sync_status?: string | null;
    calendar_synced_at?: string | null;
    external_calendar_event_id?: string | null;
    external_provider?: string | null;
  }
): MobileEventEngagement['calendarSync'] | null {
  const rawRecord = record as {
    calendar_sync_status?: string | null;
    calendar_synced_at?: string | null;
    external_calendar_event_id?: string | null;
    external_provider?: string | null;
  };

  if (rawRecord.external_provider && rawRecord.external_provider !== 'google') {
    return null;
  }

  const status =
    rawRecord.calendar_sync_status === 'synced'
      ? 'synced'
      : rawRecord.calendar_sync_status === 'failed'
        ? 'failed'
        : rawRecord.external_calendar_event_id
          ? 'synced'
          : null;

  if (!status && !rawRecord.external_calendar_event_id) {
    return null;
  }

  return {
    provider: 'google',
    status: status ?? 'connected',
    syncedAt: rawRecord.calendar_synced_at ?? null,
    externalEventId: rawRecord.external_calendar_event_id ?? null,
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
    .select(
      'event_id, is_bookmarked, status, calendar_sync_status, calendar_synced_at, external_calendar_event_id, external_provider'
    )
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
        calendar_sync_status: string | null;
        calendar_synced_at: string | null;
        external_calendar_event_id: string | null;
        external_provider: string | null;
      }) => [
        row.event_id,
        {
          isBookmarked: row.is_bookmarked ?? false,
          status: normalizeStatus(row.status),
          calendarSync: buildGoogleCalendarSyncState(row),
        },
      ]
    )
  );
}
