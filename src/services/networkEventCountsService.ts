import type { SupabaseClientType } from '@/types';
import { BlockService } from '@/services/blockService';

export interface NetworkEventCountResult {
  eventId: string;
  networkCount: number;
  sampleAvatars: string[];
}

const MAX_SAMPLE_AVATARS = 3;

export class NetworkEventCountsService {
  static async getNetworkCountsForEvents(
    viewerId: string,
    eventIds: string[],
    supabaseClient: SupabaseClientType
  ): Promise<NetworkEventCountResult[]> {
    const uniqueEventIds = Array.from(new Set(eventIds));
    if (uniqueEventIds.length === 0) {
      return [];
    }

    const { data: followRows, error: followError } = await supabaseClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', viewerId);

    if (followError) {
      throw new Error('Failed to fetch follow graph.');
    }

    const followedUserIds = Array.from(
      new Set((followRows || []).map((row) => row.following_id))
    );

    if (followedUserIds.length === 0) {
      return uniqueEventIds.map((eventId) => ({
        eventId,
        networkCount: 0,
        sampleAvatars: [],
      }));
    }

    const blockedIds = await BlockService.getBlockedUserIdsForViewer(
      viewerId,
      followedUserIds,
      supabaseClient
    );

    const visibleFollowIds = followedUserIds.filter((userId) => !blockedIds.has(userId));
    if (visibleFollowIds.length === 0) {
      return uniqueEventIds.map((eventId) => ({
        eventId,
        networkCount: 0,
        sampleAvatars: [],
      }));
    }

    const { data: publicProfileRows, error: publicProfilesError } = await supabaseClient
      .from('profiles')
      .select('id, avatar_url')
      .in('id', visibleFollowIds)
      .eq('show_attendance', true)
      .eq('profile_visibility', 'public');

    if (publicProfilesError) {
      throw new Error('Failed to fetch public network profiles.');
    }

    const publicUserIds = (publicProfileRows || []).map((row) => row.id);
    if (publicUserIds.length === 0) {
      return uniqueEventIds.map((eventId) => ({
        eventId,
        networkCount: 0,
        sampleAvatars: [],
      }));
    }

    const avatarByUserId = new Map<string, string>(
      (publicProfileRows || [])
        .filter((row) => Boolean(row.avatar_url))
        .map((row) => [row.id, row.avatar_url as string])
    );

    const { data: attendanceRows, error: attendanceError } = await supabaseClient
      .from('user_events')
      .select('event_id, user_id')
      .eq('status', 'attending')
      .in('event_id', uniqueEventIds)
      .in('user_id', publicUserIds);

    if (attendanceError) {
      throw new Error('Failed to fetch network attendance.');
    }

    const attendeesByEvent = new Map<string, string[]>();
    for (const eventId of uniqueEventIds) {
      attendeesByEvent.set(eventId, []);
    }

    for (const row of attendanceRows || []) {
      const eventAttendees = attendeesByEvent.get(row.event_id);
      if (!eventAttendees) {
        continue;
      }

      if (eventAttendees.includes(row.user_id)) {
        continue;
      }

      eventAttendees.push(row.user_id);
    }

    return uniqueEventIds.map((eventId) => {
      const attendeeUserIds = attendeesByEvent.get(eventId) || [];
      const sampleAvatars = attendeeUserIds
        .map((userId) => avatarByUserId.get(userId))
        .filter((avatarUrl): avatarUrl is string => Boolean(avatarUrl))
        .slice(0, MAX_SAMPLE_AVATARS);

      return {
        eventId,
        networkCount: attendeeUserIds.length,
        sampleAvatars,
      };
    });
  }
}

