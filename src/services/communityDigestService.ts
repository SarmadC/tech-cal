import { SupabaseClientType } from '@/types';

export interface CircleDigestUpdate {
  circleId: string;
  circleName: string;
  newMemberCount: number;
  trendingEvents: string[]; // event titles or IDs
  activeDiscussionsCount: number; // Placeholder for future forums
}

export class CommunityDigestService {
  /**
   * Generates a weekly digest payload for a specific user containing updates
   * from the circles they have joined.
   * 
   * This is meant to be called by a cron job or background worker (e.g., Inngest or Vercel Cron)
   * that processes all active users weekly and dispatches emails via Resend.
   */
  static async getUserWeeklyCircleDigest(
    userId: string,
    readClient: SupabaseClientType
  ): Promise<CircleDigestUpdate[]> {
    // 1. Fetch user's joined circles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: joinedCircles, error: circleError } = await (readClient as any)
      .from('circle_members')
      .select(`
        circles (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', userId);

    if (circleError || !joinedCircles || joinedCircles.length === 0) {
      return [];
    }

    // Explicitly cast to help TS understand the join structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userCircles = joinedCircles.map((jc: any) => jc.circles).filter(Boolean);

    // 2. Query real data per circle
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoIso = oneWeekAgo.toISOString();
    const nowIso = now.toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const digestUpdates: CircleDigestUpdate[] = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userCircles.map(async (circle: any) => {
        // Count members who joined this circle in the last week
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: newMemberCount } = await (readClient as any)
          .from('circle_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('circle_id', circle.id)
          .gte('created_at', oneWeekAgoIso);

        // Fetch upcoming events whose tags overlap with the circle slug or name
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: eventsData } = await (readClient as any)
          .from('events_detailed')
          .select('title')
          .overlaps('tags', [circle.slug, circle.name.toLowerCase()])
          .gte('start_time', nowIso)
          .order('start_time', { ascending: true })
          .limit(3);

        const trendingEvents = ((eventsData || []) as { title: string }[])
          .map((e) => e.title)
          .filter(Boolean);

        return {
          circleId: circle.id,
          circleName: circle.name,
          newMemberCount: newMemberCount ?? 0,
          trendingEvents,
          activeDiscussionsCount: 0, // discussions feature coming soon
        };
      })
    );

    return digestUpdates;
  }

  /**
   * Helper function to determine if a user should receive a digest this week.
   * Usually dependent on their notification preferences and activity level.
   */
  static async shouldSendDigestToUser(
    userId: string,
    hasActiveSubscription: boolean,
    _readClient: SupabaseClientType
  ): Promise<boolean> {
    if (!hasActiveSubscription) return false;
    
    // Check user preferences from DB here in the future
    return true; 
  }
}
