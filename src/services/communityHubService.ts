import { BlockService } from '@/services/blockService';
import type {
  CommunityFeedPost,
  CommunityHubData,
  CommunityLaunchpadCircle,
  CommunityLaunchpadMember,
  CommunityLaunchpadProgress,
  CommunityUpcomingEvent,
} from '@/types/community';
import type { SupabaseClientType } from '@/types/database';

// ── Row types for DB results ────────────────────────────────────

interface FeedPostRow {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  circle_id: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  headline: string | null;
  created_at: string | null;
}

interface CircleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  member_count: number;
  icon: string | null;
}

interface SocialStatsRow {
  user_id: string;
  follower_count: number;
  following_count: number;
}

interface CommentCountRow {
  post_id: string;
  count: number;
}

// ── Constants ────────────────────────────────────────────────────

const FEED_LIMIT = 20;
const TRENDING_THRESHOLD = 8; // ≥8 comments = trending
const UPCOMING_EVENTS_LIMIT = 5;
const SUGGESTED_MEMBERS_LIMIT = 8;
const SUGGESTED_MEMBERS_FETCH_LIMIT = 30;

// ── Service ──────────────────────────────────────────────────────

export class CommunityHubService {
  /**
   * Fetch all data needed for the unified community hub in parallel.
   */
  static async getHubData({
    viewerId,
    viewerScopedClient,
    readClient,
  }: {
    viewerId: string;
    viewerScopedClient: SupabaseClientType;
    readClient: SupabaseClientType;
  }): Promise<CommunityHubData> {
    const [feed, circles, progress, upcomingEvents, suggestedMembers] =
      await Promise.all([
        this.getFeed({ viewerId, readClient }),
        this.getCircles({ viewerId, readClient }),
        this.getProgress({ viewerId, readClient }),
        this.getUpcomingEvents({ viewerId, readClient }),
        this.getSuggestedMembers({ viewerId, viewerScopedClient, readClient }),
      ]);

    return { feed, circles, progress, upcomingEvents, suggestedMembers };
  }

  // ── Feed ──────────────────────────────────────────────────────

  private static async getFeed({
    viewerId,
    readClient,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<CommunityFeedPost[]> {
    try {
      // Get circles the user has joined
      const { data: memberships } = await readClient
        .from('circle_members')
        .select('circle_id')
        .eq('user_id', viewerId);

      const joinedCircleIds = (memberships || []).map(
        (m: { circle_id: string }) => m.circle_id
      );

      // Get all circles (for name resolution)
      const { data: allCircles } = await readClient
        .from('circles')
        .select('id, slug, name');

      const circleMap = new Map<string, { slug: string; name: string }>(
        ((allCircles as CircleRow[]) || []).map((c) => [
          c.id,
          { slug: c.slug, name: c.name },
        ])
      );

      // Fetch recent posts — from joined circles first, then globally
      let posts: FeedPostRow[] = [];

      if (joinedCircleIds.length > 0) {
        const { data: joinedPosts } = await readClient
          .from('circle_posts')
          .select('id, content, created_at, author_id, circle_id')
          .in('circle_id', joinedCircleIds)
          .order('created_at', { ascending: false })
          .limit(FEED_LIMIT);

        posts = (joinedPosts || []) as FeedPostRow[];
      }

      // Backfill with global posts if we don't have enough
      if (posts.length < FEED_LIMIT) {
        const existingIds = new Set(posts.map((p) => p.id));
        const { data: globalPosts } = await readClient
          .from('circle_posts')
          .select('id, content, created_at, author_id, circle_id')
          .order('created_at', { ascending: false })
          .limit(FEED_LIMIT);

        for (const gp of (globalPosts || []) as FeedPostRow[]) {
          if (!existingIds.has(gp.id) && posts.length < FEED_LIMIT) {
            posts.push(gp);
          }
        }
      }

      if (posts.length === 0) return [];

      // Resolve authors
      const authorIds = [...new Set(posts.map((p) => p.author_id))];
      const { data: profiles } = await readClient
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const profileMap = new Map(
        ((profiles as ProfileRow[]) || []).map((p) => [
          p.id,
          { id: p.id, fullName: p.full_name, avatarUrl: p.avatar_url },
        ])
      );

      // Count comments per post (fetch post_id only; tally in JS)
      const postIds = posts.map((p) => p.id);
      const { data: commentCounts } = await readClient
        .from('circle_comments')
        .select('post_id')
        .in('post_id', postIds)
        .limit(5000);

      // Tally counts manually
      const countMap = new Map<string, number>();
      for (const row of (commentCounts || []) as { post_id: string }[]) {
        countMap.set(row.post_id, (countMap.get(row.post_id) || 0) + 1);
      }

      return posts.map((p) => ({
        id: p.id,
        content: p.content,
        createdAt: p.created_at,
        author: profileMap.get(p.author_id) || {
          id: p.author_id,
          fullName: null,
          avatarUrl: null,
        },
        circle: circleMap.get(p.circle_id) || {
          slug: 'unknown',
          name: 'Unknown Circle',
        },
        commentCount: countMap.get(p.id) || 0,
        isTrending: (countMap.get(p.id) || 0) >= TRENDING_THRESHOLD,
      }));
    } catch (error) {
      console.error('Failed to load community feed:', error);
      return [];
    }
  }

  // ── Circles ───────────────────────────────────────────────────

  private static async getCircles({
    viewerId,
    readClient,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<CommunityLaunchpadCircle[]> {
    try {
      // Fetch circles without icon column (not in DB schema)
      const circlesResult = await readClient
        .from('circles')
        .select('id, slug, name, description, member_count')
        .order('member_count', { ascending: false });

      const membershipsResult = await readClient
        .from('circle_members')
        .select('circle_id')
        .eq('user_id', viewerId);

      const circles = (circlesResult.data || []) as CircleRow[];
      const joinedIds = new Set(
        ((membershipsResult.data || []) as { circle_id: string }[]).map(
          (m) => m.circle_id
        )
      );

      return circles.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        href: `/circle/${c.slug}`,
        memberCount: c.member_count,
        isJoined: joinedIds.has(c.id),
        icon: 'people', // DB has no icon column; icons are mapped in the UI layer
      }));
    } catch (error) {
      console.error('Failed to load circles:', error);
      return [];
    }
  }

  // ── Profile Progress ──────────────────────────────────────────

  private static async getProgress({
    viewerId,
    readClient,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<CommunityLaunchpadProgress> {
    try {
      const [viewerResult, careerResult] = await Promise.all([
        readClient
          .from('profiles')
          .select('username, headline, profile_visibility, avatar_url')
          .eq('id', viewerId)
          .maybeSingle(),
        readClient
          .from('career_profiles')
          .select('interests')
          .eq('user_id', viewerId)
          .maybeSingle(),
      ]);

      const viewer = viewerResult.data as {
        username: string | null;
        headline: string | null;
        profile_visibility: string;
        avatar_url: string | null;
      } | null;

      const career = careerResult.data as {
        interests: string[] | null;
      } | null;

      const hasHeadline = Boolean(viewer?.headline?.trim());
      const hasAvatar = Boolean(viewer?.avatar_url?.trim());
      const isPublic = viewer?.profile_visibility === 'public';
      const interestCount = Array.isArray(career?.interests)
        ? career.interests.filter(
            (i) => typeof i === 'string' && i.trim().length > 0
          ).length
        : 0;

      const tasks = [
        {
          id: 'add_photo' as const,
          title: 'Add a profile photo',
          description: 'Help others recognize you',
          completed: hasAvatar,
          weight: 15,
          ctaLabel: 'Upload photo',
          ctaHref: '/dashboard/settings?tab=profile',
          telemetryEvent: 'profile_completion_started' as const,
        },
        {
          id: 'add_headline' as const,
          title: 'Add headline',
          description: 'A concise one-line summary of your focus',
          completed: hasHeadline,
          weight: 20,
          ctaLabel: 'Add headline',
          ctaHref: '/dashboard/settings?tab=profile',
          telemetryEvent: 'profile_completion_started' as const,
        },
        {
          id: 'pick_interests' as const,
          title: 'Pick 3 interests',
          description: `Choose at least 3 interests. Current: ${interestCount}.`,
          completed: interestCount >= 3,
          weight: 30,
          ctaLabel: 'Edit interests',
          ctaHref: '/dashboard/settings?tab=career',
          telemetryEvent: 'profile_completion_started' as const,
        },
        {
          id: 'set_profile_public' as const,
          title: 'Set profile public',
          description: 'Let people discover and follow you',
          completed: isPublic,
          weight: 35,
          ctaLabel: 'Update visibility',
          ctaHref: '/dashboard/settings?tab=profile',
          telemetryEvent: 'profile_completion_started' as const,
        },
      ];

      const completedWeight = tasks
        .filter((t) => t.completed)
        .reduce((sum, t) => sum + t.weight, 0);
      const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0);
      const completionPercent =
        totalWeight > 0
          ? Math.round((completedWeight / totalWeight) * 100)
          : 0;

      return { completionPercent, completedWeight, totalWeight, tasks };
    } catch (error) {
      console.error('Failed to load profile progress:', error);
      return {
        completionPercent: 0,
        completedWeight: 0,
        totalWeight: 100,
        tasks: [],
      };
    }
  }

  // ── Upcoming Events ───────────────────────────────────────────

  private static async getUpcomingEvents({
    viewerId,
    readClient,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<CommunityUpcomingEvent[]> {
    try {
      const nowIso = new Date().toISOString();

      // Get user's tracked event IDs
      const { data: userEvents } = await readClient
        .from('user_events')
        .select('event_id')
        .eq('user_id', viewerId)
        .eq('is_bookmarked', true);

      if (!userEvents || userEvents.length === 0) {
        // Fallback: show next upcoming events globally
        const { data: globalEvents } = await readClient
          .from('events')
          .select('id, slug, title, start_time, location')
          .eq('status', 'confirmed')
          .gte('start_time', nowIso)
          .order('start_time', { ascending: true })
          .limit(UPCOMING_EVENTS_LIMIT);

        return ((globalEvents || []) as {
          id: string;
          slug: string | null;
          title: string | null;
          start_time: string;
          location: string | null;
        }[]).map((e) => ({
          id: e.id,
          slug: e.slug || e.id,
          title: e.title || 'Untitled Event',
          startTime: e.start_time,
          location: e.location,
          format: null,
        }));
      }

      const eventIds = userEvents.map(
        (ue: { event_id: string }) => ue.event_id
      );

      const { data: events } = await readClient
        .from('events')
        .select('id, slug, title, start_time, location')
        .in('id', eventIds)
        .gte('start_time', nowIso)
        .order('start_time', { ascending: true })
        .limit(UPCOMING_EVENTS_LIMIT);

      return ((events || []) as {
        id: string;
        slug: string | null;
        title: string | null;
        start_time: string;
        location: string | null;
      }[]).map((e) => ({
        id: e.id,
        slug: e.slug || e.id,
        title: e.title || 'Untitled Event',
        startTime: e.start_time,
        location: e.location,
        format: null,
      }));
    } catch (error) {
      console.error('Failed to load upcoming events:', error);
      return [];
    }
  }

  // ── Suggested Members ─────────────────────────────────────────

  private static async getSuggestedMembers({
    viewerId,
    viewerScopedClient,
    readClient,
  }: {
    viewerId: string;
    viewerScopedClient: SupabaseClientType;
    readClient: SupabaseClientType;
  }): Promise<CommunityLaunchpadMember[]> {
    try {
      const { data: profiles } = await readClient
        .from('profiles')
        .select('id, full_name, avatar_url, username, headline, created_at')
        .eq('profile_visibility', 'public')
        .not('username', 'is', null)
        .order('created_at', { ascending: false })
        .limit(SUGGESTED_MEMBERS_FETCH_LIMIT);

      const candidates = ((profiles || []) as unknown as ProfileRow[]).filter(
        (p) => p.id !== viewerId
      );
      const candidateIds = candidates.map((p) => p.id);

      const blockedIds = await BlockService.getBlockedUserIdsForViewer(
        viewerId,
        candidateIds,
        viewerScopedClient
      );

      const visible = candidates.filter((p) => !blockedIds.has(p.id));
      const visibleIds = visible.map((p) => p.id);

      const statsResult =
        visibleIds.length > 0
          ? await readClient
              .from('user_social_stats')
              .select('user_id, follower_count, following_count')
              .in('user_id', visibleIds)
          : { data: [], error: null };

      const statsByUser = new Map<string, SocialStatsRow>(
        ((statsResult.data || []) as SocialStatsRow[]).map((s) => [
          s.user_id,
          s,
        ])
      );

      return visible
        .map((p) => {
          const stats = statsByUser.get(p.id);
          return {
            id: p.id,
            fullName: p.full_name,
            avatarUrl: p.avatar_url,
            username: p.username,
            headline: p.headline,
            followerCount: stats?.follower_count ?? 0,
            followingCount: stats?.following_count ?? 0,
            _sortScore:
              (stats?.follower_count ?? 0) +
              (p.created_at ? Date.parse(p.created_at) / 1e12 : 0),
          };
        })
        .sort((a, b) => b._sortScore - a._sortScore)
        .slice(0, SUGGESTED_MEMBERS_LIMIT)
        .map(({ _sortScore: _, ...member }) => member);
    } catch (error) {
      console.error('Failed to load suggested members:', error);
      return [];
    }
  }
}
