import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';
import { differenceInCalendarDays, subDays } from 'date-fns';

type TelemetryRow = Database['public']['Tables']['telemetry_events']['Row'];
type JsonRecord = Record<string, unknown>;

type SkillProficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface TelemetrySummary {
  timeWindow: {
    from: string;
    to: string;
    days: number;
  };
  totals: {
    events: number;
    uniqueUsers: number;
  };
  eventsByType: Array<{
    eventType: string;
    count: number;
    uniqueUsers: number;
  }>;
  skillRatings: {
    totalRatings: number;
    skills: Array<{
      skill: string;
      total: number;
      proficiencyCounts: Record<SkillProficiency, number>;
    }>;
  };
  recommendationInteractions: {
    totalInteractions: number;
    byType: Array<{
      interactionType: string;
      count: number;
      uniqueUsers: number;
      avgPosition?: number | null;
    }>;
  };
  recommendationBatches: {
    totalBatches: number;
    avgReturnedCount: number | null;
    topTags: Array<{ tag: string; count: number }>;
  };
  socialStageGates: {
    denominator: {
      consentedActiveUsers: number;
      note: string;
    };
    phaseA: {
      attendanceOptInUsers: number;
      attendanceOptInRate: number | null;
      whosGoingImpressions: number;
      whosGoingClicks: number;
      whosGoingCtr: number | null;
    };
    phaseB: {
      usersWhoFollowed: number;
      followAdoptionRate: number | null;
      profileViews: number;
      followToReturnUsers: number;
      followToReturnCohortUsers: number;
      followToReturnRate: number | null;
    };
    phaseC: {
      networkBadgeImpressions: number;
      networkBadgeClicks: number;
      networkBadgeCtr: number | null;
      discoveryAttendanceToggleCount: number;
      discoveryAttendanceToggleUsers: number;
      discoveryAttendanceToggleRate: number | null;
      discoveryAttendanceToggleSetCount: number;
      discoveryAttendanceToggleClearCount: number;
      discoveryAttendanceToggleUnknownActionCount: number;
      discoveryAttendanceToggleBySurface: Array<{
        surface: string;
        count: number;
      }>;
      retentionFollowersReturnRate: number | null;
      retentionNonFollowersReturnRate: number | null;
      retentionDelta: number | null;
      retentionFollowersCohortUsers: number;
      retentionNonFollowersCohortUsers: number;
    };
  };
  rawSampleSize: number;
  truncated: boolean;
}

interface SummaryOptions {
  days?: number;
  maxEvents?: number;
}

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const DEFAULT_MAX_EVENTS = 10_000;
const RETENTION_WINDOW_DAYS = 7;
const RETENTION_WINDOW_MS = RETENTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const MIN_RETURN_DELAY_MS = 24 * 60 * 60 * 1000;

const RETURN_EVENT_TYPES = new Set([
  'profile_view',
  'follow_action',
  'recommendation_interaction',
  'recommendation_batch_displayed',
  'discovery_card_click',
  'discovery_filter_changed',
  'discovery_ranking_changed',
  'discovery_feedback_action',
  'discovery_save_action',
  'discovery_attendance_toggle',
  'discovery_shortlist_action',
  'whos_going_click',
  'network_badge_click',
  'attendance_opt_in',
  'skill_rating_saved',
  'skill_removed'
]);

const PROFICIENCIES: SkillProficiency[] = ['beginner', 'intermediate', 'advanced', 'expert'];

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

function hasReturnWithinWindow(eventTimestamps: number[], anchorTimestamp: number): boolean {
  const minReturnTimestamp = anchorTimestamp + MIN_RETURN_DELAY_MS;
  const maxReturnTimestamp = anchorTimestamp + RETENTION_WINDOW_MS;

  for (const timestamp of eventTimestamps) {
    if (timestamp < minReturnTimestamp) {
      continue;
    }
    if (timestamp > maxReturnTimestamp) {
      break;
    }
    return true;
  }

  return false;
}

export class TelemetryAnalyticsService {
  static async getSummary(
    supabaseClient: SupabaseClientType,
    options: SummaryOptions = {}
  ): Promise<TelemetrySummary> {
    const days = Math.min(Math.max(Math.floor(options.days ?? DEFAULT_DAYS), 1), MAX_DAYS);
    const maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;

    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);

    const { data, error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('telemetry_events')
      .select('id, event_type, user_id, occurred_at, metadata, context')
      .gte('occurred_at', startDate.toISOString())
      .lte('occurred_at', endDate.toISOString())
      .order('occurred_at', { ascending: false })
      .limit(maxEvents);

    if (error) {
      throw error;
    }

    const events = (data || []) as TelemetryRow[];

    const uniqueUsers = new Set<string>();
    const eventsByTypeMap = new Map<string, { count: number; users: Set<string> }>();
    const skillStats = new Map<
      string,
      {
        total: number;
        proficiencyCounts: Record<SkillProficiency, number>;
      }
    >();
    const interactionStats = new Map<
      string,
      { count: number; users: Set<string>; positions: number[] }
    >();
    const consentedActiveUsers = new Set<string>();
    const attendanceOptInUsers = new Set<string>();
    const usersWhoFollowed = new Set<string>();
    const userEventTimestamps = new Map<string, number[]>();
    const userReturnEventTimestamps = new Map<string, number[]>();
    const followEventTimestamps = new Map<string, number[]>();
    let whosGoingImpressions = 0;
    let whosGoingClicks = 0;
    let profileViews = 0;
    let networkBadgeImpressions = 0;
    let networkBadgeClicks = 0;
    let discoveryAttendanceToggleCount = 0;
    let discoveryAttendanceToggleSetCount = 0;
    let discoveryAttendanceToggleClearCount = 0;
    let discoveryAttendanceToggleUnknownActionCount = 0;
    const discoveryAttendanceToggleUsers = new Set<string>();
    const discoveryAttendanceToggleBySurface = new Map<string, number>();
    const batchStats = {
      total: 0,
      totalReturned: 0,
      countedReturned: 0,
      tagCounts: new Map<string, number>()
    };

    const addUser = (userId?: string | null, fallbackContext?: JsonRecord) => {
      if (userId) {
        uniqueUsers.add(userId);
        return userId;
      }
      const anonId =
        (isPlainObject(fallbackContext) && typeof fallbackContext.anonymousId === 'string'
          ? fallbackContext.anonymousId
          : undefined) ?? `anon:${uniqueUsers.size}`;
      uniqueUsers.add(anonId);
      return anonId;
    };

    for (const row of events) {
      const eventType = row.event_type ?? 'unknown';
      const metadata = isPlainObject(row.metadata) ? (row.metadata as JsonRecord) : {};
      const context = isPlainObject(row.context) ? (row.context as JsonRecord) : {};
      const normalizedUserId = addUser(row.user_id, context);
      const occurredAtTimestamp =
        typeof row.occurred_at === 'string' ? Date.parse(row.occurred_at) : Number.NaN;
      if (row.user_id) {
        consentedActiveUsers.add(row.user_id);
        if (Number.isFinite(occurredAtTimestamp)) {
          const timestamps = userEventTimestamps.get(row.user_id) ?? [];
          timestamps.push(occurredAtTimestamp);
          userEventTimestamps.set(row.user_id, timestamps);

          if (RETURN_EVENT_TYPES.has(eventType)) {
            const returnTimestamps = userReturnEventTimestamps.get(row.user_id) ?? [];
            returnTimestamps.push(occurredAtTimestamp);
            userReturnEventTimestamps.set(row.user_id, returnTimestamps);
          }
        }
      }

      const byType = eventsByTypeMap.get(eventType) ?? {
        count: 0,
        users: new Set<string>()
      };
      byType.count += 1;
      byType.users.add(normalizedUserId);
      eventsByTypeMap.set(eventType, byType);

      if (eventType === 'skill_rating_saved') {
        const skill = typeof metadata.skill === 'string' ? metadata.skill : undefined;
        const proficiency = PROFICIENCIES.includes(metadata.proficiency as SkillProficiency)
          ? (metadata.proficiency as SkillProficiency)
          : undefined;

        if (skill) {
        const entry =
          skillStats.get(skill) ??
          {
            total: 0,
            proficiencyCounts: PROFICIENCIES.reduce(
              (acc, level) => ({ ...acc, [level]: 0 }),
              {} as Record<SkillProficiency, number>
            )
          };

          entry.total += 1;
          if (proficiency) {
            entry.proficiencyCounts[proficiency] += 1;
          }
          skillStats.set(skill, entry);
        }
      }

      if (eventType === 'attendance_opt_in' && row.user_id) {
        attendanceOptInUsers.add(row.user_id);
      }

      if (eventType === 'whos_going_impression') {
        whosGoingImpressions += 1;
      }

      if (eventType === 'whos_going_click') {
        whosGoingClicks += 1;
      }

      if (eventType === 'profile_view') {
        profileViews += 1;
      }

      if (eventType === 'follow_action' && row.user_id) {
        const action = typeof metadata.action === 'string' ? metadata.action : null;
        if (action === 'follow') {
          usersWhoFollowed.add(row.user_id);
          if (Number.isFinite(occurredAtTimestamp)) {
            const followTimestamps = followEventTimestamps.get(row.user_id) ?? [];
            followTimestamps.push(occurredAtTimestamp);
            followEventTimestamps.set(row.user_id, followTimestamps);
          }
        }
      }

      if (eventType === 'network_badge_impression') {
        networkBadgeImpressions += 1;
      }

      if (eventType === 'network_badge_click') {
        networkBadgeClicks += 1;
      }

      if (eventType === 'discovery_attendance_toggle') {
        discoveryAttendanceToggleCount += 1;

        if (row.user_id) {
          discoveryAttendanceToggleUsers.add(row.user_id);
        }

        const action = typeof metadata.action === 'string' ? metadata.action : 'unknown';
        if (action === 'set_attending') {
          discoveryAttendanceToggleSetCount += 1;
        } else if (action === 'clear_attending') {
          discoveryAttendanceToggleClearCount += 1;
        } else {
          discoveryAttendanceToggleUnknownActionCount += 1;
        }

        const contextSurface = typeof context.surface === 'string' ? context.surface : 'unknown';
        const sourceSurface = typeof metadata.source === 'string' ? metadata.source : 'unknown';
        const surfaceKey = `${contextSurface}:${sourceSurface}`;
        discoveryAttendanceToggleBySurface.set(
          surfaceKey,
          (discoveryAttendanceToggleBySurface.get(surfaceKey) ?? 0) + 1
        );
      }

      if (eventType === 'recommendation_interaction') {
        const interactionType =
          typeof metadata.interactionType === 'string'
            ? metadata.interactionType
            : 'unknown';
        const position =
          typeof metadata.position === 'number'
            ? Number(metadata.position)
            : undefined;

        const entry =
          interactionStats.get(interactionType) ?? {
            count: 0,
            users: new Set<string>(),
            positions: [] as number[]
          };

        entry.count += 1;
        entry.users.add(normalizedUserId);
        if (typeof position === 'number' && Number.isFinite(position)) {
          entry.positions.push(position);
        }
        interactionStats.set(interactionType, entry);
      }

      if (eventType === 'recommendation_batch_generated') {
        batchStats.total += 1;
        const returnedCount =
          typeof metadata.returnedCount === 'number'
            ? metadata.returnedCount
            : Array.isArray(metadata.recommendationIds)
              ? metadata.recommendationIds.length
              : undefined;

        if (typeof returnedCount === 'number') {
          batchStats.totalReturned += returnedCount;
          batchStats.countedReturned += 1;
        }

        const matchedTags = Array.isArray(metadata.matchedTags)
          ? (metadata.matchedTags as unknown[])
          : [];
        for (const tag of matchedTags) {
          if (typeof tag === 'string' && tag.trim().length > 0) {
            batchStats.tagCounts.set(tag, (batchStats.tagCounts.get(tag) ?? 0) + 1);
          }
        }
      }
    }

    const eventsByType = Array.from(eventsByTypeMap.entries())
      .map(([eventType, summary]) => ({
        eventType,
        count: summary.count,
        uniqueUsers: summary.users.size
      }))
      .sort((a, b) => b.count - a.count);

    const skillRatings = {
      totalRatings: Array.from(skillStats.values()).reduce((sum, entry) => sum + entry.total, 0),
      skills: Array.from(skillStats.entries())
        .map(([skill, entry]) => ({
          skill,
          total: entry.total,
          proficiencyCounts: entry.proficiencyCounts
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 25)
    };

    const recommendationInteractions = {
      totalInteractions: Array.from(interactionStats.values()).reduce(
        (sum, entry) => sum + entry.count,
        0
      ),
      byType: Array.from(interactionStats.entries())
        .map(([interactionType, entry]) => ({
          interactionType,
          count: entry.count,
          uniqueUsers: entry.users.size,
          avgPosition:
            entry.positions.length > 0
              ? entry.positions.reduce((sum, pos) => sum + pos, 0) / entry.positions.length
              : null
        }))
        .sort((a, b) => b.count - a.count)
    };

    const recommendationBatches = {
      totalBatches: batchStats.total,
      avgReturnedCount:
        batchStats.countedReturned > 0
          ? batchStats.totalReturned / batchStats.countedReturned
          : null,
      topTags: Array.from(batchStats.tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    };

    const eligibleCohortCutoffTimestamp = endDate.getTime() - RETENTION_WINDOW_MS;
    let followToReturnCohortUsers = 0;
    let followToReturnUsers = 0;
    let retentionNonFollowersCohortUsers = 0;
    let retentionNonFollowersReturnUsers = 0;

    for (const timestamps of userEventTimestamps.values()) {
      timestamps.sort((a, b) => a - b);
    }
    for (const timestamps of userReturnEventTimestamps.values()) {
      timestamps.sort((a, b) => a - b);
    }
    for (const timestamps of followEventTimestamps.values()) {
      timestamps.sort((a, b) => a - b);
    }

    for (const [userId, followTimestamps] of followEventTimestamps.entries()) {
      const returnTimestamps = userReturnEventTimestamps.get(userId) ?? [];

      const cohortAnchor = followTimestamps.find(
        (timestamp) => timestamp <= eligibleCohortCutoffTimestamp
      );
      if (cohortAnchor === undefined) {
        continue;
      }

      followToReturnCohortUsers += 1;
      if (hasReturnWithinWindow(returnTimestamps, cohortAnchor)) {
        followToReturnUsers += 1;
      }
    }

    for (const [userId, userTimestamps] of userEventTimestamps.entries()) {
      const returnTimestamps = userReturnEventTimestamps.get(userId) ?? [];

      if ((followEventTimestamps.get(userId)?.length ?? 0) > 0) {
        continue;
      }

      const cohortAnchor = userTimestamps.find(
        (timestamp) => timestamp <= eligibleCohortCutoffTimestamp
      );
      if (cohortAnchor === undefined) {
        continue;
      }

      retentionNonFollowersCohortUsers += 1;
      if (hasReturnWithinWindow(returnTimestamps, cohortAnchor)) {
        retentionNonFollowersReturnUsers += 1;
      }
    }

    const followToReturnRate = ratio(followToReturnUsers, followToReturnCohortUsers);
    const retentionNonFollowersReturnRate = ratio(
      retentionNonFollowersReturnUsers,
      retentionNonFollowersCohortUsers
    );
    const retentionDelta =
      followToReturnRate !== null && retentionNonFollowersReturnRate !== null
        ? followToReturnRate - retentionNonFollowersReturnRate
        : null;

    const consentedActiveUserCount = consentedActiveUsers.size;
    const socialStageGates = {
      denominator: {
        consentedActiveUsers: consentedActiveUserCount,
        note: 'Rates use analytics-consented active users (users with telemetry events in this window).'
      },
      phaseA: {
        attendanceOptInUsers: attendanceOptInUsers.size,
        attendanceOptInRate: ratio(attendanceOptInUsers.size, consentedActiveUserCount),
        whosGoingImpressions,
        whosGoingClicks,
        whosGoingCtr: ratio(whosGoingClicks, whosGoingImpressions)
      },
      phaseB: {
        usersWhoFollowed: usersWhoFollowed.size,
        followAdoptionRate: ratio(usersWhoFollowed.size, consentedActiveUserCount),
        profileViews,
        followToReturnUsers,
        followToReturnCohortUsers,
        followToReturnRate
      },
      phaseC: {
        networkBadgeImpressions,
        networkBadgeClicks,
        networkBadgeCtr: ratio(networkBadgeClicks, networkBadgeImpressions),
        discoveryAttendanceToggleCount,
        discoveryAttendanceToggleUsers: discoveryAttendanceToggleUsers.size,
        discoveryAttendanceToggleRate: ratio(
          discoveryAttendanceToggleUsers.size,
          consentedActiveUserCount
        ),
        discoveryAttendanceToggleSetCount,
        discoveryAttendanceToggleClearCount,
        discoveryAttendanceToggleUnknownActionCount,
        discoveryAttendanceToggleBySurface: Array.from(discoveryAttendanceToggleBySurface.entries())
          .map(([surface, count]) => ({ surface, count }))
          .sort((a, b) => b.count - a.count),
        retentionFollowersReturnRate: followToReturnRate,
        retentionNonFollowersReturnRate,
        retentionDelta,
        retentionFollowersCohortUsers: followToReturnCohortUsers,
        retentionNonFollowersCohortUsers
      }
    };

    return {
      timeWindow: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        days: differenceInCalendarDays(endDate, startDate) + 1
      },
      totals: {
        events: events.length,
        uniqueUsers: uniqueUsers.size
      },
      eventsByType,
      skillRatings,
      recommendationInteractions,
      recommendationBatches,
      socialStageGates,
      rawSampleSize: events.length,
      truncated: events.length === maxEvents
    };
  }
}
