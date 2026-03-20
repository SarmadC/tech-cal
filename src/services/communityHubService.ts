import type {
  CommunityFeedPost,
  CommunityFeedPageData,
  CommunityLaunchpadCircle,
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
}

interface CircleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  member_count: number;
}

// ── Constants ────────────────────────────────────────────────────

const FEED_LIMIT = 20;
const TRENDING_THRESHOLD = 8; // ≥8 comments = trending
const UPCOMING_EVENTS_LIMIT = 5;

// ── Service ──────────────────────────────────────────────────────

export class CommunityHubService {
  static async getFeedPageData({
    viewerId,
    readClient,
  }: {
    viewerId: string | null;
    readClient: SupabaseClientType;
  }): Promise<CommunityFeedPageData> {
    const feedPromise = this.getFeed({ viewerId, readClient });

    if (!viewerId) {
      const feed = await feedPromise;
      return {
        feed,
        circles: [],
        upcomingEvents: [],
      };
    }

    const [feed, circles, upcomingEvents] = await Promise.all([
      feedPromise,
      this.getCircles({ viewerId, readClient }),
      this.getUpcomingEvents({ viewerId, readClient }),
    ]);

    return { feed, circles, upcomingEvents };
  }

  // ── Feed ──────────────────────────────────────────────────────

  private static async getFeed({
    viewerId,
    readClient,
  }: {
    viewerId: string | null;
    readClient: SupabaseClientType;
  }): Promise<CommunityFeedPost[]> {
    try {
      const joinedCircleIds =
        viewerId
          ? (
              await readClient
                .from('circle_members')
                .select('circle_id')
                .eq('user_id', viewerId)
            ).data || []
          : [];

      const normalizedJoinedCircleIds = joinedCircleIds.map(
        (membership: { circle_id: string }) => membership.circle_id
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

      if (normalizedJoinedCircleIds.length > 0) {
        const { data: joinedPosts } = await readClient
          .from('circle_posts')
          .select('id, content, created_at, author_id, circle_id')
          .in('circle_id', normalizedJoinedCircleIds)
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
}
