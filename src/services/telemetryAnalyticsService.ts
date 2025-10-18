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

const PROFICIENCIES: SkillProficiency[] = ['beginner', 'intermediate', 'advanced', 'expert'];

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
      rawSampleSize: events.length,
      truncated: events.length === maxEvents
    };
  }
}
