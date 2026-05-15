import type { SupabaseClientType } from '@/types/database';

export interface CommunityEventCard {
  id: string;
  slug: string;
  title: string;
  startTime: string;
  location: string | null;
  format: string | null;
  attendingFromCircleCount: number;
  rsvpState: 'none' | 'saved' | 'going';
  discussionCount: number;
}

export interface CommunityEventsData {
  circle: {
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
  };
  nextUp: CommunityEventCard[];
  thisMonth: CommunityEventCard[];
  past: CommunityEventCard[];
  popularWithMembers: CommunityEventCard[];
}

interface EventRow {
  id: string;
  slug: string | null;
  title: string | null;
  start_time: string;
  location: string | null;
  status: string | null;
}

export class CommunityEventsService {
  static async getEvents({
    slug,
    viewerId,
    readClient,
  }: {
    slug: string;
    viewerId: string | null;
    readClient: SupabaseClientType;
  }): Promise<CommunityEventsData | null> {
    const circleResult = await readClient
      .from('circles')
      .select(
        'id, slug, name, description, member_count, tagline, cover_image_url, icon_url, theme, topic_tags, location_scope, active_member_count_30d'
      )
      .eq('slug', slug)
      .maybeSingle();

    if (!circleResult.data) {
      return null;
    }
    const circle = circleResult.data as unknown as {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      member_count: number;
      tagline: string | null;
      cover_image_url: string | null;
      icon_url: string | null;
      theme: string | null;
      topic_tags: string[] | null;
      location_scope: string | null;
      active_member_count_30d: number | null;
    };

    const linksResult = await readClient
      .from('circle_event_links')
      .select('event_id')
      .eq('circle_id', circle.id);
    const eventIds = (
      (linksResult.data ?? []) as Array<{ event_id: string }>
    ).map((l) => l.event_id);

    const empty: CommunityEventsData = {
      circle: this.toCircle(
        circle,
        viewerId
          ? await this.getViewerMembership(circle.id, viewerId, readClient)
          : 'none',
        eventIds.length
      ),
      nextUp: [],
      thisMonth: [],
      past: [],
      popularWithMembers: [],
    };

    if (eventIds.length === 0) {
      return empty;
    }

    const eventsResult = await readClient
      .from('events')
      .select('id, slug, title, start_time, location, status')
      .in('id', eventIds);
    const events = (eventsResult.data ?? []) as EventRow[];

    // RSVP / saved counts per event from circle members
    const memberRowsResult = await readClient
      .from('circle_members')
      .select('user_id')
      .eq('circle_id', circle.id);
    const memberIds = (
      (memberRowsResult.data ?? []) as Array<{ user_id: string }>
    ).map((m) => m.user_id);

    const userEventsResult =
      memberIds.length > 0
        ? await readClient
            .from('user_events')
            .select('event_id, user_id, is_bookmarked')
            .in('event_id', eventIds)
            .in('user_id', memberIds)
        : { data: [] as unknown[] };
    const userEventRows = (userEventsResult.data ?? []) as Array<{
      event_id: string;
      user_id: string;
      is_bookmarked: boolean | null;
    }>;

    const attendingByEvent = new Map<string, number>();
    for (const row of userEventRows) {
      attendingByEvent.set(
        row.event_id,
        (attendingByEvent.get(row.event_id) ?? 0) + 1
      );
    }

    let viewerRsvpByEvent = new Map<string, 'none' | 'saved' | 'going'>();
    if (viewerId) {
      const viewerRsvps = userEventRows.filter((r) => r.user_id === viewerId);
      viewerRsvpByEvent = new Map(
        viewerRsvps.map((r) => [
          r.event_id,
          r.is_bookmarked ? ('saved' as const) : ('going' as const),
        ])
      );
    }

    // Discussion counts via circle_posts.event_id
    const discussionResult = await (
      readClient as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            in: (
              col: string,
              vals: string[]
            ) => Promise<{ data: Array<{ event_id: string | null }> | null }>;
          };
        };
      }
    )
      .from('circle_posts')
      .select('event_id')
      .in('event_id', eventIds);
    const discussionRows = (discussionResult.data ?? []) as Array<{
      event_id: string | null;
    }>;
    const discussionByEvent = new Map<string, number>();
    for (const r of discussionRows) {
      if (!r.event_id) continue;
      discussionByEvent.set(
        r.event_id,
        (discussionByEvent.get(r.event_id) ?? 0) + 1
      );
    }

    const toCard = (e: EventRow): CommunityEventCard => ({
      id: e.id,
      slug: e.slug ?? e.id,
      title: e.title ?? 'Untitled Event',
      startTime: e.start_time,
      location: e.location,
      format: null,
      attendingFromCircleCount: attendingByEvent.get(e.id) ?? 0,
      rsvpState: viewerRsvpByEvent.get(e.id) ?? 'none',
      discussionCount: discussionByEvent.get(e.id) ?? 0,
    });

    const nowMs = Date.now();
    const monthFromNow = nowMs + 30 * 24 * 60 * 60 * 1000;

    const upcoming = events
      .filter((e) => Date.parse(e.start_time) >= nowMs && e.status !== 'cancelled')
      .sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));
    const past = events
      .filter((e) => Date.parse(e.start_time) < nowMs)
      .sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time));

    const nextUp = upcoming.slice(0, 1).map(toCard);
    const thisMonth = upcoming
      .slice(1)
      .filter((e) => Date.parse(e.start_time) <= monthFromNow)
      .map(toCard);
    const popularWithMembers = [...events]
      .map(toCard)
      .sort((a, b) => b.attendingFromCircleCount - a.attendingFromCircleCount)
      .slice(0, 6);

    return {
      circle: empty.circle,
      nextUp,
      thisMonth,
      past: past.slice(0, 12).map(toCard),
      popularWithMembers,
    };
  }

  private static async getViewerMembership(
    circleId: string,
    viewerId: string,
    readClient: SupabaseClientType
  ): Promise<'none' | 'following' | 'joined'> {
    const result = await readClient
      .from('circle_members')
      .select('membership_state')
      .eq('circle_id', circleId)
      .eq('user_id', viewerId)
      .maybeSingle();
    const row = result.data as { membership_state?: string | null } | null;
    if (!row) return 'none';
    return row.membership_state === 'following' ? 'following' : 'joined';
  }

  private static toCircle(
    row: {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      member_count: number;
      tagline: string | null;
      cover_image_url: string | null;
      icon_url: string | null;
      theme: string | null;
      topic_tags: string[] | null;
      location_scope: string | null;
      active_member_count_30d: number | null;
    },
    membershipState: 'none' | 'following' | 'joined',
    upcomingEventCount: number
  ): CommunityEventsData['circle'] {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description ?? '',
      memberCount: row.member_count,
      membershipState,
      tagline: row.tagline,
      coverImageUrl: row.cover_image_url,
      iconUrl: row.icon_url,
      theme: row.theme,
      topicTags: row.topic_tags ?? [],
      locationScope: row.location_scope,
      activeMemberCount30d: row.active_member_count_30d ?? 0,
      upcomingEventCount,
    };
  }
}
