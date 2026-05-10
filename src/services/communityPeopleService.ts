import type { SupabaseClientType } from '@/types/database';

export interface CommunityPerson {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  headline: string | null;
  contextLabel: string | null;
  sharedEventId: string | null;
  sharedEventTitle: string | null;
}

export interface CommunityPeopleData {
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
  peopleForYou: CommunityPerson[];
  activeMembers: CommunityPerson[];
  goingToNextEvent: CommunityPerson[];
  mutuals: CommunityPerson[];
  newMembers: CommunityPerson[];
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  headline: string | null;
}

interface MemberRow {
  user_id: string;
  membership_state: string | null;
  created_at: string;
  last_visited_at: string | null;
}

const SECTION_LIMIT = 12;

export class CommunityPeopleService {
  static async getPeople({
    slug,
    viewerId,
    readClient,
  }: {
    slug: string;
    viewerId: string | null;
    readClient: SupabaseClientType;
  }): Promise<CommunityPeopleData | null> {
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

    const membersResult = await readClient
      .from('circle_members')
      .select('user_id, membership_state, created_at, last_visited_at')
      .eq('circle_id', circle.id);
    const memberRows = (membersResult.data ?? []) as unknown as MemberRow[];

    const memberIds = memberRows.map((m) => m.user_id);

    let viewerMembershipState: 'none' | 'following' | 'joined' = 'none';
    if (viewerId) {
      const viewerMember = memberRows.find((m) => m.user_id === viewerId);
      if (viewerMember) {
        viewerMembershipState =
          viewerMember.membership_state === 'following'
            ? 'following'
            : 'joined';
      }
    }

    if (memberIds.length === 0) {
      return {
        circle: this.toCircle(circle, viewerMembershipState),
        peopleForYou: [],
        activeMembers: [],
        goingToNextEvent: [],
        mutuals: [],
        newMembers: [],
      };
    }

    const profilesResult = await readClient
      .from('profiles')
      .select('id, full_name, username, avatar_url, headline')
      .in('id', memberIds);
    const profiles = (profilesResult.data ?? []) as ProfileRow[];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const toPerson = (
      userId: string,
      contextLabel: string | null = null,
      sharedEventId: string | null = null,
      sharedEventTitle: string | null = null
    ): CommunityPerson => {
      const profile = profileMap.get(userId);
      return {
        id: userId,
        fullName: profile?.full_name ?? null,
        username: profile?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        headline: profile?.headline ?? null,
        contextLabel,
        sharedEventId,
        sharedEventTitle,
      };
    };

    const sortedByCreated = [...memberRows].sort(
      (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
    );
    const newMembers = sortedByCreated
      .slice(0, SECTION_LIMIT)
      .map((m) => toPerson(m.user_id, 'Just joined'));

    const sortedByActivity = [...memberRows].sort((a, b) => {
      const av = a.last_visited_at ? Date.parse(a.last_visited_at) : 0;
      const bv = b.last_visited_at ? Date.parse(b.last_visited_at) : 0;
      return bv - av;
    });
    const activeMembers = sortedByActivity
      .filter((m) => m.last_visited_at)
      .slice(0, SECTION_LIMIT)
      .map((m) => toPerson(m.user_id, 'Active recently'));

    // Going to next event — look for any upcoming event linked to circle, then user_events.
    const nowIso = new Date().toISOString();
    const linkResult = await readClient
      .from('circle_event_links')
      .select('event_id')
      .eq('circle_id', circle.id);
    const linkedEventIds = (
      (linkResult.data ?? []) as Array<{ event_id: string }>
    ).map((l) => l.event_id);

    let goingToNextEvent: CommunityPerson[] = [];
    if (linkedEventIds.length > 0) {
      const upcomingEventsResult = await readClient
        .from('events')
        .select('id, title, start_time, status')
        .in('id', linkedEventIds)
        .gte('start_time', nowIso)
        .order('start_time', { ascending: true })
        .limit(1);
      const nextEvent = (upcomingEventsResult.data ?? [])[0] as
        | { id: string; title: string | null; start_time: string }
        | undefined;

      if (nextEvent) {
        const rsvpResult = await readClient
          .from('user_events')
          .select('user_id')
          .eq('event_id', nextEvent.id)
          .in('user_id', memberIds);
        const rsvpUsers = (
          (rsvpResult.data ?? []) as Array<{ user_id: string }>
        ).map((r) => r.user_id);
        goingToNextEvent = rsvpUsers
          .slice(0, SECTION_LIMIT)
          .map((id) =>
            toPerson(id, 'Going to next event', nextEvent.id, nextEvent.title)
          );
      }
    }

    // People for you — heuristic: members with a headline who aren't the viewer.
    const peopleForYou = memberRows
      .filter((m) => m.user_id !== viewerId)
      .slice(0, SECTION_LIMIT)
      .map((m) => toPerson(m.user_id, 'In your community'));

    // Mutuals — placeholder: first 6 of peopleForYou. Real mutuals require a follow graph.
    const mutuals = peopleForYou.slice(0, 6).map((p) => ({
      ...p,
      contextLabel: 'In multiple shared communities',
    }));

    return {
      circle: this.toCircle(circle, viewerMembershipState),
      peopleForYou,
      activeMembers,
      goingToNextEvent,
      mutuals,
      newMembers,
    };
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
    membershipState: 'none' | 'following' | 'joined'
  ): CommunityPeopleData['circle'] {
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
      upcomingEventCount: 0,
    };
  }
}
