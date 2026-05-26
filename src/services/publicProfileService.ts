import type { SupabaseClientType } from '@/types';
import { SocialProfileService } from '@/services/socialProfileService';


interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  linkedin_url: string | null;
  profile_visibility: string;
  show_attendance: boolean;
}

interface CareerProfileRow {
  user_id: string;
  current_role: string;
  seniority: string;
  industry: string;
  company_size: string | null;
  primary_skills: string[];
  skills_to_learn: string[];
  interests: string[];
  career_goals: string[];
  timeframe: string | null;
  target_path: string | null;
  learning_style: string[];
  networking_goals: string[];
  preferred_event_types: string[];
  updated_at: string;
}

interface EventRow {
  id: string;
  slug: string;
  title: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  user_events: Array<{
    user_id: string;
    activity_type: PublicProfileEventActivityType | null;
    role: string | null;
    status: 'attending' | 'attended' | 'cancelled' | null;
  }>;
}

export type PublicProfileEventActivityType =
  | 'attending'
  | 'attended'
  | 'saved'
  | 'speaking';

export interface PublicProfileEvent {
  id: string;
  slug: string;
  title: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  activityType: PublicProfileEventActivityType;
  role: string | null;
  mutualAttendeeCount: number | null;
  connectionsMadeCount: number | null;
}

export interface PublicCareerProfile {
  currentRole: string | null;
  seniority: string | null;
  industry: string | null;
  companySize: string | null;
  primarySkills: string[];
  skillsToLearn: string[];
  interests: string[];
  careerGoals: string[];
  timeframe: string | null;
  targetPath: string | null;
  learningStyle: string[];
  networkingGoals: string[];
  preferredEventTypes: string[];
  lastUpdated: string;
}

export interface MutualConnection {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
}

export interface PublicProfileResult {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string;
  headline: string | null;
  bio: string | null;
  showAttendance: boolean;
  isViewerOwner: boolean;
  followerCount: number;
  followingCount: number;
  location: string | null;
  linkedinUrl: string | null;
  recentAttendingEvents: PublicProfileEvent[];
  eventCounts: EventActivityCounts;
  careerProfile: PublicCareerProfile | null;
  mutualConnections: MutualConnection[];
  mutualConnectionsCount: number;
  sharedEventsCount: number;
  sharedTopics: string[];
  sharedCircles: SharedCircle[];
  sharedCirclesCount: number;
  recommendedBy: RecommendedBy[];
  sharedCareerGoals: string[];
}

export interface SharedCircle {
  id: string;
  slug: string;
  name: string;
}

export interface RecommendedBy {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface EventActivityCounts {
  attending: number;
  attended: number;
  speaking: number;
  saved: number;
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
      .select('id, full_name, avatar_url, username, headline, bio, location, linkedin_url, profile_visibility, show_attendance')
      .ilike('username', escapedUsername)
      .maybeSingle();

    if (profileError) {
      throw new Error('Failed to fetch public profile.');
    }

    return this.buildPublicProfileResult(
      (profile as ProfileRow | null) ?? null,
      viewerId,
      readClient
    );
  }

  static async getPublicProfileById(
    profileId: string,
    viewerId: string | null,
    readClient: SupabaseClientType
  ): Promise<PublicProfileResult | null> {
    const normalizedProfileId = profileId.trim();
    if (!normalizedProfileId) {
      return null;
    }

    const { data: profile, error: profileError } = await readClient
      .from('profiles')
      .select('id, full_name, avatar_url, username, headline, bio, location, linkedin_url, profile_visibility, show_attendance')
      .eq('id', normalizedProfileId)
      .maybeSingle();

    if (profileError) {
      throw new Error('Failed to fetch public profile.');
    }

    return this.buildPublicProfileResult(
      (profile as ProfileRow | null) ?? null,
      viewerId,
      readClient
    );
  }

  private static async buildPublicProfileResult(
    profile: ProfileRow | null,
    viewerId: string | null,
    readClient: SupabaseClientType
  ): Promise<PublicProfileResult | null> {

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

    const [
      statsResult,
      recentAttendingEvents,
      careerProfile,
      eventCounts,
      mutualConnectionsResult,
      sharedEventsCount,
      sharedTopics,
      sharedCirclesResult,
      recommendedBy,
      sharedCareerGoals,
    ] = await Promise.all([
      readClient
        .from('user_social_stats')
        .select('follower_count, following_count')
        .eq('user_id', typedProfile.id)
        .maybeSingle(),
      this.getRecentAttendingEvents({
        readClient,
        userId: typedProfile.id,
        viewerId,
        isViewerOwner,
        canViewAttendance: typedProfile.show_attendance || isViewerOwner,
      }),
      this.getCareerProfile(readClient, typedProfile.id),
      this.getEventActivityCounts(readClient, typedProfile.id),
      viewerId && !isViewerOwner
        ? this.getMutualConnections(readClient, typedProfile.id, viewerId)
        : Promise.resolve({ connections: [], count: 0 }),
      viewerId && !isViewerOwner
        ? this.getSharedEventsCount(readClient, typedProfile.id, viewerId)
        : Promise.resolve(0),
      viewerId && !isViewerOwner
        ? this.getSharedTopics(readClient, typedProfile.id, viewerId)
        : Promise.resolve([] as string[]),
      viewerId && !isViewerOwner
        ? this.getSharedCircles(readClient, typedProfile.id, viewerId)
        : Promise.resolve({ circles: [] as SharedCircle[], count: 0 }),
      viewerId && !isViewerOwner
        ? this.getRecommendedBy(readClient, typedProfile.id, viewerId)
        : Promise.resolve([] as RecommendedBy[]),
      viewerId && !isViewerOwner
        ? this.getSharedCareerGoals(readClient, typedProfile.id, viewerId)
        : Promise.resolve([] as string[]),
    ]);

    if (statsResult.error) {
      throw new Error('Failed to fetch public profile stats.');
    }

    return {
      id: typedProfile.id,
      fullName: typedProfile.full_name,
      avatarUrl: typedProfile.avatar_url,
      username: usernameValue,
      headline: typedProfile.headline,
      bio: typedProfile.bio,
      showAttendance: typedProfile.show_attendance,
      isViewerOwner,
      followerCount: statsResult.data?.follower_count ?? 0,
      followingCount: statsResult.data?.following_count ?? 0,
      location: typedProfile.location,
      linkedinUrl: typedProfile.linkedin_url,
      recentAttendingEvents,
      eventCounts,
      careerProfile,
      mutualConnections: mutualConnectionsResult.connections,
      mutualConnectionsCount: mutualConnectionsResult.count,
      sharedEventsCount,
      sharedTopics,
      sharedCircles: sharedCirclesResult.circles,
      sharedCirclesCount: sharedCirclesResult.count,
      recommendedBy,
      sharedCareerGoals,
    };
  }

  private static async getEventActivityCounts(
    readClient: SupabaseClientType,
    userId: string
  ): Promise<EventActivityCounts> {
    const empty: EventActivityCounts = {
      attending: 0,
      attended: 0,
      speaking: 0,
      saved: 0,
    };

    const { data, error } = await readClient
      .from('user_events')
      .select('activity_type')
      .eq('user_id', userId)
      .not('activity_type', 'is', null);

    if (error || !data) {
      return empty;
    }

    const counts: EventActivityCounts = { ...empty };
    const rows = data as unknown as Array<{
      activity_type: keyof EventActivityCounts | null;
    }>;
    for (const row of rows) {
      const key = row.activity_type;
      if (key && key in counts) {
        counts[key] += 1;
      }
    }
    return counts;
  }

  private static async getSharedCircles(
    readClient: SupabaseClientType,
    profileUserId: string,
    viewerId: string
  ): Promise<{ circles: SharedCircle[]; count: number }> {
    const { data, error } = await readClient
      .from('circle_members')
      .select('user_id, circle_id, membership_state')
      .in('user_id', [profileUserId, viewerId])
      .in('membership_state', ['joined', 'following']);

    if (error || !data) {
      return { circles: [], count: 0 };
    }

    const rows = data as Array<{
      user_id: string;
      circle_id: string;
      membership_state: string;
    }>;

    const viewerCircles = new Set<string>();
    const targetCircles = new Set<string>();
    for (const row of rows) {
      if (row.user_id === viewerId) viewerCircles.add(row.circle_id);
      else if (row.user_id === profileUserId) targetCircles.add(row.circle_id);
    }

    const sharedIds = [...viewerCircles].filter((id) => targetCircles.has(id));
    if (sharedIds.length === 0) {
      return { circles: [], count: 0 };
    }

    const { data: circleRows, error: circleError } = await readClient
      .from('circles')
      .select('id, slug, name, visibility')
      .in('id', sharedIds)
      .eq('visibility', 'public');

    if (circleError || !circleRows) {
      return { circles: [], count: 0 };
    }

    const visible = (circleRows as Array<{
      id: string;
      slug: string;
      name: string;
    }>).map((row) => ({ id: row.id, slug: row.slug, name: row.name }));

    return { circles: visible.slice(0, 2), count: visible.length };
  }

  private static async getRecommendedBy(
    readClient: SupabaseClientType,
    profileUserId: string,
    viewerId: string
  ): Promise<RecommendedBy[]> {
    const { data: viewerFollowing, error: viewerError } = await readClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', viewerId);

    if (viewerError || !viewerFollowing?.length) {
      return [];
    }

    const viewerFollowingIds = viewerFollowing.map((row) => row.following_id);

    // Of the people the viewer follows, who also follows the target?
    const { data: targetFollowers, error: targetError } = await readClient
      .from('follows')
      .select('follower_id')
      .eq('following_id', profileUserId)
      .in('follower_id', viewerFollowingIds);

    if (targetError || !targetFollowers?.length) {
      return [];
    }

    const recommenderIds = Array.from(
      new Set(targetFollowers.map((row) => row.follower_id))
    );

    const { data: profiles, error: profilesError } = await readClient
      .from('profiles')
      .select('id, full_name, username, avatar_url, profile_visibility')
      .in('id', recommenderIds);

    if (profilesError || !profiles) {
      return [];
    }

    const visible = (profiles as Array<{
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      profile_visibility: string;
    }>)
      .filter((p) => p.profile_visibility === 'public' && p.username)
      .slice(0, 1)
      .map((p) => ({
        id: p.id,
        username: p.username as string,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
      }));

    return visible;
  }

  private static async getSharedCareerGoals(
    readClient: SupabaseClientType,
    profileUserId: string,
    viewerId: string
  ): Promise<string[]> {
    const { data, error } = await readClient
      .from('career_profiles')
      .select('user_id, career_goals')
      .in('user_id', [profileUserId, viewerId]);

    if (error || !data) {
      return [];
    }

    const rows = data as Array<{
      user_id: string;
      career_goals: string[] | null;
    }>;

    const collect = (userId: string): Set<string> => {
      const row = rows.find((r) => r.user_id === userId);
      const out = new Set<string>();
      (row?.career_goals ?? []).forEach((value) => {
        const trimmed = value?.trim();
        if (trimmed) out.add(trimmed.toLocaleLowerCase());
      });
      return out;
    };

    const viewerGoals = collect(viewerId);
    const targetGoals = collect(profileUserId);

    const targetRow = rows.find((r) => r.user_id === profileUserId);
    const displayBySlug = new Map<string, string>();
    (targetRow?.career_goals ?? []).forEach((value) => {
      const trimmed = value?.trim();
      if (!trimmed) return;
      const key = trimmed.toLocaleLowerCase();
      if (!displayBySlug.has(key)) displayBySlug.set(key, trimmed);
    });

    const intersect: string[] = [];
    for (const slug of targetGoals) {
      if (viewerGoals.has(slug) && intersect.length < 2) {
        intersect.push(displayBySlug.get(slug) ?? slug);
      }
    }
    return intersect;
  }

  private static async getSharedTopics(
    readClient: SupabaseClientType,
    profileUserId: string,
    viewerId: string
  ): Promise<string[]> {
    const { data, error } = await readClient
      .from('career_profiles')
      .select('user_id, primary_skills, interests')
      .in('user_id', [profileUserId, viewerId]);

    if (error || !data) {
      return [];
    }

    const rows = data as Array<{
      user_id: string;
      primary_skills: string[] | null;
      interests: string[] | null;
    }>;

    const collect = (userId: string): Set<string> => {
      const row = rows.find((r) => r.user_id === userId);
      const out = new Set<string>();
      const push = (values: string[] | null | undefined) => {
        (values ?? []).forEach((value) => {
          const trimmed = value?.trim();
          if (trimmed) out.add(trimmed.toLocaleLowerCase());
        });
      };
      push(row?.primary_skills);
      push(row?.interests);
      return out;
    };

    const target = collect(profileUserId);
    const viewer = collect(viewerId);

    // Preserve casing from the target's stored values for display.
    const targetRow = rows.find((r) => r.user_id === profileUserId);
    const displayBySlug = new Map<string, string>();
    [...(targetRow?.primary_skills ?? []), ...(targetRow?.interests ?? [])].forEach(
      (value) => {
        const trimmed = value?.trim();
        if (!trimmed) return;
        const key = trimmed.toLocaleLowerCase();
        if (!displayBySlug.has(key)) displayBySlug.set(key, trimmed);
      }
    );

    const intersect: string[] = [];
    for (const slug of target) {
      if (viewer.has(slug) && intersect.length < 2) {
        intersect.push(displayBySlug.get(slug) ?? slug);
      }
    }
    return intersect;
  }

  private static async getSharedEventsCount(
    readClient: SupabaseClientType,
    profileUserId: string,
    viewerId: string
  ): Promise<number> {
    const { data: viewerRows, error: viewerError } = await readClient
      .from('user_events')
      .select('event_id')
      .eq('user_id', viewerId)
      .eq('status', 'attending');

    if (viewerError || !viewerRows?.length) {
      return 0;
    }

    const viewerEventIds = new Set(viewerRows.map((row) => row.event_id));

    const { data: profileRows, error: profileError } = await readClient
      .from('user_events')
      .select('event_id')
      .eq('user_id', profileUserId)
      .eq('status', 'attending')
      .in('event_id', Array.from(viewerEventIds));

    if (profileError) {
      return 0;
    }

    return profileRows?.length ?? 0;
  }

  private static async getCareerProfile(
    readClient: SupabaseClientType,
    userId: string
  ): Promise<PublicCareerProfile | null> {
    const { data, error } = await readClient
      .from('career_profiles')
      .select(
        'user_id, current_role, seniority, industry, company_size, primary_skills, skills_to_learn, interests, career_goals, timeframe, target_path, learning_style, networking_goals, preferred_event_types, updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as CareerProfileRow;

    return {
      currentRole: row.current_role,
      seniority: row.seniority,
      industry: row.industry,
      companySize: row.company_size,
      primarySkills: Array.isArray(row.primary_skills) ? row.primary_skills : [],
      skillsToLearn: Array.isArray(row.skills_to_learn) ? row.skills_to_learn : [],
      interests: Array.isArray(row.interests) ? row.interests : [],
      careerGoals: Array.isArray(row.career_goals) ? row.career_goals : [],
      timeframe: row.timeframe,
      targetPath: row.target_path,
      learningStyle: Array.isArray(row.learning_style) ? row.learning_style : [],
      networkingGoals: Array.isArray(row.networking_goals) ? row.networking_goals : [],
      preferredEventTypes: Array.isArray(row.preferred_event_types) ? row.preferred_event_types : [],
      lastUpdated: row.updated_at,
    };
  }

  private static async getMutualConnections(
    readClient: SupabaseClientType,
    profileUserId: string,
    viewerId: string
  ): Promise<{ connections: MutualConnection[]; count: number }> {
    // Get people that both users follow
    const { data: viewerFollowing, error: viewerError } = await readClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', viewerId);

    if (viewerError || !viewerFollowing?.length) {
      return { connections: [], count: 0 };
    }

    const viewerFollowingIds = viewerFollowing.map((f) => f.following_id);

    const { data: profileFollowing, error: profileError } = await readClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', profileUserId);

    if (profileError || !profileFollowing?.length) {
      return { connections: [], count: 0 };
    }

    const profileFollowingIds = new Set(profileFollowing.map((f) => f.following_id));

    // Find mutual follows (people both users follow)
    const mutualIds = viewerFollowingIds.filter((id) => profileFollowingIds.has(id));

    if (mutualIds.length === 0) {
      return { connections: [], count: 0 };
    }

    // Fetch all mutual profiles to check visibility and username
    const { data: allMutualProfiles, error: allProfilesError } = await readClient
      .from('profiles')
      .select('id, full_name, username, avatar_url, headline, profile_visibility')
      .in('id', mutualIds);

    if (allProfilesError || !allMutualProfiles) {
      return { connections: [], count: 0 };
    }

    // Filter to only public profiles with usernames (both required for display)
    const validProfiles = allMutualProfiles.filter(
      (p) => p.profile_visibility === 'public' && p.username
    );

    if (validProfiles.length === 0) {
      return { connections: [], count: 0 };
    }

    // Take first 6 valid profiles for display
    const displayProfiles = validProfiles.slice(0, 6);

    const connections: MutualConnection[] = displayProfiles.map((p) => ({
      id: p.id,
      fullName: p.full_name,
      username: p.username!,
      avatarUrl: p.avatar_url,
      headline: p.headline,
    }));

    return { connections, count: validProfiles.length };
  }

  private static async getRecentAttendingEvents({
    readClient,
    userId,
    viewerId,
    isViewerOwner,
    canViewAttendance,
  }: {
    readClient: SupabaseClientType;
    userId: string;
    viewerId: string | null;
    isViewerOwner: boolean;
    canViewAttendance: boolean;
  }): Promise<PublicProfileEvent[]> {
    if (!canViewAttendance) {
      return [];
    }

    // Pull a recency-ordered mix of all activity types (attending, attended,
    // saved, speaking). Upcoming events sort by soonest first; everything
    // else sorts by most recent.
    const now = new Date().toISOString();
    const limit = 6;

    const upcomingPromise = readClient
      .from('events')
      .select(
        'id, slug, title, start_time, end_time, location, user_events!inner(user_id, activity_type, role, status)'
      )
      .eq('user_events.user_id', userId)
      .in('user_events.activity_type', ['attending', 'speaking', 'saved'])
      .eq('status', 'confirmed')
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(limit);

    const pastPromise = readClient
      .from('events')
      .select(
        'id, slug, title, start_time, end_time, location, user_events!inner(user_id, activity_type, role, status)'
      )
      .eq('user_events.user_id', userId)
      .in('user_events.activity_type', ['attended', 'speaking'])
      .eq('status', 'confirmed')
      .lt('start_time', now)
      .order('start_time', { ascending: false })
      .limit(limit);

    const [upcomingResult, pastResult] = await Promise.all([
      upcomingPromise,
      pastPromise,
    ]);

    if (upcomingResult.error) {
      throw new Error('Failed to fetch upcoming events.');
    }
    if (pastResult.error) {
      throw new Error('Failed to fetch past events.');
    }

    const upcoming = (upcomingResult.data || []) as unknown as EventRow[];
    const past = (pastResult.data || []) as unknown as EventRow[];

    const combined = [...upcoming, ...past]
      .filter((event) => {
        const link = event.user_events?.[0];
        if (link?.activity_type === 'attending' || link?.activity_type === 'attended') {
          return link.status === 'attending' || link.status === 'attended';
        }
        return true;
      })
      .slice(0, limit);

    const events: PublicProfileEvent[] = combined.map((event) => {
      const link = event.user_events?.[0];
      const activityType = link?.activity_type
        ?? (new Date(event.start_time) >= new Date(now) ? 'attending' : 'attended');
      return {
        id: event.id,
        slug: event.slug,
        title: event.title || 'Untitled event',
        startTime: event.start_time,
        endTime: event.end_time,
        location: event.location,
        activityType,
        role: link?.role ?? null,
        mutualAttendeeCount: null,
        connectionsMadeCount: null,
      };
    });

    if (isViewerOwner && events.length > 0) {
      const eventIds = events.map((event) => event.id);
      // Cast: RPC is added in 20260523000000_event_connection_counts.sql.
      const { data: countRows, error: countError } = await (readClient.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: Array<{ event_id: string; connection_count: number }> | null; error: unknown }>)(
        'get_event_connection_counts_for_user',
        {
          p_user_id: userId,
          p_event_ids: eventIds,
        }
      );

      if (!countError && Array.isArray(countRows)) {
        const byId = new Map<string, number>();
        for (const row of countRows as Array<{ event_id: string; connection_count: number }>) {
          byId.set(row.event_id, row.connection_count);
        }
        for (const event of events) {
          const c = byId.get(event.id);
          event.connectionsMadeCount = c && c > 0 ? c : null;
        }
      }
    }

    if (viewerId && !isViewerOwner && events.length > 0) {
      const eventIds = events.map((event) => event.id);
      // Cast: RPC is added in 20260521000000_event_activity_model.sql; supabase
      // types will pick it up on next regeneration.
      const { data: mutualRows, error: mutualError } = await (readClient.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: Array<{ event_id: string; mutual_count: number }> | null; error: unknown }>)(
        'get_mutual_attendees_for_events',
        {
          p_viewer_id: viewerId,
          p_target_id: userId,
          p_event_ids: eventIds,
        }
      );

      if (!mutualError && Array.isArray(mutualRows)) {
        const countByEventId = new Map<string, number>();
        for (const row of mutualRows as Array<{ event_id: string; mutual_count: number }>) {
          countByEventId.set(row.event_id, row.mutual_count);
        }
        for (const event of events) {
          const count = countByEventId.get(event.id);
          event.mutualAttendeeCount = count && count > 0 ? count : null;
        }
      }
    }

    return events;
  }
}
