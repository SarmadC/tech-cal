import type { SupabaseClientType } from '@/types';
import { BlockService } from '@/services/blockService';

export interface WhosGoingAttendee {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  headline: string | null;
  isInNetwork: boolean;
  followsViewer: boolean;
  isMutualFollow: boolean;
}

export interface WhosGoingResult {
  eventId: string;
  totalAttending: number;
  visibleAttendeeCount: number;
  networkAttendingCount: number;
  viewerIsAttending: boolean;
  attendees: WhosGoingAttendee[];
}

export class WhosGoingService {
  static async getEventAttendees(
    eventId: string,
    viewerId: string | null,
    supabaseClient: SupabaseClientType,
    limit: number = 8
  ): Promise<WhosGoingResult> {
    const { data: attendanceRows, error: attendanceError } = await supabaseClient
      .from('user_events')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'attending');

    if (attendanceError) {
      throw new Error('Failed to fetch event attendees.');
    }

    const attendeeIds = Array.from(new Set((attendanceRows || []).map(row => row.user_id)));
    const viewerIsAttending = viewerId ? attendeeIds.includes(viewerId) : false;

    if (attendeeIds.length === 0) {
      return {
        eventId,
        totalAttending: 0,
        visibleAttendeeCount: 0,
        networkAttendingCount: 0,
        viewerIsAttending,
        attendees: [],
      };
    }

    const { data: profileRows, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, avatar_url, username, headline, profile_visibility, show_attendance')
      .in('id', attendeeIds);

    if (profileError) {
      throw new Error('Failed to fetch attendee profiles.');
    }

    let visibleProfiles = (profileRows || []).filter(
      profile => profile.show_attendance && profile.profile_visibility === 'public'
    );

    if (viewerId && visibleProfiles.length > 0) {
      const blockedIds = await BlockService.getBlockedUserIdsForViewer(
        viewerId,
        visibleProfiles.map(profile => profile.id),
        supabaseClient
      );

      visibleProfiles = visibleProfiles.filter(profile => !blockedIds.has(profile.id));
    }

    // Avoid duplicating "you" in the attendee avatars; caller can render viewer state separately.
    if (viewerId) {
      visibleProfiles = visibleProfiles.filter(profile => profile.id !== viewerId);
    }

    visibleProfiles.sort((a, b) => {
      const aName = a.full_name || '';
      const bName = b.full_name || '';
      return aName.localeCompare(bName);
    });

    const networkAttendingIds = new Set<string>();
    const followsViewerIds = new Set<string>();

    if (viewerId && visibleProfiles.length > 0) {
      const visibleProfileIds = visibleProfiles.map((profile) => profile.id);
      const [viewerFollowingRes, viewerFollowedByRes] = await Promise.all([
        supabaseClient
          .from('follows')
          .select('following_id')
          .eq('follower_id', viewerId)
          .in('following_id', visibleProfileIds),
        supabaseClient
          .from('follows')
          .select('follower_id')
          .eq('following_id', viewerId)
          .in('follower_id', visibleProfileIds)
      ]);

      if (viewerFollowingRes.error || viewerFollowedByRes.error) {
        throw new Error('Failed to fetch follow graph for attendees.');
      }

      for (const row of viewerFollowingRes.data || []) {
        networkAttendingIds.add(row.following_id);
      }

      for (const row of viewerFollowedByRes.data || []) {
        followsViewerIds.add(row.follower_id);
      }
    }

    const attendees: WhosGoingAttendee[] = visibleProfiles.slice(0, limit).map(profile => ({
      id: profile.id,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      username: profile.username,
      headline: profile.headline,
      isInNetwork: networkAttendingIds.has(profile.id),
      followsViewer: followsViewerIds.has(profile.id),
      isMutualFollow: networkAttendingIds.has(profile.id) && followsViewerIds.has(profile.id),
    }));

    return {
      eventId,
      totalAttending: attendeeIds.length,
      visibleAttendeeCount: visibleProfiles.length,
      networkAttendingCount: networkAttendingIds.size,
      viewerIsAttending,
      attendees,
    };
  }
}
