import { BlockService } from '@/services/blockService';
import type { CommunityLaunchpadData, CommunityLaunchpadMember } from '@/types/community';
import type { SupabaseClientType } from '@/types/database';

interface ViewerProfileRow {
  username: string | null;
  headline: string | null;
  profile_visibility: string;
}

interface CareerProfileRow {
  interests: string[] | null;
}

interface FeaturedProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  headline: string | null;
  created_at: string | null;
}

interface SocialStatsRow {
  user_id: string;
  follower_count: number;
  following_count: number;
}

interface UpcomingEventRow {
  id: string;
  slug: string | null;
  title: string | null;
  start_time: string;
  location: string | null;
}

const PUBLIC_PROFILE_THRESHOLD = 50;
const WEEKLY_ACTIVE_THRESHOLD = 100;
const THIS_WEEK_WINDOW_DAYS = 7;
const FEATURED_MEMBERS_LIMIT = 8;
const FEATURED_MEMBERS_FETCH_LIMIT = 30;
const INVITE_TARGET = 3;

export class CommunityLaunchpadService {
  static shouldShowLaunchpad({
    publicProfileCount,
    weeklyActiveCommunityUsers,
  }: {
    publicProfileCount: number;
    weeklyActiveCommunityUsers: number;
  }): boolean {
    return (
      publicProfileCount < PUBLIC_PROFILE_THRESHOLD ||
      weeklyActiveCommunityUsers < WEEKLY_ACTIVE_THRESHOLD
    );
  }

  static async getLaunchpadData({
    viewerId,
    viewerScopedClient,
    readClient,
  }: {
    viewerId: string;
    viewerScopedClient: SupabaseClientType;
    readClient: SupabaseClientType;
  }): Promise<CommunityLaunchpadData> {
    const weekAgoIso = new Date(
      Date.now() - THIS_WEEK_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const nowIso = new Date().toISOString();

    const [
      publicProfilesResult,
      weeklyActiveUsersResult,
      viewerProfileResult,
      careerProfileResult,
      featuredProfilesResult,
      upcomingEventResult,
    ] = await Promise.all([
      readClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('profile_visibility', 'public')
        .not('username', 'is', null),
      readClient
        .from('user_social_stats')
        .select('user_id', { count: 'exact', head: true })
        .gte('updated_at', weekAgoIso),
      readClient
        .from('profiles')
        .select('username, headline, profile_visibility')
        .eq('id', viewerId)
        .maybeSingle(),
      readClient
        .from('career_profiles')
        .select('interests')
        .eq('user_id', viewerId)
        .maybeSingle(),
      readClient
        .from('profiles')
        .select('id, full_name, avatar_url, username, headline, created_at')
        .eq('profile_visibility', 'public')
        .not('username', 'is', null)
        .order('created_at', { ascending: false })
        .limit(FEATURED_MEMBERS_FETCH_LIMIT),
      readClient
        .from('events')
        .select('id, slug, title, start_time, location')
        .eq('status', 'confirmed')
        .gte('start_time', nowIso)
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (publicProfilesResult.error) {
      throw new Error('Failed to load public profile count for launchpad.');
    }

    if (weeklyActiveUsersResult.error) {
      throw new Error('Failed to load weekly activity metrics for launchpad.');
    }

    if (viewerProfileResult.error) {
      throw new Error('Failed to load viewer profile for launchpad.');
    }

    if (featuredProfilesResult.error) {
      throw new Error('Failed to load featured members for launchpad.');
    }

    const viewerProfile = (viewerProfileResult.data || null) as ViewerProfileRow | null;
    const careerProfile = (careerProfileResult.data || null) as CareerProfileRow | null;
    const featuredProfiles = (featuredProfilesResult.data || []) as FeaturedProfileRow[];
    const upcomingEvent = (upcomingEventResult.data || null) as UpcomingEventRow | null;

    if (careerProfileResult.error) {
      console.error('Career profile interests could not be loaded for launchpad:', careerProfileResult.error);
    }

    if (upcomingEventResult.error) {
      console.error('Upcoming community event could not be loaded for launchpad:', upcomingEventResult.error);
    }

    const publicProfileCount = publicProfilesResult.count ?? 0;
    const weeklyActiveCommunityUsers = weeklyActiveUsersResult.count ?? 0;

    const interestCount = Array.isArray(careerProfile?.interests)
      ? careerProfile.interests.filter((interest) => typeof interest === 'string' && interest.trim().length > 0).length
      : 0;

    const hasHeadline = Boolean(viewerProfile?.headline?.trim());
    const isPublic = viewerProfile?.profile_visibility === 'public';

    const tasks = [
      {
        id: 'add_headline' as const,
        title: 'Add headline',
        description: 'Add a concise one-line summary so people can quickly understand your focus.',
        completed: hasHeadline,
        weight: 20,
        ctaLabel: 'Add headline',
        ctaHref: '/dashboard/settings?tab=profile',
        telemetryEvent: 'profile_completion_started' as const,
      },
      {
        id: 'pick_interests' as const,
        title: 'Pick 3 interests',
        description: `Choose at least 3 interests in your career profile. Current: ${interestCount}.`,
        completed: interestCount >= 3,
        weight: 30,
        ctaLabel: 'Edit interests',
        ctaHref: '/dashboard/settings?tab=career',
        telemetryEvent: 'profile_completion_started' as const,
      },
      {
        id: 'set_profile_public' as const,
        title: 'Set profile public',
        description: 'Switch visibility to public so people can discover and follow you.',
        completed: isPublic,
        weight: 50,
        ctaLabel: 'Update visibility',
        ctaHref: '/dashboard/settings?tab=profile',
        telemetryEvent: 'profile_completion_started' as const,
      },
    ];

    const completedWeight = tasks
      .filter((task) => task.completed)
      .reduce((sum, task) => sum + task.weight, 0);
    const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);
    const completionPercent = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

    const featuredMembers = await this.getFeaturedMembers({
      viewerId,
      viewerScopedClient,
      readClient,
      featuredProfiles,
    });

    return {
      showLaunchpad: this.shouldShowLaunchpad({
        publicProfileCount,
        weeklyActiveCommunityUsers,
      }),
      metrics: {
        publicProfileCount,
        weeklyActiveCommunityUsers,
        publicProfileThreshold: PUBLIC_PROFILE_THRESHOLD,
        weeklyActiveThreshold: WEEKLY_ACTIVE_THRESHOLD,
      },
      progress: {
        completionPercent,
        completedWeight,
        totalWeight,
        tasks,
      },
      featuredMembers,
      circles: [
        {
          id: 'ai',
          name: 'AI Circle',
          description: 'Find builders shipping LLM apps, agents, and infra this quarter.',
          href: '/events',
        },
        {
          id: 'product',
          name: 'Product Circle',
          description: 'Connect with PMs focused on launch strategy and execution.',
          href: '/events',
        },
        {
          id: 'design',
          name: 'Design Circle',
          description: 'Join UX peers working on interaction quality and product polish.',
          href: '/events',
        },
        {
          id: 'founder',
          name: 'Founder Circle',
          description: 'Meet founders navigating traction, hiring, and go-to-market.',
          href: '/events',
        },
      ],
      weeklyPrompt: {
        title: 'Weekly prompt',
        body: 'What are you building this week? Add it to your headline so collaborators can find you.',
        actionLabel: 'Update headline',
        actionHref: '/dashboard/settings?tab=profile',
      },
      upcomingEvent: upcomingEvent
        ? {
            id: upcomingEvent.id,
            slug: upcomingEvent.slug || upcomingEvent.id,
            title: upcomingEvent.title || 'Upcoming community event',
            startTime: upcomingEvent.start_time,
            location: upcomingEvent.location,
            href: `/events/${upcomingEvent.slug || upcomingEvent.id}`,
          }
        : null,
      starterResources: [
        {
          id: 'resource-tech-events-2026',
          title: 'Tech Events Calendar 2026',
          description: 'Curated calendar of high-signal events by category, date, and location.',
          href: '/resources/tech-events-calendar-2026',
        },
        {
          id: 'resource-cfp-calendar',
          title: 'CFP Calendar',
          description: 'Track open call-for-proposals windows and speaking opportunities.',
          href: '/resources/cfp-calendar',
        },
        {
          id: 'resource-blog',
          title: 'Community Guides',
          description: 'Read practical playbooks and updates from the Kure-Cal team.',
          href: '/blog',
        },
      ],
      inviteTarget: INVITE_TARGET,
    };
  }

  private static async getFeaturedMembers({
    viewerId,
    viewerScopedClient,
    readClient,
    featuredProfiles,
  }: {
    viewerId: string;
    viewerScopedClient: SupabaseClientType;
    readClient: SupabaseClientType;
    featuredProfiles: FeaturedProfileRow[];
  }): Promise<CommunityLaunchpadMember[]> {
    const candidates = featuredProfiles.filter((profile) => profile.id !== viewerId);
    const candidateIds = candidates.map((profile) => profile.id);
    const blockedIds = await BlockService.getBlockedUserIdsForViewer(
      viewerId,
      candidateIds,
      viewerScopedClient
    );

    const visibleCandidates = candidates.filter((profile) => !blockedIds.has(profile.id));
    const visibleIds = visibleCandidates.map((profile) => profile.id);

    const statsResult = visibleIds.length > 0
      ? await readClient
          .from('user_social_stats')
          .select('user_id, follower_count, following_count')
          .in('user_id', visibleIds)
      : { data: [], error: null };

    if (statsResult.error) {
      throw new Error('Failed to load social stats for featured members.');
    }

    const statsByUserId = new Map<string, SocialStatsRow>(
      ((statsResult.data || []) as SocialStatsRow[]).map((row) => [row.user_id, row])
    );

    return visibleCandidates
      .map((profile) => {
        const stats = statsByUserId.get(profile.id);
        return {
          id: profile.id,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          username: profile.username,
          headline: profile.headline,
          followerCount: stats?.follower_count ?? 0,
          followingCount: stats?.following_count ?? 0,
          joinedAt: profile.created_at ? Date.parse(profile.created_at) : 0,
        };
      })
      .sort((left, right) => {
        if (right.followerCount !== left.followerCount) {
          return right.followerCount - left.followerCount;
        }
        return right.joinedAt - left.joinedAt;
      })
      .slice(0, FEATURED_MEMBERS_LIMIT)
      .map(({ joinedAt: _joinedAt, ...member }) => member);
  }
}
