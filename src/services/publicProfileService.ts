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
  location: string | null;
}



export interface PublicProfileEvent {
  id: string;
  slug: string;
  title: string;
  startTime: string;
  location: string | null;
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
  showAttendance: boolean;
  isViewerOwner: boolean;
  followerCount: number;
  followingCount: number;
  recentAttendingEvents: PublicProfileEvent[];
  careerProfile: PublicCareerProfile | null;
  mutualConnections: MutualConnection[];
  mutualConnectionsCount: number;
  sharedEventsCount: number;
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
      .select('id, full_name, avatar_url, username, headline, profile_visibility, show_attendance')
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
      mutualConnectionsResult,
      sharedEventsCount,
    ] = await Promise.all([
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
      this.getCareerProfile(readClient, typedProfile.id),
      viewerId && !isViewerOwner
        ? this.getMutualConnections(readClient, typedProfile.id, viewerId)
        : Promise.resolve({ connections: [], count: 0 }),
      viewerId && !isViewerOwner
        ? this.getSharedEventsCount(readClient, typedProfile.id, viewerId)
        : Promise.resolve(0),
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
      showAttendance: typedProfile.show_attendance,
      isViewerOwner,
      followerCount: statsResult.data?.follower_count ?? 0,
      followingCount: statsResult.data?.following_count ?? 0,
      recentAttendingEvents,
      careerProfile,
      mutualConnections: mutualConnectionsResult.connections,
      mutualConnectionsCount: mutualConnectionsResult.count,
      sharedEventsCount,
    };
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
    canViewAttendance,
  }: {
    readClient: SupabaseClientType;
    userId: string;
    canViewAttendance: boolean;
  }): Promise<PublicProfileEvent[]> {
    if (!canViewAttendance) {
      return [];
    }

    // Get upcoming events first (next 5), then past events if needed
    // This uses a join with user_events to get only events the user is attending
    const now = new Date().toISOString();

    // First try to get upcoming events
    const { data: upcomingEvents, error: upcomingError } = await readClient
      .from('events')
      .select('id, slug, title, start_time, location, user_events!inner(user_id)')
      .eq('user_events.user_id', userId)
      .eq('user_events.status', 'attending')
      .eq('status', 'confirmed')
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(5);

    if (upcomingError) {
      throw new Error('Failed to fetch upcoming events.');
    }

    const upcoming = (upcomingEvents || []) as unknown as EventRow[];

    // If we have upcoming events, return them
    if (upcoming.length > 0) {
      return upcoming.map((event) => ({
        id: event.id,
        slug: event.slug,
        title: event.title || 'Untitled event',
        startTime: event.start_time,
        location: event.location,
      }));
    }

    // Otherwise, get the most recent past events
    const { data: pastEvents, error: pastError } = await readClient
      .from('events')
      .select('id, slug, title, start_time, location, user_events!inner(user_id)')
      .eq('user_events.user_id', userId)
      .eq('user_events.status', 'attending')
      .eq('status', 'confirmed')
      .lt('start_time', now)
      .order('start_time', { ascending: false })
      .limit(5);

    if (pastError) {
      throw new Error('Failed to fetch past events.');
    }

    return ((pastEvents || []) as unknown as EventRow[]).map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title || 'Untitled event',
      startTime: event.start_time,
      location: event.location,
    }));
  }
}
