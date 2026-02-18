import type { SupabaseClientType } from '@/types';
import { SocialProfileService } from '@/services/socialProfileService';

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  headline: string | null;
  profile_visibility: string;
  show_attendance: boolean;
}

interface EventRow {
  id: string;
  slug: string;
  title: string | null;
  start_time: string;
  location: string | null;
}

export interface PublicProfileEvent {
  id: string;
  slug: string;
  title: string;
  startTime: string;
  location: string | null;
}

export interface PublicProfileResult {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string;
  headline: string | null;
  showAttendance: boolean;
  isViewerOwner: boolean;
  followerCount: number;
  followingCount: number;
  recentAttendingEvents: PublicProfileEvent[];
}

export class PublicProfileService {
  static async getPublicProfileByUsername(
    username: string,
    viewerId: string | null,
    readClient: SupabaseClientType
  ): Promise<PublicProfileResult | null> {
    const normalizedUsername = SocialProfileService.normalizeUsername(username);

    if (!SocialProfileService.isValidUsernameFormat(normalizedUsername)) {
      return null;
    }

    const escapedUsername = SocialProfileService.escapeLikePattern(normalizedUsername);

    const { data: profile, error: profileError } = await readClient
      .from('profiles')
      .select('id, full_name, avatar_url, username, headline, profile_visibility, show_attendance')
      .ilike('username', escapedUsername)
      .maybeSingle();

    if (profileError) {
      throw new Error('Failed to fetch public profile.');
    }

    if (!profile) {
      return null;
    }

    const typedProfile = profile as ProfileRow;
    const usernameValue = typedProfile.username;
    if (!usernameValue) {
      return null;
    }

    const isViewerOwner = Boolean(viewerId && viewerId === typedProfile.id);

    if (viewerId && !isViewerOwner) {
      const { data: blockRows, error: blockError } = await readClient
        .from('blocks')
        .select('blocker_id, blocked_id')
        .or(
          `and(blocker_id.eq.${viewerId},blocked_id.eq.${typedProfile.id}),and(blocker_id.eq.${typedProfile.id},blocked_id.eq.${viewerId})`
        )
        .limit(1);

      if (blockError) {
        throw new Error('Failed to enforce profile privacy rules.');
      }

      if ((blockRows?.length ?? 0) > 0) {
        return null;
      }
    }

    if (typedProfile.profile_visibility !== 'public' && !isViewerOwner) {
      return null;
    }

    const [{ data: stats, error: statsError }, recentAttendingEvents] = await Promise.all([
      readClient
        .from('user_social_stats')
        .select('follower_count, following_count')
        .eq('user_id', typedProfile.id)
        .maybeSingle(),
      this.getRecentAttendingEvents({
        readClient,
        userId: typedProfile.id,
        canViewAttendance: typedProfile.show_attendance || isViewerOwner,
      }),
    ]);

    if (statsError) {
      throw new Error('Failed to fetch public profile stats.');
    }

    return {
      id: typedProfile.id,
      fullName: typedProfile.full_name,
      avatarUrl: typedProfile.avatar_url,
      username: usernameValue,
      headline: typedProfile.headline,
      showAttendance: typedProfile.show_attendance,
      isViewerOwner,
      followerCount: stats?.follower_count ?? 0,
      followingCount: stats?.following_count ?? 0,
      recentAttendingEvents,
    };
  }

  private static async getRecentAttendingEvents({
    readClient,
    userId,
    canViewAttendance,
  }: {
    readClient: SupabaseClientType;
    userId: string;
    canViewAttendance: boolean;
  }): Promise<PublicProfileEvent[]> {
    if (!canViewAttendance) {
      return [];
    }

    const { data: userEvents, error: userEventsError } = await readClient
      .from('user_events')
      .select('event_id')
      .eq('user_id', userId)
      .eq('status', 'attending')
      .limit(20);

    if (userEventsError) {
      throw new Error('Failed to fetch attended events.');
    }

    const eventIds = Array.from(new Set((userEvents || []).map((row) => row.event_id)));
    if (eventIds.length === 0) {
      return [];
    }

    const { data: events, error: eventsError } = await readClient
      .from('events')
      .select('id, slug, title, start_time, location')
      .in('id', eventIds)
      .eq('status', 'confirmed');

    if (eventsError) {
      throw new Error('Failed to fetch attended event details.');
    }

    const sortedEvents = ((events || []) as EventRow[])
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const nowMs = Date.now();
    const upcoming = sortedEvents.filter((event) => new Date(event.start_time).getTime() >= nowMs);
    const selected = (upcoming.length > 0 ? upcoming : [...sortedEvents].reverse()).slice(0, 5);

    return selected.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title || 'Untitled event',
      startTime: event.start_time,
      location: event.location,
    }));
  }
}
