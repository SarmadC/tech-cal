import type { MobileEventEngagement } from '@kurecal/domain';
import { getMobileApiClient } from '@/lib/mobileApi';

type AttendanceStatus = 'attending' | 'attended' | 'cancelled';

export async function getEventEngagement(
  _userId: string,
  eventId: string
): Promise<MobileEventEngagement> {
  const result = await getMobileApiClient().getEventEngagement(eventId);
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to load event engagement.');
  }

  return result.data;
}

export async function toggleEventBookmark(
  _userId: string,
  eventId: string,
  isBookmarked: boolean
): Promise<MobileEventEngagement> {
  const result = await getMobileApiClient().updateEventEngagement(eventId, {
    isBookmarked,
  });
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to update bookmark.');
  }

  return result.data;
}

export async function updateEventAttendance(
  _userId: string,
  eventId: string,
  status: AttendanceStatus | null
): Promise<MobileEventEngagement> {
  const result = await getMobileApiClient().updateEventEngagement(eventId, {
    status,
  });
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to update attendance.');
  }

  return result.data;
}
