import {
  type MobileDashboardCareerImpact,
  type MobileDashboardCareerOutcomes,
  type MobileDashboardCommitment,
  type MobileDashboardDiscoveryBreadth,
  type MobileDashboardEngagementStreak,
  type MobileDashboardFunnelInsight,
  type MobileDashboardInsightMessage,
  type MobileDashboardMonthlyPulse,
  type MobileDashboardNetworkPulse,
  type MobileDashboardPipelineInsight,
  type MobileDashboardPerformance,
  type MobileDashboardPredictionAccuracy,
  type MobileDashboardRecentWin,
  type MobileDashboardSkillProgress,
  type MobileDashboardTopRecommendation,
  type MobileEventCard,
  type MobileEventSummary,
} from '@kurecal/domain';

import { RECOMMENDATION_THRESHOLDS } from '@/config/recommendationThresholds';
import { calculateBaseScore } from '@/lib/recommendation/baseScorer';
import type { EventFeedback } from '@/services/eventFeedbackService';
import type { CareerProfile, Event, TrackedEventRecord } from '@/types';
import type { CareerGoal } from '@/types/career';
import { doesEventMatchGoal } from '@/utils/eventGoalAlignment';
import { getCanonicalSkillMeta } from '@/utils/skillTaxonomy';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const OUTCOME_MATURE_THRESHOLD = 5;
const NETWORKING_KEYWORDS = [
  'network',
  'meetup',
  'community',
  'mixer',
  'social',
  'connect',
  'roundtable',
] as const;

interface FeedbackAggregates {
  totalFeedbackCount: number;
  averageRating: number | null;
  totalSkillsGained: number;
  uniqueSkills: string[];
  totalConnectionsMade: number;
  recommendationRate: number | null;
  predictionAccuracy: number | null;
  predictionSampleSize: number;
}

interface AttendedEventAlignment {
  event: Event;
  score: number;
  matchedSkills: string[];
  normalizedMatchedSkills: string[];
  matchedGoals: CareerGoal[];
  networkingAligned: boolean;
}

function getEventOccurrenceDate(event: Event): Date {
  return new Date(event.endTime || event.startTime);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfIsoWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getUTCDay() || 7;
  next.setUTCHours(0, 0, 0, 0);
  next.setUTCDate(next.getUTCDate() - day + 1);
  return next;
}

function getIsoWeekKey(date: Date): string {
  const isoWeekStart = startOfIsoWeek(date);
  return isoWeekStart.toISOString().slice(0, 10);
}

function shiftWeeks(date: Date, offset: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + offset * 7);
  return next;
}

function normalizeDashboardFormat(
  value: Event['eventFormat'] | string | null | undefined
): 'virtual' | 'in-person' | 'hybrid' | null {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case 'online':
    case 'virtual':
      return 'virtual';
    case 'in person':
    case 'in-person':
      return 'in-person';
    case 'hybrid':
      return 'hybrid';
    default:
      return null;
  }
}

function getDaysUntil(value: string, now: Date): number {
  const target = startOfDay(new Date(value)).getTime();
  const current = startOfDay(now).getTime();
  return Math.max(0, Math.round((target - current) / DAY_IN_MS));
}

function normalizeSkill(value: string): string {
  const canonical = getCanonicalSkillMeta(value)?.name ?? value;
  return canonical.trim().toLowerCase();
}

function formatSkillLabel(value: string): string {
  return getCanonicalSkillMeta(value)?.name ?? value;
}

function isNetworkingEvent(event: Event): boolean {
  const eventText =
    `${event.title} ${event.description} ${event.category?.name ?? ''}`.toLowerCase();
  const tagText = (event.tags || []).map((tag) => tag.name.toLowerCase()).join(' ');
  return NETWORKING_KEYWORDS.some(
    (keyword) => eventText.includes(keyword) || tagText.includes(keyword)
  );
}

function getEventScore(event: Event, careerProfile: CareerProfile | null): number {
  const scoredEvent = event as Event & {
    careerImpactLite?: { overall?: number };
    careerImpact?: { overall?: number };
  };
  const candidate =
    event.recommendationMetadata?.alignmentScore ??
    event.recommendationMetadata?.matchScore ??
    scoredEvent.careerImpactLite?.overall ??
    scoredEvent.careerImpact?.overall ??
    0;

  if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
    return Math.round(candidate <= 1 ? candidate * 100 : candidate);
  }

  try {
    return Math.round(calculateBaseScore(event, careerProfile).overall);
  } catch {
    return Math.round(calculateBaseScore(event, null).overall);
  }
}

function formatCompactCount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function buildDeltaLabel(currentCount: number, previousCount: number): string {
  const deltaAbs = currentCount - previousCount;
  const absoluteLabel = `${deltaAbs >= 0 ? '+' : ''}${formatCompactCount(deltaAbs)} vs prev 30d`;

  if (previousCount < 3) {
    return absoluteLabel;
  }

  const deltaPct =
    previousCount > 0
      ? Math.round((deltaAbs / previousCount) * 100)
      : currentCount > 0
        ? 100
        : 0;

  return `${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs prev 30d`;
}

function isTrackedUpcoming(record: TrackedEventRecord, now: Date): record is TrackedEventRecord & { event: Event } {
  if (!record.event) return false;
  if (record.status === 'attended' || record.status === 'cancelled') return false;
  if (!record.isBookmarked && record.status !== 'attending') return false;
  return new Date(record.event.startTime) > now;
}

function getAttendedEvents(
  trackedEvents: TrackedEventRecord[],
  now: Date
): Array<TrackedEventRecord & { event: Event }> {
  return trackedEvents
    .filter(
      (record): record is TrackedEventRecord & { event: Event } =>
        record.status === 'attended' &&
        record.event != null &&
        getEventOccurrenceDate(record.event) < now
    )
    .sort(
      (left, right) =>
        getEventOccurrenceDate(right.event).getTime() -
        getEventOccurrenceDate(left.event).getTime()
    );
}

function calculateFeedbackAggregates(feedbackList: EventFeedback[]): FeedbackAggregates {
  if (feedbackList.length === 0) {
    return {
      totalFeedbackCount: 0,
      averageRating: null,
      totalSkillsGained: 0,
      uniqueSkills: [],
      totalConnectionsMade: 0,
      recommendationRate: null,
      predictionAccuracy: null,
      predictionSampleSize: 0,
    };
  }

  const ratings = feedbackList.filter((item) => item.actualValueRating !== null);
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, item) => sum + (item.actualValueRating || 0), 0) /
        ratings.length
      : null;

  const allSkills = feedbackList.flatMap((item) => item.skillsGained || []);
  const uniqueSkills = [...new Set(allSkills)];

  const totalConnectionsMade = feedbackList.reduce(
    (sum, item) => sum + (item.connectionsMade || 0),
    0
  );

  const withRecommendation = feedbackList.filter(
    (item) => item.wouldRecommend !== null
  );
  const recommendationRate =
    withRecommendation.length > 0
      ? (withRecommendation.filter((item) => item.wouldRecommend).length /
          withRecommendation.length) *
        100
      : null;

  const withBothScores = feedbackList.filter(
    (item) => item.actualValueRating !== null && item.predictedScore > 0
  );
  let accurateCount = 0;

  withBothScores.forEach((item) => {
    const actualHigh = (item.actualValueRating || 0) >= 4;
    const predictedHigh = item.predictedScore >= 70;
    if (actualHigh === predictedHigh) {
      accurateCount += 1;
    }
  });

  const predictionAccuracy =
    withBothScores.length > 0
      ? (accurateCount / withBothScores.length) * 100
      : null;

  return {
    totalFeedbackCount: feedbackList.length,
    averageRating,
    totalSkillsGained: allSkills.length,
    uniqueSkills,
    totalConnectionsMade,
    recommendationRate,
    predictionAccuracy,
    predictionSampleSize: withBothScores.length,
  };
}

function getEventAlignmentSnapshot(
  event: Event,
  careerProfile: CareerProfile | null
): AttendedEventAlignment {
  const score = getEventScore(event, careerProfile);

  if (!careerProfile) {
    return {
      event,
      score,
      matchedSkills: [],
      normalizedMatchedSkills: [],
      matchedGoals: [],
      networkingAligned: isNetworkingEvent(event),
    };
  }

  try {
    const result = calculateBaseScore(event, careerProfile);
    const matchedSkills = result.matchedSkills.map(formatSkillLabel).filter(Boolean);
    const normalizedMatchedSkills = matchedSkills.map(normalizeSkill).filter(Boolean);
    const matchedGoals = careerProfile.careerGoals.filter(
      (goal) => result.matchedGoals.includes(goal) || doesEventMatchGoal(event, goal)
    );

    return {
      event,
      score: score > 0 ? score : Math.round(result.overall),
      matchedSkills,
      normalizedMatchedSkills,
      matchedGoals,
      networkingAligned:
        matchedGoals.includes('networking') ||
        result.alignmentReasons.some((reason) => reason.type === 'networking') ||
        isNetworkingEvent(event),
    };
  } catch {
    const matchedGoals = careerProfile.careerGoals.filter((goal) =>
      doesEventMatchGoal(event, goal)
    );

    return {
      event,
      score,
      matchedSkills: [],
      normalizedMatchedSkills: [],
      matchedGoals,
      networkingAligned:
        matchedGoals.includes('networking') || isNetworkingEvent(event),
    };
  }
}

export function buildTopRecommendation(params: {
  recommendationCards: MobileEventCard[];
  recommendedEvents: Event[];
  now: Date;
}): MobileDashboardTopRecommendation | null {
  const [card] = params.recommendationCards;
  const [event] = params.recommendedEvents;

  if (!card || !event) {
    return null;
  }

  return {
    event: card,
    daysUntil: getDaysUntil(event.startTime, params.now),
    impactLabel:
      typeof card.score === 'number' && card.score >= RECOMMENDATION_THRESHOLDS.BUCKETS.HIGH
        ? 'High Impact'
        : null,
    reason: card.insight ?? event.description?.trim() ?? null,
  };
}

export function buildUpcomingCommitments(params: {
  trackedEvents: TrackedEventRecord[];
  now: Date;
  toSummary: (event: Event, record: TrackedEventRecord) => MobileEventSummary;
  limit?: number;
}): {
  commitments: MobileDashboardCommitment[];
  showOpenSlot: boolean;
} {
  const commitments = params.trackedEvents
    .filter(
      (record): record is TrackedEventRecord & { event: Event } =>
        record.event != null &&
        record.status === 'attending' &&
        new Date(record.event.startTime) > params.now
    )
    .sort(
      (left, right) =>
        new Date(left.event.startTime).getTime() -
        new Date(right.event.startTime).getTime()
    )
    .slice(0, params.limit ?? 4)
    .map((record) => ({
      trackingId: record.trackingId,
      daysUntil: getDaysUntil(record.event.startTime, params.now),
      event: params.toSummary(record.event, record),
    }));

  return {
    commitments,
    showOpenSlot: commitments.length === 1,
  };
}

export function buildDashboardInsights(params: {
  trackedEvents: TrackedEventRecord[];
  careerProfile: CareerProfile | null;
  now: Date;
}): {
  pipeline: MobileDashboardPipelineInsight;
  funnel: MobileDashboardFunnelInsight;
} {
  const trackedUpcoming = params.trackedEvents.filter((record) =>
    isTrackedUpcoming(record, params.now)
  );

  const scoredPipelineEvents = trackedUpcoming
    .map((record) => ({
      event: record.event,
      score: getEventScore(record.event, params.careerProfile),
    }))
    .filter((item) => item.score > 0);

  const scores = scoredPipelineEvents.map((item) => item.score);
  const highFitCount = scores.filter(
    (score) => score >= RECOMMENDATION_THRESHOLDS.RECOMMENDED
  ).length;

  const ninetyDaysAgo = new Date(params.now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const funnel = params.trackedEvents.reduce<MobileDashboardFunnelInsight>(
    (current, record) => {
      if (record.status === 'cancelled') {
        return current;
      }

      if (record.status === null && record.isBookmarked) {
        const savedAt = new Date(record.bookmarkedAt || record.trackedAt);
        if (savedAt >= ninetyDaysAgo) {
          current.savedOnly += 1;
        }
        return current;
      }

      if (record.status === 'attending') {
        const rsvpAt = new Date(record.trackedAt);
        if (rsvpAt >= ninetyDaysAgo) {
          current.rsvped += 1;
        }
        return current;
      }

      if (record.status === 'attended' && record.event) {
        const attendedAt = getEventOccurrenceDate(record.event);
        if (attendedAt >= ninetyDaysAgo && attendedAt < params.now) {
          current.attended += 1;
        }
      }

      return current;
    },
    { savedOnly: 0, rsvped: 0, attended: 0 }
  );

  return {
    pipeline: {
      trackedUpcomingCount: trackedUpcoming.length,
      scoredUpcomingCount: scores.length,
      avgScore:
        scores.length > 0
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          : 0,
      highFitCount,
      topEvents: scoredPipelineEvents
        .slice()
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map((item) => ({
          eventId: item.event.id,
          title: item.event.title,
          score: item.score,
        })),
    },
    funnel,
  };
}

export function buildMonthlyPulse(params: {
  trackedEvents: TrackedEventRecord[];
  now: Date;
}): MobileDashboardMonthlyPulse {
  const attendedEvents = getAttendedEvents(params.trackedEvents, params.now);

  const startToday = startOfDay(params.now);
  const current30dStart = new Date(startToday);
  current30dStart.setDate(current30dStart.getDate() - 29);

  const current30dEnd = new Date(startToday);
  current30dEnd.setDate(current30dEnd.getDate() + 1);

  const previous30dStart = new Date(current30dStart);
  previous30dStart.setDate(previous30dStart.getDate() - 30);

  const currentCount = attendedEvents.filter((record) => {
    const occurredAt = getEventOccurrenceDate(record.event);
    return occurredAt >= current30dStart && occurredAt < current30dEnd;
  }).length;

  const previousCount = attendedEvents.filter((record) => {
    const occurredAt = getEventOccurrenceDate(record.event);
    return occurredAt >= previous30dStart && occurredAt < current30dStart;
  }).length;

  const trend = Array.from({ length: 4 }, (_, index) => {
    const bucketStart = new Date(startToday);
    bucketStart.setDate(bucketStart.getDate() - (27 - index * 7));

    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketEnd.getDate() + 7);

    return {
      label: `W${index + 1}`,
      value: attendedEvents.filter((record) => {
        const occurredAt = getEventOccurrenceDate(record.event);
        return occurredAt >= bucketStart && occurredAt < bucketEnd;
      }).length,
    };
  });

  return {
    currentCount,
    deltaLabel: buildDeltaLabel(currentCount, previousCount),
    trend,
  };
}

export function buildDashboardPerformance(params: {
  trackedEvents: TrackedEventRecord[];
  careerProfile: CareerProfile | null;
  feedbackByEventId: Map<string, EventFeedback>;
  feedbackList: EventFeedback[];
  now: Date;
  toSummary: (event: Event, record: TrackedEventRecord) => MobileEventSummary;
  limit?: number;
}): MobileDashboardPerformance {
  const attendedEvents = getAttendedEvents(params.trackedEvents, params.now);
  const feedbackAggregates = calculateFeedbackAggregates(params.feedbackList);
  const limit = params.limit ?? 6;

  const recentWins: MobileDashboardRecentWin[] = attendedEvents
    .slice(0, limit)
    .map((record) => {
      const alignment = getEventAlignmentSnapshot(record.event, params.careerProfile);
      const feedback = params.feedbackByEventId.get(record.event.id);
      const bookmarkedDate = record.bookmarkedAt ? new Date(record.bookmarkedAt) : null;
      const bookmarkedLeadDays = bookmarkedDate
        ? getDaysUntil(record.event.startTime, bookmarkedDate)
        : undefined;

      return {
        event: params.toSummary(record.event, record),
        score: alignment.score,
        trackedAt: record.trackedAt,
        attendedDate: record.event.startTime,
        matchedSkills: alignment.matchedSkills,
        matchedGoals: alignment.matchedGoals,
        ...(typeof bookmarkedLeadDays === 'number' && bookmarkedLeadDays >= 0
          ? { bookmarkedLeadDays }
          : {}),
        feedbackSubmitted: Boolean(feedback),
        actualValueRating: feedback?.actualValueRating ?? null,
      };
    });

  return {
    summary: {
      attendedCount: attendedEvents.length,
      ratedCount: feedbackAggregates.totalFeedbackCount,
      connectionsMade: feedbackAggregates.totalConnectionsMade,
    },
    recentWins,
    hiddenCount: Math.max(0, attendedEvents.length - recentWins.length),
  };
}

export function buildEngagementStreak(params: {
  trackedEvents: TrackedEventRecord[];
  now: Date;
}): MobileDashboardEngagementStreak {
  const attendedEvents = getAttendedEvents(params.trackedEvents, params.now);
  const activeWeeks = new Set(
    attendedEvents.map((record) => getIsoWeekKey(getEventOccurrenceDate(record.event)))
  );
  const currentWeekStart = startOfIsoWeek(params.now);

  let currentWeekStreak = 0;
  for (let offset = 0; offset < 104; offset += 1) {
    const key = getIsoWeekKey(shiftWeeks(currentWeekStart, -offset));
    if (!activeWeeks.has(key)) {
      break;
    }
    currentWeekStreak += 1;
  }

  const sortedWeekKeys = Array.from(activeWeeks).sort();
  let longestWeekStreak = 0;
  let runningStreak = 0;
  let previousWeekStart: Date | null = null;

  sortedWeekKeys.forEach((weekKey) => {
    const currentWeek = new Date(`${weekKey}T00:00:00.000Z`);
    if (
      previousWeekStart &&
      currentWeek.getTime() - previousWeekStart.getTime() === 7 * DAY_IN_MS
    ) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }
    longestWeekStreak = Math.max(longestWeekStreak, runningStreak);
    previousWeekStart = currentWeek;
  });

  const recentWeeks = Array.from({ length: 8 }, (_, index) => {
    const weekStart = shiftWeeks(currentWeekStart, index - 7);
    return {
      weekKey: getIsoWeekKey(weekStart),
      active: activeWeeks.has(getIsoWeekKey(weekStart)),
    };
  });

  let nudgeMessage = 'Attend one event this week to start a streak.';
  if (currentWeekStreak >= 4) {
    nudgeMessage = `You are on a ${currentWeekStreak}-week run. Protect it with one more event this week.`;
  } else if (currentWeekStreak >= 1) {
    nudgeMessage = `One event next week extends your streak to ${currentWeekStreak + 1}.`;
  } else if (longestWeekStreak >= 2) {
    nudgeMessage = `Your best run is ${longestWeekStreak} weeks. One event this week starts the rebuild.`;
  }

  return {
    currentWeekStreak,
    longestWeekStreak,
    recentWeeks,
    nudgeMessage,
  };
}

export function buildDiscoveryBreadth(params: {
  trackedEvents: TrackedEventRecord[];
  now: Date;
}): MobileDashboardDiscoveryBreadth {
  const attendedEvents = getAttendedEvents(params.trackedEvents, params.now).map(
    (record) => record.event
  );
  const categories = new Set<string>();
  const organizers = new Set<string>();
  const formatCounts: MobileDashboardDiscoveryBreadth['formatCounts'] = {
    virtual: 0,
    'in-person': 0,
    hybrid: 0,
  };

  attendedEvents.forEach((event) => {
    const category = event.category?.name?.trim();
    if (category) {
      categories.add(category);
    }

    const organizer = event.organization?.name?.trim() || event.organizer?.trim();
    if (organizer) {
      organizers.add(organizer);
    }

    const format = normalizeDashboardFormat(event.eventFormat);
    if (format) {
      formatCounts[format] += 1;
    }
  });

  const categoryCount = categories.size;
  const breadthLabel =
    categoryCount >= 4 ? 'broad' : categoryCount >= 2 ? 'balanced' : 'narrow';

  return {
    categoryCount,
    organizerCount: organizers.size,
    formatCounts,
    breadthLabel,
  };
}

export function buildNetworkPulse(params: {
  trackedEvents: TrackedEventRecord[];
  feedbackList: EventFeedback[];
  now: Date;
}): MobileDashboardNetworkPulse {
  const attendedEvents = getAttendedEvents(params.trackedEvents, params.now);
  const eventById = new Map(attendedEvents.map((record) => [record.event.id, record.event] as const));
  const totalConnectionsMade = params.feedbackList.reduce(
    (sum, item) => sum + (item.connectionsMade || 0),
    0
  );
  const attendedCount = attendedEvents.length;
  const connectionsPerEvent =
    attendedCount > 0
      ? Math.round((totalConnectionsMade / attendedCount) * 10) / 10
      : 0;

  const topFeedback = params.feedbackList.reduce<EventFeedback | null>((best, item) => {
    const score = item.connectionsMade || 0;
    const bestScore = best?.connectionsMade || 0;
    return score > bestScore ? item : best;
  }, null);

  const topEvent = topFeedback ? eventById.get(topFeedback.eventId) : null;
  const networkingAlignedCount = attendedEvents.filter((record) =>
    isNetworkingEvent(record.event)
  ).length;

  return {
    totalConnectionsMade,
    connectionsPerEvent,
    topConnectingEvent:
      topFeedback && topEvent
        ? {
            eventId: topEvent.id,
            title: topEvent.title,
            connectionsMade: topFeedback.connectionsMade || 0,
          }
        : null,
    networkingEventRatio:
      attendedCount > 0
        ? Math.round((networkingAlignedCount / attendedCount) * 100)
        : 0,
  };
}

export function buildPredictionAccuracy(params: {
  feedbackList: EventFeedback[];
}): MobileDashboardPredictionAccuracy {
  const aggregates = calculateFeedbackAggregates(params.feedbackList);
  const sampleSize = aggregates.predictionSampleSize;
  const confidenceLabel =
    sampleSize >= 8
      ? 'calibrated'
      : sampleSize >= 3
        ? 'learning'
        : 'not_enough_data';
  const state =
    sampleSize === 0 ? 'empty' : sampleSize < 3 ? 'learning' : 'ready';
  const unlockMessage =
    state === 'ready'
      ? null
      : sampleSize === 0
        ? 'Rate 3+ events to unlock prediction accuracy.'
        : `${Math.max(0, 3 - sampleSize)} more rated event${
            3 - sampleSize === 1 ? '' : 's'
          } unlocks your accuracy score.`;

  return {
    accuracy:
      typeof aggregates.predictionAccuracy === 'number'
        ? Math.round(aggregates.predictionAccuracy)
        : null,
    sampleSize,
    confidenceLabel,
    state,
    unlockMessage,
  };
}

export function buildDashboardCareerImpact(params: {
  trackedEvents: TrackedEventRecord[];
  careerProfile: CareerProfile | null;
  now: Date;
}): MobileDashboardCareerImpact {
  const attendedAlignments = getAttendedEvents(params.trackedEvents, params.now).map(
    (record) => getEventAlignmentSnapshot(record.event, params.careerProfile)
  );

  const totalEvents = attendedAlignments.length;
  const targetSkills = new Set(
    (params.careerProfile?.skillsToLearn || []).map(normalizeSkill)
  );

  const skillAlignedCount = attendedAlignments.filter(({ normalizedMatchedSkills }) => {
    if (targetSkills.size === 0) {
      return normalizedMatchedSkills.length > 0;
    }

    return normalizedMatchedSkills.some((skill) => targetSkills.has(skill));
  }).length;

  const goalAlignedCount = attendedAlignments.filter(
    (alignment) => alignment.matchedGoals.length > 0
  ).length;

  const networkingCount = attendedAlignments.filter(
    (alignment) => alignment.networkingAligned
  ).length;

  const skillProgress: MobileDashboardSkillProgress[] = params.careerProfile
    ? params.careerProfile.skillsToLearn
        .map((skill) => {
          const label = formatSkillLabel(skill);
          const normalizedSkill = normalizeSkill(skill);
          const eventsAttended = attendedAlignments.filter((alignment) =>
            alignment.normalizedMatchedSkills.includes(normalizedSkill)
          ).length;
          const progressLevel: MobileDashboardSkillProgress['progressLevel'] =
            eventsAttended >= 5
              ? 'regular'
              : eventsAttended >= 2
                ? 'building'
                : 'exploring';

          return {
            skill: label,
            eventsAttended,
            progressLevel,
            nextMilestone:
              eventsAttended >= 5
                ? 'Keep it up with advanced events'
                : eventsAttended >= 2
                  ? `${Math.max(1, 5 - eventsAttended)} more event${
                      5 - eventsAttended === 1 ? '' : 's'
                    } to become a regular`
                  : 'Attend 1 relevant event to start building',
          };
        })
        .sort((left, right) => right.eventsAttended - left.eventsAttended)
        .slice(0, 4)
    : [];

  const goalTally = new Map<CareerGoal, number>();
  attendedAlignments.forEach((alignment) => {
    alignment.matchedGoals.forEach((goal) => {
      goalTally.set(goal, (goalTally.get(goal) ?? 0) + 1);
    });
  });
  const strongestGoal = Array.from(goalTally.entries()).sort(
    (left, right) => right[1] - left[1]
  )[0];

  const insights: MobileDashboardInsightMessage[] = [];
  const topSkill = skillProgress.find((item) => item.eventsAttended > 0);
  if (topSkill) {
    insights.push({
      tone: 'success',
      message: `${topSkill.skill} is showing up consistently across ${topSkill.eventsAttended} attended event${
        topSkill.eventsAttended === 1 ? '' : 's'
      }.`,
    });
  }

  if (strongestGoal) {
    insights.push({
      tone: strongestGoal[1] >= 2 ? 'success' : 'info',
      message: `${strongestGoal[0].replace(/-/g, ' ')} is your strongest attended goal theme with ${
        strongestGoal[1]
      } aligned event${strongestGoal[1] === 1 ? '' : 's'}.`,
    });
  }

  if ((params.careerProfile?.networkingGoals?.length ?? 0) > 0) {
    insights.push({
      tone: networkingCount > 0 ? 'success' : 'info',
      message:
        networkingCount > 0
          ? `${networkingCount} attended event${
              networkingCount === 1 ? '' : 's'
            } created clear networking exposure.`
          : 'You have not attended a networking-heavy event yet. Add one to broaden your professional circle.',
    });
  }

  if (insights.length === 0) {
    insights.push({
      tone: 'info',
      message:
        totalEvents > 0
          ? 'Your attended events are starting to build a clearer career signal.'
          : 'Attend a few events to unlock skill and goal alignment insights.',
    });
  }

  return {
    totalEvents,
    skillAlignedCount,
    skillAlignedPercentage:
      totalEvents > 0 ? Math.round((skillAlignedCount / totalEvents) * 100) : 0,
    goalAlignedCount,
    goalAlignedPercentage:
      totalEvents > 0 ? Math.round((goalAlignedCount / totalEvents) * 100) : 0,
    networkingCount,
    networkingPercentage:
      totalEvents > 0 ? Math.round((networkingCount / totalEvents) * 100) : 0,
    skillProgress,
    insights: insights.slice(0, 4),
  };
}

export function buildDashboardCareerOutcomes(params: {
  trackedEvents: TrackedEventRecord[];
  feedbackList: EventFeedback[];
  now: Date;
  toSummary: (event: Event, record: TrackedEventRecord) => MobileEventSummary;
}): MobileDashboardCareerOutcomes {
  const feedbackByEventId = new Map(
    params.feedbackList.map((item) => [item.eventId, item] as const)
  );
  const aggregates = calculateFeedbackAggregates(params.feedbackList);
  const attendedEvents = getAttendedEvents(params.trackedEvents, params.now);
  const upcomingCount = params.trackedEvents.filter(
    (record) => record.status === 'attending' && record.event && new Date(record.event.startTime) > params.now
  ).length;
  const unratedAttended = attendedEvents.filter(
    (record) => !feedbackByEventId.has(record.event.id)
  );
  const hasNoActivity = attendedEvents.length === 0 && upcomingCount === 0;
  const state = hasNoActivity
    ? 'empty'
    : aggregates.totalFeedbackCount < OUTCOME_MATURE_THRESHOLD
      ? 'early'
      : 'mature';
  const topSkill = aggregates.uniqueSkills[0] ?? null;
  const teaserMessage = topSkill
    ? `You're building expertise in ${topSkill}`
    : aggregates.totalFeedbackCount > 0
      ? `You've rated ${aggregates.totalFeedbackCount} events`
      : 'Start tracking your career impact';

  return {
    state,
    attendedCount: attendedEvents.length,
    upcomingCount,
    feedbackCount: aggregates.totalFeedbackCount,
    unratedAttendedCount: unratedAttended.length,
    ratingsRemaining: Math.max(
      0,
      OUTCOME_MATURE_THRESHOLD - aggregates.totalFeedbackCount
    ),
    nextEventToRate: unratedAttended[0]
      ? params.toSummary(unratedAttended[0].event, unratedAttended[0])
      : null,
    averageRating: aggregates.averageRating,
    recommendationRate: aggregates.recommendationRate,
    totalConnectionsMade: aggregates.totalConnectionsMade,
    uniqueSkillsCount: aggregates.uniqueSkills.length,
    teaserMessage,
  };
}
