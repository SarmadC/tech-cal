import type {
  CommunityFeedPost,
  CommunityFeedPageData,
  CommunityLaunchpadCircle,
  CommunityUpcomingEvent,
} from "@/types/community";
import type { SupabaseClientType } from "@/types/database";
import { BlockService } from "@/services/blockService";

export interface CommunityDiscoveryCard {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  membershipState: 'none' | 'following' | 'joined';
  tagline: string | null;
  coverImageUrl: string | null;
  iconUrl: string | null;
  theme: string | null;
  topicTags: string[];
  locationScope: string | null;
  activeMemberCount30d: number;
  upcomingEventCount: number;
  contextSignals: string[];
  upcomingEventTitle: string | null;
}

export interface CommunityRecentActivity {
  id: string;
  circleSlug: string;
  circleName: string;
  kind: 'post' | 'event' | 'member';
  summary: string;
  createdAt: string;
}

export interface CommunityDiscoveryData {
  forYou: CommunityDiscoveryCard[];
  joined: CommunityDiscoveryCard[];
  explore: CommunityDiscoveryCard[];
  suggested: CommunityDiscoveryCard[];
  recentActivity: CommunityRecentActivity[];
}

export interface CommunityDiscoveryCard {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  membershipState: 'none' | 'following' | 'joined';
  tagline: string | null;
  coverImageUrl: string | null;
  iconUrl: string | null;
  theme: string | null;
  topicTags: string[];
  locationScope: string | null;
  activeMemberCount30d: number;
  upcomingEventCount: number;
  contextSignals: string[];
  upcomingEventTitle: string | null;
}

export interface CommunityRecentActivity {
  id: string;
  circleSlug: string;
  circleName: string;
  kind: 'post' | 'event' | 'member';
  summary: string;
  createdAt: string;
}

export interface CommunityDiscoveryData {
  forYou: CommunityDiscoveryCard[];
  joined: CommunityDiscoveryCard[];
  explore: CommunityDiscoveryCard[];
  suggested: CommunityDiscoveryCard[];
  recentActivity: CommunityRecentActivity[];
}

// ── Row types for DB results ────────────────────────────────────

interface FeedPostRow {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  circle_id: string;
  moderation_status: "active" | "removed";
}

interface FeedCommentRow {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author_id: string;
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
const FEED_FETCH_LIMIT = FEED_LIMIT * 3;
const FEED_COMMENT_PREVIEW_LIMIT = 2;
const TRENDING_THRESHOLD = 8; // ≥8 comments = trending
const UPCOMING_EVENTS_LIMIT = 5;

interface ExtendedCircleRow extends CircleRow {
  tagline: string | null;
  cover_image_url: string | null;
  icon_url: string | null;
  theme: string | null;
  topic_tags: string[] | null;
  location_scope: string | null;
  active_member_count_30d: number | null;
}

const DISCOVERY_PER_SECTION = 12;

// ── Service ──────────────────────────────────────────────────────

export class CommunityHubService {
  static async getDiscoveryData({
    viewerId,
    readClient,
  }: {
    viewerId: string | null;
    readClient: SupabaseClientType;
  }): Promise<CommunityDiscoveryData> {
    const client = readClient as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          order?: (
            col: string,
            opts?: { ascending: boolean }
          ) => {
            limit: (n: number) => Promise<{ data: unknown[] | null }>;
          };
          eq?: (
            col: string,
            val: string
          ) => Promise<{ data: unknown[] | null }>;
          gte?: (
            col: string,
            val: string
          ) => Promise<{ data: unknown[] | null }>;
          in?: (
            col: string,
            vals: string[]
          ) => Promise<{ data: unknown[] | null }>;
        };
      };
    };

    const circlesQuery = await readClient
      .from('circles')
      .select(
        'id, slug, name, description, member_count, tagline, cover_image_url, icon_url, theme, topic_tags, location_scope, active_member_count_30d'
      )
      .order('member_count', { ascending: false });

    const allCircles = ((circlesQuery.data as unknown as ExtendedCircleRow[]) ??
      []) as ExtendedCircleRow[];

    const memberships = viewerId
      ? (
          (await client
            .from('circle_members')
            .select('circle_id, membership_state')
            .eq?.('user_id', viewerId)) ?? { data: [] }
        ).data ?? []
      : [];

    const membershipMap = new Map<string, 'following' | 'joined'>();
    for (const m of memberships as Array<{
      circle_id: string;
      membership_state?: string | null;
    }>) {
      const state =
        m.membership_state === 'following' ? 'following' : 'joined';
      membershipMap.set(m.circle_id, state);
    }

    // Upcoming event counts per circle via circle_event_links.
    const linkRows =
      (
        await readClient
          .from('circle_event_links')
          .select('circle_id, event_id')
      ).data ?? [];

    const upcomingEventCountByCircle = new Map<string, number>();
    const nextEventTitleByCircle = new Map<string, string>();
    const linkedEventIds = Array.from(
      new Set(
        (linkRows as Array<{ event_id: string }>).map((row) => row.event_id)
      )
    );

    if (linkedEventIds.length > 0) {
      const nowIso = new Date().toISOString();
      const eventsResult = await readClient
        .from('events')
        .select('id, title, start_time, status')
        .in('id', linkedEventIds);
      const events = (eventsResult.data ?? []) as Array<{
        id: string;
        title: string | null;
        start_time: string;
        status: string | null;
      }>;
      const upcomingEventsById = new Map(
        events
          .filter((e) => e.start_time >= nowIso && e.status !== 'cancelled')
          .map((e) => [e.id, e])
      );

      for (const link of linkRows as Array<{
        circle_id: string;
        event_id: string;
      }>) {
        const event = upcomingEventsById.get(link.event_id);
        if (!event) continue;
        upcomingEventCountByCircle.set(
          link.circle_id,
          (upcomingEventCountByCircle.get(link.circle_id) ?? 0) + 1
        );
        const existing = nextEventTitleByCircle.get(link.circle_id);
        if (!existing) {
          nextEventTitleByCircle.set(
            link.circle_id,
            event.title ?? 'Upcoming event'
          );
        }
      }
    }

    const toCard = (
      row: ExtendedCircleRow,
      contextSignals: string[] = []
    ): CommunityDiscoveryCard => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? '',
      memberCount: row.member_count,
      membershipState: membershipMap.get(row.id) ?? 'none',
      tagline: row.tagline,
      coverImageUrl: row.cover_image_url,
      iconUrl: row.icon_url,
      theme: row.theme,
      topicTags: row.topic_tags ?? [],
      locationScope: row.location_scope,
      activeMemberCount30d: row.active_member_count_30d ?? 0,
      upcomingEventCount: upcomingEventCountByCircle.get(row.id) ?? 0,
      contextSignals,
      upcomingEventTitle: nextEventTitleByCircle.get(row.id) ?? null,
    });

    const joined: CommunityDiscoveryCard[] = [];
    const explore: CommunityDiscoveryCard[] = [];
    const forYou: CommunityDiscoveryCard[] = [];

    // Pull viewer profile interests for forYou heuristic.
    let viewerTopicTags: string[] = [];
    let viewerLocation: string | null = null;
    if (viewerId) {
      const profileResult = await readClient
        .from('profiles')
        .select('preferences, location')
        .eq('id', viewerId)
        .maybeSingle();
      const prof = profileResult.data as
        | { preferences?: unknown; location?: string | null }
        | null;
      if (prof) {
        viewerLocation = prof.location ?? null;
        const prefs = (prof.preferences ?? null) as
          | { interests?: string[]; topics?: string[] }
          | null;
        viewerTopicTags = [
          ...(prefs?.interests ?? []),
          ...(prefs?.topics ?? []),
        ].map((t) => String(t).toLowerCase());
      }
    }

    for (const row of allCircles) {
      const state = membershipMap.get(row.id);
      if (state === 'joined' || state === 'following') {
        joined.push(toCard(row));
      } else {
        const signals: string[] = [];
        const tags = (row.topic_tags ?? []).map((t) => t.toLowerCase());
        if (viewerTopicTags.some((t) => tags.includes(t))) {
          signals.push('Matches your interests');
        }
        if (
          viewerLocation &&
          row.location_scope &&
          row.location_scope.toLowerCase() === viewerLocation.toLowerCase()
        ) {
          signals.push(`Active in ${row.location_scope}`);
        }
        if ((upcomingEventCountByCircle.get(row.id) ?? 0) > 0) {
          signals.push(`${upcomingEventCountByCircle.get(row.id)} upcoming`);
        }

        explore.push(toCard(row, signals));
        if (signals.length > 0 && forYou.length < DISCOVERY_PER_SECTION) {
          forYou.push(toCard(row, signals));
        }
      }
    }

    const suggested = forYou.slice(0, 6);

    // Recent activity from joined circles' posts.
    const joinedIds = joined.map((c) => c.id);
    const recentActivity: CommunityRecentActivity[] = [];
    if (joinedIds.length > 0) {
      const postsResult = await readClient
        .from('circle_posts')
        .select('id, circle_id, content, created_at, moderation_status')
        .in('circle_id', joinedIds)
        .order('created_at', { ascending: false })
        .limit(10);
      const posts = (postsResult.data ?? []) as Array<{
        id: string;
        circle_id: string;
        content: string;
        created_at: string;
        moderation_status: string;
      }>;
      const circleById = new Map(joined.map((c) => [c.id, c]));
      for (const post of posts) {
        if (post.moderation_status !== 'active') continue;
        const circle = circleById.get(post.circle_id);
        if (!circle) continue;
        recentActivity.push({
          id: post.id,
          circleSlug: circle.slug,
          circleName: circle.name,
          kind: 'post',
          summary: post.content.slice(0, 140),
          createdAt: post.created_at,
        });
      }
    }

    return {
      forYou: forYou.slice(0, DISCOVERY_PER_SECTION),
      joined: joined.slice(0, DISCOVERY_PER_SECTION),
      explore: explore.slice(0, DISCOVERY_PER_SECTION),
      suggested,
      recentActivity,
    };
  }

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
      const joinedCircleIds = viewerId
        ? (
            await readClient
              .from("circle_members")
              .select("circle_id")
              .eq("user_id", viewerId)
          ).data || []
        : [];

      const normalizedJoinedCircleIds = joinedCircleIds.map(
        (membership: { circle_id: string }) => membership.circle_id,
      );

      // Get all circles (for name resolution)
      const { data: allCircles } = await readClient
        .from("circles")
        .select("id, slug, name");

      const circleMap = new Map<string, { slug: string; name: string }>(
        ((allCircles as CircleRow[]) || []).map((c) => [
          c.id,
          { slug: c.slug, name: c.name },
        ]),
      );

      // Fetch recent posts — from joined circles first, then globally
      let posts: FeedPostRow[] = [];

      if (normalizedJoinedCircleIds.length > 0) {
        const { data: joinedPosts } = await readClient
          .from("circle_posts")
          .select(
            "id, content, created_at, author_id, circle_id, moderation_status",
          )
          .in("circle_id", normalizedJoinedCircleIds)
          .eq("moderation_status", "active")
          .order("created_at", { ascending: false })
          .limit(FEED_FETCH_LIMIT);

        posts = (joinedPosts || []) as FeedPostRow[];
      }

      // Backfill with global posts if we don't have enough
      if (posts.length < FEED_LIMIT) {
        const existingIds = new Set(posts.map((p) => p.id));
        const { data: globalPosts } = await readClient
          .from("circle_posts")
          .select(
            "id, content, created_at, author_id, circle_id, moderation_status",
          )
          .eq("moderation_status", "active")
          .order("created_at", { ascending: false })
          .limit(FEED_FETCH_LIMIT);

        for (const gp of (globalPosts || []) as FeedPostRow[]) {
          if (!existingIds.has(gp.id) && posts.length < FEED_FETCH_LIMIT) {
            posts.push(gp);
          }
        }
      }

      if (posts.length === 0) return [];

      const commentCandidatePostIds = posts.map((post) => post.id);
      const { data: commentRows } = await readClient
        .from("circle_comments")
        .select("id, post_id, content, created_at, author_id")
        .in("post_id", commentCandidatePostIds)
        .eq("moderation_status", "active")
        .order("created_at", { ascending: false })
        .limit(5_000);

      const blockedUserIds = viewerId
        ? await BlockService.getBlockedUserIdsForViewer(
            viewerId,
            [
              ...new Set([
                ...posts.map((post) => post.author_id),
                ...((commentRows as FeedCommentRow[] | null) ?? []).map(
                  (comment) => comment.author_id,
                ),
              ]),
            ],
            readClient,
          )
        : new Set<string>();

      posts = posts
        .filter(
          (post) =>
            post.moderation_status === "active" &&
            !blockedUserIds.has(post.author_id),
        )
        .slice(0, FEED_LIMIT);

      if (posts.length === 0) {
        return [];
      }

      const postIds = posts.map((p) => p.id);
      const filteredComments = (
        (commentRows as FeedCommentRow[] | null) ?? []
      ).filter(
        (comment) =>
          postIds.includes(comment.post_id) &&
          !blockedUserIds.has(comment.author_id),
      );

      // Resolve authors
      const authorIds = [
        ...new Set([
          ...posts.map((p) => p.author_id),
          ...filteredComments.map((comment) => comment.author_id),
        ]),
      ];
      const { data: profiles } = await readClient
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds);

      const profileMap = new Map(
        ((profiles as ProfileRow[]) || []).map((p) => [
          p.id,
          { id: p.id, fullName: p.full_name, avatarUrl: p.avatar_url },
        ]),
      );

      // Tally counts manually
      const countMap = new Map<string, number>();
      const recentCommentsMap = new Map<
        string,
        Array<{
          id: string;
          content: string;
          createdAt: string;
          author: {
            id: string;
            fullName: string | null;
            avatarUrl: string | null;
          };
        }>
      >();

      for (const row of filteredComments) {
        countMap.set(row.post_id, (countMap.get(row.post_id) || 0) + 1);

        const existingComments = recentCommentsMap.get(row.post_id) ?? [];
        if (existingComments.length >= FEED_COMMENT_PREVIEW_LIMIT) {
          continue;
        }

        existingComments.push({
          id: row.id,
          content: row.content,
          createdAt: row.created_at,
          author: profileMap.get(row.author_id) || {
            id: row.author_id,
            fullName: null,
            avatarUrl: null,
          },
        });
        recentCommentsMap.set(row.post_id, existingComments);
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
          slug: "unknown",
          name: "Unknown Circle",
        },
        commentCount: countMap.get(p.id) || 0,
        isTrending: (countMap.get(p.id) || 0) >= TRENDING_THRESHOLD,
        recentComments: recentCommentsMap.get(p.id) ?? [],
      }));
    } catch (error) {
      console.error("Failed to load community feed:", error);
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
        .from("circles")
        .select("id, slug, name, description, member_count")
        .order("member_count", { ascending: false });

      const membershipsResult = await readClient
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", viewerId);

      const circles = (circlesResult.data || []) as CircleRow[];
      const joinedIds = new Set(
        ((membershipsResult.data || []) as { circle_id: string }[]).map(
          (m) => m.circle_id,
        ),
      );

      return circles.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description || "",
        href: `/circle/${c.slug}`,
        memberCount: c.member_count,
        isJoined: joinedIds.has(c.id),
        icon: "people", // DB has no icon column; icons are mapped in the UI layer
      }));
    } catch (error) {
      console.error("Failed to load circles:", error);
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
        .from("user_events")
        .select("event_id")
        .eq("user_id", viewerId)
        .eq("is_bookmarked", true);

      if (!userEvents || userEvents.length === 0) {
        // Fallback: show next upcoming events globally
        const { data: globalEvents } = await readClient
          .from("events")
          .select("id, slug, title, start_time, location")
          .eq("status", "confirmed")
          .gte("start_time", nowIso)
          .order("start_time", { ascending: true })
          .limit(UPCOMING_EVENTS_LIMIT);

        return (
          (globalEvents || []) as {
            id: string;
            slug: string | null;
            title: string | null;
            start_time: string;
            location: string | null;
          }[]
        ).map((e) => ({
          id: e.id,
          slug: e.slug || e.id,
          title: e.title || "Untitled Event",
          startTime: e.start_time,
          location: e.location,
          format: null,
        }));
      }

      const eventIds = userEvents.map(
        (ue: { event_id: string }) => ue.event_id,
      );

      const { data: events } = await readClient
        .from("events")
        .select("id, slug, title, start_time, location")
        .in("id", eventIds)
        .gte("start_time", nowIso)
        .order("start_time", { ascending: true })
        .limit(UPCOMING_EVENTS_LIMIT);

      return (
        (events || []) as {
          id: string;
          slug: string | null;
          title: string | null;
          start_time: string;
          location: string | null;
        }[]
      ).map((e) => ({
        id: e.id,
        slug: e.slug || e.id,
        title: e.title || "Untitled Event",
        startTime: e.start_time,
        location: e.location,
        format: null,
      }));
    } catch (error) {
      console.error("Failed to load upcoming events:", error);
      return [];
    }
  }
}
