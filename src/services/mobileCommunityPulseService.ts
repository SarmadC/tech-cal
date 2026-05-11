import { BlockService } from "@/services/blockService";
import type {
  CommunityFeedPost,
  MobileCommunityPulseCircle,
  CommunityUpcomingEvent,
  MobileCommunityPulsePreviewData,
} from "@/types/community";
import type { SupabaseClientType } from "@/types/database";

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
  member_count: number | null;
}

interface EventRow {
  id: string;
  slug: string | null;
  title: string | null;
  start_time: string;
  location: string | null;
}

const MOBILE_FEED_LIMIT = 3;
const MOBILE_FEED_FETCH_LIMIT = MOBILE_FEED_LIMIT * 3;
const MOBILE_COMMENT_FETCH_LIMIT = 120;
const MOBILE_COMMENT_PREVIEW_LIMIT = 2;
const MOBILE_CIRCLE_LIMIT = 6;
const MOBILE_UPCOMING_EVENT_LIMIT = 5;
const TRENDING_THRESHOLD = 8;

export class MobileCommunityPulseService {
  static async getPulsePreview({
    viewerId,
    readClient,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<MobileCommunityPulsePreviewData> {
    const [feed, circles, communityUpcomingEvents] = await Promise.all([
      this.getFeedPreview({ viewerId, readClient }),
      this.getCirclePreview({ viewerId, readClient }),
      this.getCommunityUpcomingEvents({ viewerId, readClient }),
    ]);

    return {
      feed,
      circles,
      communityUpcomingEvents,
    };
  }

  private static async getFeedPreview({
    viewerId,
    readClient,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<CommunityFeedPost[]> {
    try {
      const joinedCircleRows =
        (
          await readClient
            .from("circle_members")
            .select("circle_id")
            .eq("user_id", viewerId)
        ).data || [];
      const joinedCircleIds = (joinedCircleRows as { circle_id: string }[]).map(
        (membership) => membership.circle_id,
      );

      const { data: circleRows } = await readClient
        .from("circles")
        .select("id, slug, name");
      const circleMap = new Map<string, { slug: string; name: string }>(
        ((circleRows as CircleRow[] | null) ?? []).map((circle) => [
          circle.id,
          { slug: circle.slug, name: circle.name },
        ]),
      );

      let posts: FeedPostRow[] = [];

      if (joinedCircleIds.length > 0) {
        const { data: joinedPosts } = await readClient
          .from("circle_posts")
          .select(
            "id, content, created_at, author_id, circle_id, moderation_status",
          )
          .in("circle_id", joinedCircleIds)
          .eq("moderation_status", "active")
          .order("created_at", { ascending: false })
          .limit(MOBILE_FEED_FETCH_LIMIT);

        posts = (joinedPosts || []) as FeedPostRow[];
      }

      if (posts.length < MOBILE_FEED_LIMIT) {
        const existingIds = new Set(posts.map((post) => post.id));
        const { data: globalPosts } = await readClient
          .from("circle_posts")
          .select(
            "id, content, created_at, author_id, circle_id, moderation_status",
          )
          .eq("moderation_status", "active")
          .order("created_at", { ascending: false })
          .limit(MOBILE_FEED_FETCH_LIMIT);

        for (const post of (globalPosts || []) as FeedPostRow[]) {
          if (
            !existingIds.has(post.id) &&
            posts.length < MOBILE_FEED_FETCH_LIMIT
          ) {
            posts.push(post);
          }
        }
      }

      if (posts.length === 0) {
        return [];
      }

      const candidatePostIds = posts.map((post) => post.id);
      const { data: commentRows } = await readClient
        .from("circle_comments")
        .select("id, post_id, content, created_at, author_id")
        .in("post_id", candidatePostIds)
        .eq("moderation_status", "active")
        .order("created_at", { ascending: false })
        .limit(MOBILE_COMMENT_FETCH_LIMIT);
      const comments = (commentRows as FeedCommentRow[] | null) ?? [];

      const blockedUserIds = await BlockService.getBlockedUserIdsForViewer(
        viewerId,
        [
          ...new Set([
            ...posts.map((post) => post.author_id),
            ...comments.map((comment) => comment.author_id),
          ]),
        ],
        readClient,
      );

      const visiblePosts = posts
        .filter(
          (post) =>
            post.moderation_status === "active" &&
            !blockedUserIds.has(post.author_id),
        )
        .slice(0, MOBILE_FEED_LIMIT);

      if (visiblePosts.length === 0) {
        return [];
      }

      const visiblePostIds = new Set(visiblePosts.map((post) => post.id));
      const visibleComments = comments.filter(
        (comment) =>
          visiblePostIds.has(comment.post_id) &&
          !blockedUserIds.has(comment.author_id),
      );
      const authorIds = [
        ...new Set([
          ...visiblePosts.map((post) => post.author_id),
          ...visibleComments.map((comment) => comment.author_id),
        ]),
      ];

      const { data: profileRows } = await readClient
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds);
      const profileMap = new Map(
        ((profileRows as ProfileRow[] | null) ?? []).map((profile) => [
          profile.id,
          {
            id: profile.id,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
          },
        ]),
      );

      const commentCountByPost = new Map<string, number>();
      const commentPreviewByPost = new Map<
        string,
        CommunityFeedPost["recentComments"]
      >();

      for (const comment of visibleComments) {
        commentCountByPost.set(
          comment.post_id,
          (commentCountByPost.get(comment.post_id) ?? 0) + 1,
        );

        const previews = commentPreviewByPost.get(comment.post_id) ?? [];
        if (previews.length >= MOBILE_COMMENT_PREVIEW_LIMIT) {
          continue;
        }

        previews.push({
          id: comment.id,
          content: comment.content,
          createdAt: comment.created_at,
          author: profileMap.get(comment.author_id) ?? {
            id: comment.author_id,
            fullName: null,
            avatarUrl: null,
          },
        });
        commentPreviewByPost.set(comment.post_id, previews);
      }

      return visiblePosts.map((post) => ({
        id: post.id,
        content: post.content,
        createdAt: post.created_at,
        author: profileMap.get(post.author_id) ?? {
          id: post.author_id,
          fullName: null,
          avatarUrl: null,
        },
        circle: circleMap.get(post.circle_id) ?? {
          slug: "unknown",
          name: "Unknown Circle",
        },
        commentCount: commentCountByPost.get(post.id) ?? 0,
        isTrending:
          (commentCountByPost.get(post.id) ?? 0) >= TRENDING_THRESHOLD,
        recentComments: commentPreviewByPost.get(post.id) ?? [],
      }));
    } catch (error) {
      console.error("Failed to load mobile community pulse feed:", error);
      return [];
    }
  }

  private static async getCirclePreview({
    viewerId,
    readClient,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<MobileCommunityPulseCircle[]> {
    try {
      const circlesResult = await readClient
        .from("circles")
        .select("id, slug, name, description, member_count")
        .order("member_count", { ascending: false })
        .limit(MOBILE_CIRCLE_LIMIT);
      const membershipsResult = await readClient
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", viewerId);
      const joinedIds = new Set(
        ((membershipsResult.data || []) as { circle_id: string }[]).map(
          (membership) => membership.circle_id,
        ),
      );

      return ((circlesResult.data || []) as CircleRow[])
        .slice(0, MOBILE_CIRCLE_LIMIT)
        .map((circle) => ({
          id: circle.id,
          slug: circle.slug,
          name: circle.name,
          description: circle.description || "",
          isJoined: joinedIds.has(circle.id),
          memberCount: circle.member_count ?? 0,
        }));
    } catch (error) {
      console.error("Failed to load mobile community pulse circles:", error);
      return [];
    }
  }

  private static async getCommunityUpcomingEvents({
    viewerId,
    readClient,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<CommunityUpcomingEvent[]> {
    try {
      const nowIso = new Date().toISOString();
      const { data: trackedEvents } = await readClient
        .from("user_events")
        .select("event_id")
        .eq("user_id", viewerId)
        .eq("is_bookmarked", true)
        .limit(MOBILE_UPCOMING_EVENT_LIMIT * 3);
      const trackedEventIds = (
        (trackedEvents || []) as { event_id: string }[]
      ).map((trackedEvent) => trackedEvent.event_id);

      let events: EventRow[] = [];

      if (trackedEventIds.length > 0) {
        const { data: trackedEventRows } = await readClient
          .from("events")
          .select("id, slug, title, start_time, location")
          .in("id", trackedEventIds)
          .gte("start_time", nowIso)
          .order("start_time", { ascending: true })
          .limit(MOBILE_UPCOMING_EVENT_LIMIT);

        events = (trackedEventRows || []) as EventRow[];
      }

      if (events.length < MOBILE_UPCOMING_EVENT_LIMIT) {
        const existingIds = new Set(events.map((event) => event.id));
        const { data: globalEventRows } = await readClient
          .from("events")
          .select("id, slug, title, start_time, location")
          .eq("status", "confirmed")
          .gte("start_time", nowIso)
          .order("start_time", { ascending: true })
          .limit(MOBILE_UPCOMING_EVENT_LIMIT);

        for (const event of (globalEventRows || []) as EventRow[]) {
          if (
            !existingIds.has(event.id) &&
            events.length < MOBILE_UPCOMING_EVENT_LIMIT
          ) {
            events.push(event);
          }
        }
      }

      return events.slice(0, MOBILE_UPCOMING_EVENT_LIMIT).map((event) => ({
        id: event.id,
        slug: event.slug || event.id,
        title: event.title || "Untitled Event",
        startTime: event.start_time,
        location: event.location,
        format: null,
      }));
    } catch (error) {
      console.error("Failed to load mobile community pulse events:", error);
      return [];
    }
  }
}
