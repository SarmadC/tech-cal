import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEventFeedback } from '@/hooks/useEventFeedback';
import { CareerProfileService } from '@/services/careerProfileService';
import { RECOMMENDATION_THRESHOLDS } from '@/config/recommendationThresholds';
import { calculateEventAlignment } from '@/utils/uiScoringAdapter';
import type { Event, TrackedEventRecord } from '@/types';

interface TrendDatum {
  name: string;
  value: number;
}

interface ScoredPipelineEvent {
  eventId: string;
  title: string;
  score: number;
}

interface CareerMetrics {
  attendance: {
    last30dCount: number;
    previous30dCount: number;
    deltaAbs: number;
    deltaPct: number | null;
    isLowSample: boolean;
    trendData: TrendDatum[];
  };
  pipeline: {
    trackedUpcomingCount: number;
    scoredUpcomingCount: number;
    avgScore: number;
    highFitCount: number;
    highFitRatio: number;
    topEvents: ScoredPipelineEvent[];
  };
  funnel90d: {
    savedOnly: number;
    rsvped: number;
    attended: number;
  };
  feedback: {
    feedbackCount: number;
    averageRating: number | null;
    recommendationRate: number | null;
    unratedAttendedCount: number;
    nextEventToRate: Event | null;
  };
  pipelineFit: {
    value: number;
    highFitCount: number;
    totalCount: number;
  };
  learningStreak: {
    months: number;
    isActive: boolean;
    lastActivity: string | null;
  };
  outcomeSignals: {
    averageRating: number | null;
    feedbackCount: number;
    recommendationRate: number | null;
    totalConnectionsMade: number;
    uniqueSkillsCount: number;
  };
}

function getKnownEventScore(event: Event): number {
  const scoredEvent = event as Event & {
    careerImpactLite?: { overall?: number };
    careerImpact?: { overall?: number };
  };
  const knownScore = scoredEvent.careerImpactLite?.overall ?? scoredEvent.careerImpact?.overall;

  if (typeof knownScore !== 'number' || !Number.isFinite(knownScore) || knownScore <= 0) {
    return 0;
  }

  return knownScore <= 1 ? knownScore * 100 : knownScore;
}

function getEventOccurrenceDate(event: Event): Date {
  return new Date(event.endTime || event.startTime);
}

function isTrackedUpcoming(record: TrackedEventRecord, now: Date): record is TrackedEventRecord & { event: Event } {
  if (!record.event) return false;
  if (record.status === 'attended' || record.status === 'cancelled') return false;
  if (!record.isBookmarked && record.status !== 'attending') return false;
  return new Date(record.event.startTime) > now;
}

/**
 * Dashboard summary metrics focused on pipeline quality and logged outcomes.
 */
export function useCareerMetrics(
  _allEvents: Event[] = [],
  trackedEvents: TrackedEventRecord[] = []
): CareerMetrics {
  const { profile } = useAuth();
  const careerProfile = useMemo(
    () => CareerProfileService.getCareerProfileFromPreferences(profile),
    [profile]
  );
  const { data: feedbackData } = useEventFeedback(profile?.id);

  return useMemo(() => {
    const now = new Date();
    const attendedEvents = trackedEvents.filter(
      (record): record is TrackedEventRecord & { event: Event } =>
        record.status === 'attended' &&
        !!record.event &&
        getEventOccurrenceDate(record.event) < now
    );

    const trackedUpcoming = trackedEvents.filter(record => isTrackedUpcoming(record, now));
    const scoredPipelineEvents = trackedUpcoming
      .map(record => {
        const knownScore = getKnownEventScore(record.event);
        if (knownScore > 0) return knownScore;
        if (!careerProfile) return 0;

        try {
          return calculateEventAlignment(record.event, careerProfile).alignmentScore;
        } catch {
          return 0;
        }
      })
      .map((score, index) => ({
        event: trackedUpcoming[index].event,
        score,
      }))
      .filter((item): item is { event: Event; score: number } => item.score > 0);

    const pipelineScoreValues = scoredPipelineEvents.map(item => item.score);
    const highFitCount = pipelineScoreValues.filter(score => score >= RECOMMENDATION_THRESHOLDS.RECOMMENDED).length;

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const current30dStart = new Date(startOfToday);
    current30dStart.setDate(current30dStart.getDate() - 29);

    const current30dEnd = new Date(startOfToday);
    current30dEnd.setDate(current30dEnd.getDate() + 1);

    const previous30dStart = new Date(current30dStart);
    previous30dStart.setDate(previous30dStart.getDate() - 30);

    const trendData = Array.from({ length: 4 }).map((_, index) => {
      const bucketStart = new Date(startOfToday);
      bucketStart.setDate(bucketStart.getDate() - (27 - index * 7));

      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketEnd.getDate() + 7);

      const value = attendedEvents.filter(record => {
        const occurredAt = getEventOccurrenceDate(record.event);
        return occurredAt >= bucketStart && occurredAt < bucketEnd;
      }).length;

      return {
        name: `W${index + 1}`,
        value,
      };
    });

    const last30dCount = attendedEvents.filter(record => {
      const occurredAt = getEventOccurrenceDate(record.event);
      return occurredAt >= current30dStart && occurredAt < current30dEnd;
    }).length;

    const previous30dCount = attendedEvents.filter(record => {
      const occurredAt = getEventOccurrenceDate(record.event);
      return occurredAt >= previous30dStart && occurredAt < current30dStart;
    }).length;

    const deltaAbs = last30dCount - previous30dCount;
    const isLowSample = previous30dCount < 3;
    const deltaPct = previous30dCount > 0
      ? Math.round((deltaAbs / previous30dCount) * 100)
      : last30dCount > 0
        ? 100
        : 0;

    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const funnel90d = trackedEvents.reduce(
      (acc, record) => {
        if (record.status === 'cancelled') return acc;

        if (record.status === null && record.isBookmarked) {
          const savedAt = new Date(record.bookmarkedAt || record.trackedAt);
          if (savedAt >= ninetyDaysAgo) {
            acc.savedOnly += 1;
          }
          return acc;
        }

        if (record.status === 'attending') {
          const rsvpAt = new Date(record.trackedAt);
          if (rsvpAt >= ninetyDaysAgo) {
            acc.rsvped += 1;
          }
          return acc;
        }

        if (record.status === 'attended' && record.event) {
          const attendedAt = getEventOccurrenceDate(record.event);
          if (attendedAt >= ninetyDaysAgo && attendedAt < now) {
            acc.attended += 1;
          }
        }

        return acc;
      },
      { savedOnly: 0, rsvped: 0, attended: 0 }
    );

    const aggregates = feedbackData?.aggregates;
    const feedback = feedbackData?.feedback ?? [];
    const feedbackEventIds = new Set(feedback.map(item => item.eventId));
    const unratedAttended = [...attendedEvents]
      .filter(record => !feedbackEventIds.has(record.event.id))
      .sort((a, b) => getEventOccurrenceDate(b.event).getTime() - getEventOccurrenceDate(a.event).getTime());

    return {
      attendance: {
        last30dCount,
        previous30dCount,
        deltaAbs,
        deltaPct: isLowSample ? null : deltaPct,
        isLowSample,
        trendData,
      },
      pipeline: {
        trackedUpcomingCount: trackedUpcoming.length,
        scoredUpcomingCount: pipelineScoreValues.length,
        avgScore: pipelineScoreValues.length > 0
          ? Math.round(pipelineScoreValues.reduce((sum, score) => sum + score, 0) / pipelineScoreValues.length)
          : 0,
        highFitCount,
        highFitRatio: trackedUpcoming.length > 0
          ? Math.round((highFitCount / trackedUpcoming.length) * 100)
          : 0,
        topEvents: scoredPipelineEvents
          .slice()
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(item => ({
            eventId: item.event.id,
            title: item.event.title,
            score: item.score,
          })),
      },
      funnel90d,
      feedback: {
        feedbackCount: aggregates?.totalFeedbackCount ?? 0,
        averageRating: aggregates?.averageRating ?? null,
        recommendationRate: aggregates?.recommendationRate ?? null,
        unratedAttendedCount: unratedAttended.length,
        nextEventToRate: unratedAttended[0]?.event ?? null,
      },
      pipelineFit: {
        value: pipelineScoreValues.length > 0
          ? Math.round(pipelineScoreValues.reduce((sum, score) => sum + score, 0) / pipelineScoreValues.length)
          : 0,
        highFitCount,
        totalCount: trackedUpcoming.length,
      },
      learningStreak: calculateLearningStreak(trackedEvents),
      outcomeSignals: {
        averageRating: aggregates?.averageRating ?? null,
        feedbackCount: aggregates?.totalFeedbackCount ?? 0,
        recommendationRate: aggregates?.recommendationRate ?? null,
        totalConnectionsMade: aggregates?.totalConnectionsMade ?? 0,
        uniqueSkillsCount: aggregates?.uniqueSkills.length ?? 0,
      },
    };
  }, [trackedEvents, careerProfile, feedbackData]);
}

function calculateLearningStreak(trackedEvents: TrackedEventRecord[]): CareerMetrics['learningStreak'] {
  const attendedMonths = new Set<string>();
  trackedEvents.forEach(te => {
    if (!te.event || te.status !== 'attended') return;
    const occurredAt = getEventOccurrenceDate(te.event);
    attendedMonths.add(`${occurredAt.getFullYear()}-${occurredAt.getMonth()}`);
  });

  if (attendedMonths.size === 0) return { months: 0, isActive: false, lastActivity: null };

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let streak = 0;
  let lastActivity: string | null = null;

  const currentKey = `${year}-${month}`;
  if (!attendedMonths.has(currentKey)) {
    if (month === 0) {
      year -= 1;
      month = 11;
    } else {
      month -= 1;
    }
  }

  for (let i = 0; i < 36; i++) {
    const key = `${year}-${month}`;
    if (!attendedMonths.has(key)) break;

    streak += 1;
    if (!lastActivity) lastActivity = key;

    if (month === 0) {
      year -= 1;
      month = 11;
    } else {
      month -= 1;
    }
  }

  return { months: streak, isActive: attendedMonths.has(currentKey), lastActivity };
}
