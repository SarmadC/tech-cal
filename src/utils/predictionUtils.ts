import { subDays, isThisMonth, differenceInDays, format } from 'date-fns';
import type { TrackedEventRecord, Event } from '@/types';

// ============================================
// CORE PREDICTION ENGINE (DRY - Single Source of Truth)
// ============================================

export interface DashboardPredictions {
  monthlyProjection: number;
  onTrackStatus: 'ahead' | 'on-track' | 'behind';
  anomaly: { message: string; type: 'warning' | 'success' | null } | null;
  dropOffRisk: { stage: string; severity: 'high' | 'medium' | 'low' } | null;
  currentStreak: number;
  bestMonth: { month: string; count: number } | null;
  nextMilestone: { target: number; remaining: number; label: string } | null;
}

/**
 * Master prediction function - calculates all insights from tracked events
 * DRY: Called once per dashboard render, memoized in hook
 */
export const calculatePredictions = (
  trackedEvents: TrackedEventRecord[],
  _upcomingEvents: Event[] = []
): DashboardPredictions => {
  const now = new Date();
  
  // Filter attended events only
  const attendedEvents = trackedEvents.filter(e => e.status === 'attended');
  
  // Get last 90 days
  const ninetyDaysAgo = subDays(now, 90);
  const last90Days = attendedEvents.filter(e => 
    new Date(e.trackedAt) >= ninetyDaysAgo
  );

  return {
    monthlyProjection: predictMonthlyEvents(last90Days),
    onTrackStatus: getOnTrackStatus(last90Days, attendedEvents),
    anomaly: detectAnomaly(attendedEvents),
    dropOffRisk: calculateDropOffRisk(trackedEvents),
    currentStreak: calculateStreak(attendedEvents),
    bestMonth: findBestMonth(attendedEvents),
    nextMilestone: getNextMilestone(attendedEvents)
  };
};

/**
 * Predict monthly event attendance based on 90-day average
 */
const predictMonthlyEvents = (last90Days: TrackedEventRecord[]): number => {
  if (last90Days.length === 0) return 0;
  return Math.round((last90Days.length / 90) * 30);
};

/**
 * Determine if user is on track with their activity goals
 */
const getOnTrackStatus = (
  last90Days: TrackedEventRecord[],
  allAttended: TrackedEventRecord[]
): 'ahead' | 'on-track' | 'behind' => {
  const thisMonthEvents = allAttended.filter(e => 
    isThisMonth(new Date(e.trackedAt))
  );
  
  const avgMonthly = (last90Days.length / 90) * 30;
  const currentProgress = thisMonthEvents.length;
  
  // Calculate expected progress for current day of month
  const dayOfMonth = new Date().getDate();
  const expectedProgress = (avgMonthly / 30) * dayOfMonth;
  
  if (currentProgress > expectedProgress * 1.2) return 'ahead';
  if (currentProgress < expectedProgress * 0.7) return 'behind';
  return 'on-track';
};

/**
 * Detect anomalies using Z-score method
 */
const detectAnomaly = (
  attendedEvents: TrackedEventRecord[]
): { message: string; type: 'warning' | 'success' } | null => {
  if (attendedEvents.length < 14) return null;
  
  const now = new Date();
  const last7Days = attendedEvents.filter(e => 
    new Date(e.trackedAt) >= subDays(now, 7)
  ).length;
  
  const _prev7Days = attendedEvents.filter(e => {
    const date = new Date(e.trackedAt);
    return date >= subDays(now, 14) && date < subDays(now, 7);
  }).length;
  
  // Calculate average and standard deviation from last 60 days
  const last60Days = attendedEvents.filter(e => 
    new Date(e.trackedAt) >= subDays(now, 60)
  );
  
  // Group by weeks
  const weekCounts: number[] = [];
  for (let i = 0; i < 8; i++) {
    const weekStart = subDays(now, (i + 1) * 7);
    const weekEnd = subDays(now, i * 7);
    const count = last60Days.filter(e => {
      const date = new Date(e.trackedAt);
      return date >= weekStart && date < weekEnd;
    }).length;
    weekCounts.push(count);
  }
  
  const avg = weekCounts.reduce((a, b) => a + b, 0) / weekCounts.length;
  const variance = weekCounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / weekCounts.length;
  const stdDev = Math.sqrt(variance);
  
  const zScore = stdDev > 0 ? Math.abs(last7Days - avg) / stdDev : 0;
  
  // Anomaly if z-score > 2 (95% confidence)
  if (zScore > 2) {
    if (last7Days > avg) {
      return {
        message: `Great momentum! ${last7Days} events this week is ${((last7Days - avg) / avg * 100).toFixed(0)}% above your average`,
        type: 'success'
      };
    } else {
      return {
        message: `Activity slowdown: ${last7Days} events this week vs ${avg.toFixed(1)} average. Browse recommended events to get back on track.`,
        type: 'warning'
      };
    }
  }
  
  return null;
};

/**
 * Calculate drop-off risk at funnel stages
 */
const calculateDropOffRisk = (
  trackedEvents: TrackedEventRecord[]
): { stage: string; severity: 'high' | 'medium' | 'low' } | null => {
  const bookmarked = trackedEvents.filter(e => e.status === 'bookmarked').length;
  const registered = trackedEvents.filter(e => e.status === 'attending').length;
  const attended = trackedEvents.filter(e => e.status === 'attended').length;
  
  // Track → RSVP conversion
  const trackToRsvp = bookmarked > 0 ? (registered / bookmarked) * 100 : 100;
  
  // RSVP → Attend conversion
  const rsvpToAttend = registered > 0 ? (attended / registered) * 100 : 100;
  
  if (rsvpToAttend < 50) {
    return { stage: 'RSVP → Attend', severity: 'high' };
  }
  if (rsvpToAttend < 70) {
    return { stage: 'RSVP → Attend', severity: 'medium' };
  }
  if (trackToRsvp < 50) {
    return { stage: 'Track → RSVP', severity: 'medium' };
  }
  
  return null;
};

/**
 * Score likelihood of attending an event
 */
export const scoreAttendanceLikelihood = (
  event: Event,
  trackedEvents: TrackedEventRecord[]
): { score: number; level: 'high' | 'medium' | 'low'; color: string; bgColor: string } => {
  const now = new Date();
  const eventDate = new Date(event.startTime);
  const daysUntil = differenceInDays(eventDate, now);
  
  // Calculate user's historical attend rate
  const registered = trackedEvents.filter(e => e.status === 'attending' || e.status === 'attended');
  const attended = trackedEvents.filter(e => e.status === 'attended');
  const userAttendRate = registered.length > 0 ? attended.length / registered.length : 0.5;
  
  // Scoring factors (0-1 scale)
  const timeFactor = Math.max(0, Math.min(1, (30 - daysUntil) / 30)); // Closer = higher likelihood
  const userFactor = userAttendRate; // Historical behavior
  const registrationFactor = 1; // Assume this event is tracked/registered
  
  // Weighted score
  const score = (timeFactor * 0.3) + (userFactor * 0.5) + (registrationFactor * 0.2);
  
  if (score >= 0.7) {
    return { 
      score: Math.round(score * 100), 
      level: 'high',
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    };
  }
  if (score >= 0.4) {
    return { 
      score: Math.round(score * 100), 
      level: 'medium',
      color: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
    };
  }
  return { 
    score: Math.round(score * 100), 
    level: 'low',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20'
  };
};

/**
 * Calculate current active streak
 */
const calculateStreak = (attendedEvents: TrackedEventRecord[]): number => {
  const now = new Date();
  let currentStreak = 0;
  
  // Check each week going backwards
  for (let weekOffset = 0; weekOffset < 52; weekOffset++) {
    const weekStart = subDays(now, (weekOffset + 1) * 7);
    const weekEnd = subDays(now, weekOffset * 7);
    
    const hasActivity = attendedEvents.some(event => {
      const date = new Date(event.trackedAt);
      return date >= weekStart && date < weekEnd;
    });
    
    if (hasActivity) {
      currentStreak++;
    } else {
      break; // Streak broken
    }
  }
  
  return currentStreak;
};

/**
 * Find user's best performing month
 */
const findBestMonth = (
  attendedEvents: TrackedEventRecord[]
): { month: string; count: number } | null => {
  if (attendedEvents.length === 0) return null;
  
  const monthCounts: Record<string, number> = {};
  
  attendedEvents.forEach(event => {
    const monthKey = format(new Date(event.trackedAt), 'MMM yyyy');
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  });
  
  const best = Object.entries(monthCounts)
    .sort(([, a], [, b]) => b - a)[0];
  
  return best ? { month: best[0], count: best[1] } : null;
};

/**
 * Calculate next achievement milestone
 */
const getNextMilestone = (
  attendedEvents: TrackedEventRecord[]
): { target: number; remaining: number; label: string } | null => {
  const total = attendedEvents.length;
  const milestones = [5, 10, 25, 50, 100, 250, 500];
  
  const nextMilestone = milestones.find(m => m > total);
  if (!nextMilestone) return null;
  
  return {
    target: nextMilestone,
    remaining: nextMilestone - total,
    label: `${nextMilestone} Events Attended`
  };
};

/**
 * Helper: Get last N days of events
 */
const _getLast90Days = (events: TrackedEventRecord[]): TrackedEventRecord[] => {
  const ninetyDaysAgo = subDays(new Date(), 90);
  return events.filter(e => new Date(e.trackedAt) >= ninetyDaysAgo);
};

