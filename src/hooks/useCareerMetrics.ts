import { useMemo } from 'react';
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

/**
 * Enhanced hook for career-focused dashboard metrics
 * Consolidates career impact, learning streak, and peer comparison
 */
export function useCareerMetrics(
  _allEvents: Event[] = [],
  trackedEvents: TrackedEventRecord[] = []
): CareerMetrics {
  const { profile } = useAuth();

  return useMemo(() => {
    try {
      const careerProfile = CareerProfileService.getCareerProfileFromPreferences(profile);

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

      // 3. Enhanced Peer Comparison (simplified for sync hook)
      const peerComparison = calculateEnhancedPeerComparison(trackedEvents, careerProfile);

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
  }, [trackedEvents, profile]);
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
 * Calculate enhanced peer comparison with role-aware cohorts
 */
function calculateEnhancedPeerComparison(
  trackedEvents: TrackedEventRecord[],
  careerProfile: { currentRole: string; seniority: string }
): CareerMetrics['peerComparison'] {
  // Simplified version for synchronous operation
  // In production, would use PeerCohortService.findUserCohorts()

  const monthlyEventCount = trackedEvents.length / 12;

  // Role-specific baselines
  const roleBaselines = {
    'Frontend Engineer': 2.2,
    'Backend Engineer': 2.0,
    'Full Stack Engineer': 2.4,
    'Data Scientist': 2.8,
    'Product Manager': 2.5,
    'Engineering Manager': 3.0,
    'default': 2.0
  };

  const baseline = roleBaselines[careerProfile.currentRole as keyof typeof roleBaselines] || roleBaselines.default;

  // Calculate percentile with role-specific baseline
  const rawPercentile = (monthlyEventCount / baseline) * 50;
  const percentile = Math.min(Math.max(Math.round(rawPercentile), 5), 95);

  let comparison: 'above' | 'below' | 'average' = 'average';
  if (percentile > 65) comparison = 'above';
  else if (percentile < 35) comparison = 'below';

  // Determine confidence based on available data
  const confidence = trackedEvents.length > 12 ? 'medium' : 'low';

  // Use actual tracked events count as sample size
  const sampleSize = trackedEvents.length;

  const recommendation = getRecommendationText(comparison, confidence, sampleSize);

  return {
    percentile,
    comparison,
    sampleSize,
    confidence,
    recommendation
  };
}

/**
 * Generate recommendation text based on comparison results
 */
function getRecommendationText(
  comparison: 'above' | 'below' | 'average',
  confidence: 'high' | 'medium' | 'low',
  sampleSize: number
): string {
  if (confidence === 'low') {
    return 'Building your peer group... More activity needed for reliable comparison';
  }

  const sampleText = sampleSize < 50 ? ' (small sample)' : '';

  switch (comparison) {
    case 'above':
      return `You're more active than most peers in your role${sampleText}`;
    case 'below':
      return `Consider attending more events to match peer activity${sampleText}`;
    default:
      return `Your learning activity matches your peer group${sampleText}`;
  }
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