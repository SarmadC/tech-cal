import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { CareerProfileService } from '@/services/careerProfileService';
import { PeerCohortService } from '@/services/peerCohortService';
import type { Event, TrackedEventRecord } from '@/types';

interface CareerMetrics {
  careerImpactScore: {
    value: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
    roleWeighted: boolean;
  };
  learningStreak: {
    months: number;
    isActive: boolean;
    lastActivity: string | null;
  };
  peerComparison: {
    percentile: number;
    comparison: 'above' | 'below' | 'average';
    sampleSize: number;
    confidence: 'high' | 'medium' | 'low';
    recommendation: string;
  };
}

function isValidPeerComparisonSnapshot(
  value: unknown
): value is CareerMetrics['peerComparison'] {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Record<string, unknown>;
  return (
    typeof snapshot.percentile === 'number' &&
    (snapshot.comparison === 'above' || snapshot.comparison === 'below' || snapshot.comparison === 'average') &&
    typeof snapshot.sampleSize === 'number' &&
    (snapshot.confidence === 'high' || snapshot.confidence === 'medium' || snapshot.confidence === 'low') &&
    typeof snapshot.recommendation === 'string'
  );
}

/**
 * Enhanced hook for career-focused dashboard metrics
 * Consolidates career impact, learning streak, and peer comparison
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
  const profileFingerprint = useMemo(() => {
    if (!careerProfile) return null;

    return [
      careerProfile.currentRole,
      careerProfile.seniority,
      careerProfile.industry,
      [...careerProfile.careerGoals].sort().join(','),
      [...careerProfile.networkingGoals].sort().join(','),
      [...careerProfile.skillsToLearn].sort().join(',')
    ].join('|');
  }, [careerProfile]);

  const { data: serverPeerComparison } = useQuery<CareerMetrics['peerComparison'] | null>({
    queryKey: ['careerPeerComparison', profile?.id, profileFingerprint],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/peer-comparison');
      if (!response.ok) return null;

      const payload = await response.json() as {
        success?: boolean;
        data?: {
          peerComparison?: unknown;
        };
      };
      const peerComparison = payload?.data?.peerComparison;
      return payload?.success && isValidPeerComparisonSnapshot(peerComparison)
        ? peerComparison
        : null;
    },
    enabled: Boolean(profile?.id && profileFingerprint),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  return useMemo(() => {
    try {
      if (!careerProfile || !profile) {
        return getEmptyMetrics();
      }

      // 1. Career Impact Score (role-weighted calculation)
      const recentEvents = getRecentEvents(trackedEvents, 90);
      const roleWeightedScore = PeerCohortService.calculateRoleWeightedScore(recentEvents, careerProfile.currentRole);
      const simpleScore = calculateSimpleEventScore(recentEvents);
      const avgImpactScore = roleWeightedScore > 0 ? roleWeightedScore : simpleScore;
      const impactTrend = calculateImpactTrendSync(recentEvents);

      // 2. Learning Streak
      const learningStreak = calculateLearningStreak(trackedEvents);

      // 3. Enhanced Peer Comparison (server-aggregated, fallback to local modeled baseline)
      const localPeerComparison = PeerCohortService.calculatePeerComparison(careerProfile, trackedEvents);
      const peerComparison = serverPeerComparison ?? localPeerComparison;

      return {
        careerImpactScore: {
          value: Math.round(avgImpactScore * 100) / 100,
          trend: impactTrend.direction,
          trendPercentage: impactTrend.percentage,
          roleWeighted: roleWeightedScore > 0
        },
        learningStreak,
        peerComparison
      };
    } catch (error) {
      console.warn('Error calculating career metrics:', error);
      return getEmptyMetrics();
    }
  }, [trackedEvents, profile, careerProfile, serverPeerComparison]);
}

/**
 * Get recent events from tracked events
 */
function getRecentEvents(trackedEvents: TrackedEventRecord[], days: number): Event[] {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return trackedEvents
    .filter(te => te.event && new Date(te.event.startTime) >= cutoffDate)
    .map(te => te.event!)
    .filter(Boolean);
}

/**
 * Calculate learning streak - consecutive months with skill-building events
 */
function calculateLearningStreak(trackedEvents: TrackedEventRecord[]): CareerMetrics['learningStreak'] {
  const skillKeywords = ['workshop', 'training', 'bootcamp', 'course', 'tutorial', 'learning'];

  // Group events by month
  const eventsByMonth = new Map<string, TrackedEventRecord[]>();

  trackedEvents.forEach(te => {
    if (!te.event) return;

    const eventDate = new Date(te.event.startTime);
    const monthKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}`;

    if (!eventsByMonth.has(monthKey)) {
      eventsByMonth.set(monthKey, []);
    }
    eventsByMonth.get(monthKey)!.push(te);
  });

  // Calculate consecutive months with learning events
  const sortedMonths = Array.from(eventsByMonth.keys()).sort().reverse();
  let streak = 0;
  let lastActivity: string | null = null;

  for (const monthKey of sortedMonths) {
    const monthEvents = eventsByMonth.get(monthKey)!;
    const hasLearningEvents = monthEvents.some(te =>
      te.event && skillKeywords.some(keyword =>
        te.event!.title.toLowerCase().includes(keyword) ||
        te.event!.description.toLowerCase().includes(keyword)
      )
    );

    if (hasLearningEvents) {
      streak++;
      if (!lastActivity) {
        lastActivity = monthKey;
      }
    } else if (streak > 0) {
      break; // Streak broken
    }
  }

  const currentMonth = `${new Date().getFullYear()}-${new Date().getMonth()}`;
  const isActive = lastActivity === currentMonth;

  return {
    months: streak,
    isActive,
    lastActivity
  };
}

/**
 * Calculate impact trend over time (synchronous version)
 */
function calculateImpactTrendSync(events: Event[]): { direction: 'up' | 'down' | 'stable'; percentage: number } {
  if (events.length < 4) {
    return { direction: 'stable', percentage: 0 };
  }

  try {
    // Split events into two halves
    const sortedEvents = events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const halfPoint = Math.floor(sortedEvents.length / 2);

    const earlierEvents = sortedEvents.slice(0, halfPoint);
    const laterEvents = sortedEvents.slice(halfPoint);

    // Get average impact scores for each period
    const earlierAvg = calculateSimpleEventScore(earlierEvents);
    const laterAvg = calculateSimpleEventScore(laterEvents);

    if (earlierAvg === 0) {
      return { direction: 'stable', percentage: 0 };
    }

    const percentage = Math.round(((laterAvg - earlierAvg) / earlierAvg) * 100);
    const direction = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable';

    return { direction, percentage: Math.abs(percentage) };
  } catch (error) {
    console.warn('Failed to calculate impact trend:', error);
    return { direction: 'stable', percentage: 0 };
  }
}

/**
 * Simple event scoring based on event characteristics
 */
function calculateSimpleEventScore(events: Event[]): number {
  if (events.length === 0) return 0;

  const scores = events.map(event => {
    let score = 50; // Base score

    // Premium event indicators
    if (event.title.toLowerCase().includes('conference')) score += 20;
    if (event.title.toLowerCase().includes('summit')) score += 15;
    if (event.title.toLowerCase().includes('workshop')) score += 10;

    // Quality indicators
    if (event.speakerLineup && event.speakerLineup.length > 0) score += 10;
    if (event.priceRange && !event.priceRange.includes('free')) score += 5;

    return Math.min(score, 100);
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Empty metrics fallback
 */
function getEmptyMetrics(): CareerMetrics {
  return {
    careerImpactScore: {
      value: 0,
      trend: 'stable',
      trendPercentage: 0,
      roleWeighted: false
    },
    learningStreak: {
      months: 0,
      isActive: false,
      lastActivity: null
    },
    peerComparison: {
      percentile: 50,
      comparison: 'average',
      sampleSize: 0,
      confidence: 'low',
      recommendation: 'Complete your career profile to enable peer comparison'
    }
  };
}
