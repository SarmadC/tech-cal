import type { SupabaseClientType } from '@/types';
import { BlockService } from '@/services/blockService';
import { SocialProfileService } from '@/services/socialProfileService';

export interface UserSearchOptions {
  q?: string;
  hasHeadline?: boolean;
  limit?: number;
  cursor?: string | null;
}

export interface UserSearchUser {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  headline: string | null;
  joinedAt: string | null;
  followerCount: number;
  followingCount: number;
  activity: {
    upcomingAttendingCount: number;
    attendingThisWeekCount: number;
    sharedSavedEventCount: number;
    recentFollowerCount: number;
    isViewerFollowing: boolean;
  };
}

export interface UserSearchHighlights {
  attendingSavedEvents: UserSearchUser[];
  networkAttendingThisWeek: UserSearchUser[];
  newMembers: UserSearchUser[];
}

export interface UserSearchResult {
  users: UserSearchUser[];
  nextCursor: string | null;
  highlights: UserSearchHighlights;
}

interface ProfileSearchRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  headline: string | null;
  created_at: string | null;
}

interface UserSearchCursor {
  createdAt: string;
  id: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const HIGHLIGHT_LIMIT = 4;
const THIS_WEEK_WINDOW_DAYS = 7;
const NEW_MEMBER_WINDOW_DAYS = 14;

export class UserSearchService {
  static encodeCursor(cursor: UserSearchCursor): string {
    const payload = JSON.stringify(cursor);
    return Buffer.from(payload, 'utf8').toString('base64url');
  }

  static decodeCursor(cursor: string): UserSearchCursor {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as Partial<UserSearchCursor>;
      const createdAt = parsed.createdAt?.trim();
      const id = parsed.id?.trim();

      if (!createdAt || !id || Number.isNaN(new Date(createdAt).getTime())) {
        throw new Error('Invalid pagination cursor.');
      }

      return {
        createdAt,
        id,
      };
    } catch {
      throw new Error('Invalid pagination cursor.');
    }
  }

  static normalizeLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit)) {
      return DEFAULT_LIMIT;
    }

    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
  }

  static async searchUsers(
    viewerId: string,
    viewerScopedClient: SupabaseClientType,
    readClient: SupabaseClientType,
    options: UserSearchOptions = {}
  ): Promise<UserSearchResult> {
    const limit = this.normalizeLimit(options.limit);
    const cursor = options.cursor ? this.decodeCursor(options.cursor) : null;
    const q = options.q?.trim() || '';
    const hasHeadline = Boolean(options.hasHeadline);

    const escapedQuery = q.length > 0 ? SocialProfileService.escapeLikePattern(q) : null;

    const buildBaseQuery = () => {
      let query = readClient
        .from('profiles')
        .select('id, full_name, avatar_url, username, headline, created_at')
        .eq('profile_visibility', 'public')
        .not('username', 'is', null)
        .not('created_at', 'is', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (hasHeadline) {
        query = query.not('headline', 'is', null);
      }

      if (escapedQuery) {
        query = query.or(
          `username.ilike.%${escapedQuery}%,full_name.ilike.%${escapedQuery}%,headline.ilike.%${escapedQuery}%`
        );
      }

      return query;
    };

    let rows: ProfileSearchRow[] = [];

    if (!cursor) {
      const { data, error } = await buildBaseQuery().limit(limit + 1);
      if (error) {
        throw new Error('Failed to search users.');
      }
      rows = (data || []) as ProfileSearchRow[];
    } else {
      const [sameTimestampRes, olderRes] = await Promise.all([
        buildBaseQuery()
          .eq('created_at', cursor.createdAt)
          .lt('id', cursor.id)
          .limit(limit + 1),
        buildBaseQuery()
          .lt('created_at', cursor.createdAt)
          .limit(limit + 1),
      ]);

      if (sameTimestampRes.error || olderRes.error) {
        throw new Error('Failed to search users.');
      }

      const combined = [
        ...((sameTimestampRes.data || []) as ProfileSearchRow[]),
        ...((olderRes.data || []) as ProfileSearchRow[]),
      ];

      rows = combined
        .filter((row) => Boolean(row.created_at))
        .sort((a, b) => {
          const createdAtDiff = new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
          if (createdAtDiff !== 0) {
            return createdAtDiff;
          }

          return b.id.localeCompare(a.id);
        })
        .slice(0, limit + 1);
    }

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const candidateRows = pageRows.filter((row) => row.id !== viewerId);
    const candidateIds = candidateRows.map((row) => row.id);

    const blockedIds = await BlockService.getBlockedUserIdsForViewer(
      viewerId,
      candidateIds,
      viewerScopedClient
    );

    const visibleRows = candidateRows.filter((row) => !blockedIds.has(row.id));
    const visibleIds = visibleRows.map((row) => row.id);

    const { data: statsRows, error: statsError } = visibleIds.length > 0
      ? await readClient
          .from('user_social_stats')
          .select('user_id, follower_count, following_count')
          .in('user_id', visibleIds)
      : { data: [], error: null };

    if (statsError) {
      throw new Error('Failed to load user search stats.');
    }

    const statsByUserId = new Map(
      (statsRows || []).map((row) => [
        row.user_id,
        {
          followerCount: row.follower_count,
          followingCount: row.following_count,
        },
      ])
    );

    const now = new Date();
    const nowTimestamp = now.getTime();
    const weekAheadTimestamp = nowTimestamp + THIS_WEEK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const weekAgoIso = new Date(nowTimestamp - THIS_WEEK_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const newMemberCutoffTimestamp = nowTimestamp - NEW_MEMBER_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    type AttendanceRow = {
      user_id: string;
      event_id: string;
    };
    const attendanceByUser = new Map<string, Set<string>>();
    const recentFollowerCountByUserId = new Map<string, number>();
    const viewerFollowingSet = new Set<string>();
    const viewerSavedEventIds = new Set<string>();

    const attendancePromise = visibleIds.length > 0
      ? readClient
          .from('user_events')
          .select('user_id, event_id')
          .in('user_id', visibleIds)
          .eq('status', 'attending')
      : Promise.resolve({ data: [], error: null });

    const recentFollowsPromise = visibleIds.length > 0
      ? readClient
          .from('follows')
          .select('following_id')
          .in('following_id', visibleIds)
          .gte('created_at', weekAgoIso)
      : Promise.resolve({ data: [], error: null });

    const viewerFollowingPromise = visibleIds.length > 0
      ? viewerScopedClient
          .from('follows')
          .select('following_id')
          .eq('follower_id', viewerId)
          .in('following_id', visibleIds)
      : Promise.resolve({ data: [], error: null });

    const viewerSavedPromise = viewerScopedClient
      .from('user_events')
      .select('event_id')
      .eq('user_id', viewerId)
      .eq('is_bookmarked', true);

    const [
      attendanceResult,
      recentFollowsResult,
      viewerFollowingResult,
      viewerSavedResult,
    ] = await Promise.all([
      attendancePromise,
      recentFollowsPromise,
      viewerFollowingPromise,
      viewerSavedPromise,
    ]);

    const attendanceRows = (attendanceResult.data || []) as AttendanceRow[];
    if (attendanceResult.error) {
      console.error('User search attendance query failed:', attendanceResult.error);
    } else {
      for (const row of attendanceRows) {
        const userEvents = attendanceByUser.get(row.user_id) ?? new Set<string>();
        userEvents.add(row.event_id);
        attendanceByUser.set(row.user_id, userEvents);
      }
    }

    if (recentFollowsResult.error) {
      console.error('User search recent follows query failed:', recentFollowsResult.error);
    } else {
      for (const row of recentFollowsResult.data || []) {
        recentFollowerCountByUserId.set(
          row.following_id,
          (recentFollowerCountByUserId.get(row.following_id) ?? 0) + 1
        );
      }
    }

    if (viewerFollowingResult.error) {
      console.error('User search viewer following query failed:', viewerFollowingResult.error);
    } else {
      for (const row of viewerFollowingResult.data || []) {
        viewerFollowingSet.add(row.following_id);
      }
    }

    if (viewerSavedResult.error) {
      console.error('User search viewer saved events query failed:', viewerSavedResult.error);
    } else {
      for (const row of viewerSavedResult.data || []) {
        viewerSavedEventIds.add(row.event_id);
      }
    }

    const allAttendingEventIds = Array.from(new Set(attendanceRows.map((row) => row.event_id)));
    const eventStartById = new Map<string, number>();
    if (allAttendingEventIds.length > 0) {
      const { data: eventRows, error: eventsError } = await readClient
        .from('events')
        .select('id, start_time')
        .in('id', allAttendingEventIds);

      if (eventsError) {
        console.error('User search events query failed:', eventsError);
      } else {
        for (const row of eventRows || []) {
          const startTimestamp = Date.parse(row.start_time);
          if (Number.isFinite(startTimestamp)) {
            eventStartById.set(row.id, startTimestamp);
          }
        }
      }
    }

    const activityByUserId = new Map<
      string,
      {
        upcomingAttendingCount: number;
        attendingThisWeekCount: number;
        sharedSavedEventCount: number;
        recentFollowerCount: number;
        isViewerFollowing: boolean;
      }
    >();

    for (const userId of visibleIds) {
      const attendingEventIds = attendanceByUser.get(userId) ?? new Set<string>();
      let upcomingAttendingCount = 0;
      let attendingThisWeekCount = 0;
      let sharedSavedEventCount = 0;

      for (const eventId of attendingEventIds) {
        if (viewerSavedEventIds.has(eventId)) {
          sharedSavedEventCount += 1;
        }

        const startTimestamp = eventStartById.get(eventId);
        if (startTimestamp === undefined) {
          continue;
        }

        if (startTimestamp >= nowTimestamp) {
          upcomingAttendingCount += 1;
        }

        if (startTimestamp >= nowTimestamp && startTimestamp <= weekAheadTimestamp) {
          attendingThisWeekCount += 1;
        }
      }

      activityByUserId.set(userId, {
        upcomingAttendingCount,
        attendingThisWeekCount,
        sharedSavedEventCount,
        recentFollowerCount: recentFollowerCountByUserId.get(userId) ?? 0,
        isViewerFollowing: viewerFollowingSet.has(userId),
      });
    }

    const users: UserSearchUser[] = visibleRows.map((row) => {
      const stats = statsByUserId.get(row.id);
      const activity = activityByUserId.get(row.id) ?? {
        upcomingAttendingCount: 0,
        attendingThisWeekCount: 0,
        sharedSavedEventCount: 0,
        recentFollowerCount: 0,
        isViewerFollowing: false,
      };

      return {
        id: row.id,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        username: row.username,
        headline: row.headline,
        joinedAt: row.created_at,
        followerCount: stats?.followerCount ?? 0,
        followingCount: stats?.followingCount ?? 0,
        activity,
      };
    });

    const attendingSavedEvents = users
      .filter((user) => user.activity.sharedSavedEventCount > 0)
      .sort((left, right) => {
        if (right.activity.sharedSavedEventCount !== left.activity.sharedSavedEventCount) {
          return right.activity.sharedSavedEventCount - left.activity.sharedSavedEventCount;
        }

        return right.activity.upcomingAttendingCount - left.activity.upcomingAttendingCount;
      })
      .slice(0, HIGHLIGHT_LIMIT);

    const networkAttendingThisWeek = users
      .filter((user) => user.activity.isViewerFollowing && user.activity.attendingThisWeekCount > 0)
      .sort((left, right) => {
        if (right.activity.attendingThisWeekCount !== left.activity.attendingThisWeekCount) {
          return right.activity.attendingThisWeekCount - left.activity.attendingThisWeekCount;
        }

        return right.followerCount - left.followerCount;
      })
      .slice(0, HIGHLIGHT_LIMIT);

    const newMembers = users
      .filter((user) => {
        if (!user.joinedAt) {
          return false;
        }

        const joinedTimestamp = Date.parse(user.joinedAt);
        return Number.isFinite(joinedTimestamp) && joinedTimestamp >= newMemberCutoffTimestamp;
      })
      .sort((left, right) => Date.parse(right.joinedAt || '') - Date.parse(left.joinedAt || ''))
      .slice(0, HIGHLIGHT_LIMIT);

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor = hasMore && lastRow?.created_at
      ? this.encodeCursor({
          createdAt: lastRow.created_at,
          id: lastRow.id,
        })
      : null;

    return {
      users,
      nextCursor,
      highlights: {
        attendingSavedEvents,
        networkAttendingThisWeek,
        newMembers,
      },
    };
  }
}
