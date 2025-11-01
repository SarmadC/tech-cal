import { subDays, isThisMonth, differenceInDays, format } from 'date-fns';
import type { TrackedEventRecord, Event } from '@/types';

// ============================================
// PREDICTION WEIGHTS - Single Source of Truth
// ============================================

/**
 * Centralized weight configuration for attendance prediction
 * These weights determine how much each factor contributes to the overall score
 */
export const PREDICTION_WEIGHTS = {
  eventTypeMatch: 0.20,
  tagMatch: 0.20,
  skillsAlignment: 0.20,
  pastAttendance: 0.25,
  scheduleFit: 0.15
} as const;

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
  const bookmarked = trackedEvents.filter(e => e.isBookmarked).length;
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

export interface AttendancePrediction {
  score: number;
  level: 'high' | 'medium' | 'low';
  color: string;
  bgColor: string;
  breakdown: {
    eventTypeMatch: number;
    tagMatch: number;
    skillsAlignment: number;
    pastAttendance: number;
    scheduleFit: number;
  };
  explanation: string;
  keyFactors: string[];
}

/**
 * Score likelihood of attending an event with detailed breakdown
 */
export const scoreAttendanceLikelihood = (
  event: Event,
  trackedEvents: TrackedEventRecord[]
): AttendancePrediction => {
  const now = new Date();
  const eventDate = new Date(event.startTime);
  const _daysUntil = differenceInDays(eventDate, now);
  
  // Calculate user's historical attend rate
  const registered = trackedEvents.filter(e => e.status === 'attending' || e.status === 'attended');
  const attended = trackedEvents.filter(e => e.status === 'attended');
  const userAttendRate = registered.length > 0 ? attended.length / registered.length : 0.5;
  
  // Detailed scoring factors (0-100 scale)
  const eventTypeMatch = calculateEventTypeMatch(event, trackedEvents);
  const tagMatch = calculateTagMatch(event, trackedEvents);
  const skillsAlignment = calculateSkillsAlignment(event, trackedEvents);
  const pastAttendance = Math.round(userAttendRate * 100);
  const scheduleFit = calculateScheduleFit(event, trackedEvents);
  
  // Weighted score calculation with tag matching (using centralized weights)
  const weightedScore = (
    eventTypeMatch * PREDICTION_WEIGHTS.eventTypeMatch +
    tagMatch * PREDICTION_WEIGHTS.tagMatch +
    skillsAlignment * PREDICTION_WEIGHTS.skillsAlignment +
    pastAttendance * PREDICTION_WEIGHTS.pastAttendance +
    scheduleFit * PREDICTION_WEIGHTS.scheduleFit
  );
  
  const score = Math.round(weightedScore);
  const _level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  
  // Generate explanation and key factors
  const { explanation, keyFactors } = generateExplanation(score, {
    eventTypeMatch,
    tagMatch,
    skillsAlignment,
    pastAttendance,
    scheduleFit
  });
  
  if (score >= 70) {
    return { 
      score,
      level: 'high',
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      breakdown: { eventTypeMatch, tagMatch, skillsAlignment, pastAttendance, scheduleFit },
      explanation,
      keyFactors
    };
  }
  if (score >= 40) {
    return { 
      score,
      level: 'medium',
      color: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      breakdown: { eventTypeMatch, tagMatch, skillsAlignment, pastAttendance, scheduleFit },
      explanation,
      keyFactors
    };
  }
  return { 
    score,
    level: 'low',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    breakdown: { eventTypeMatch, tagMatch, skillsAlignment, pastAttendance, scheduleFit },
    explanation,
    keyFactors
  };
};

/**
 * Calculate how well the event type matches user's historical preferences
 * Uses database event_type data when available, falls back to heuristics
 */
const calculateEventTypeMatch = (event: Event, trackedEvents: TrackedEventRecord[]): number => {
  const attendedEvents = trackedEvents.filter(e => e.status === 'attended' && e.event);
  
  if (attendedEvents.length === 0) return 50; // Neutral if no history
  
  let score = 0;
  const weights = { eventType: 0, organizer: 0, keywords: 0 };
  
  // 1. EVENT TYPE MATCHING (Primary - 60% weight)
  // Use database event_type_id when available for accurate matching
  if (event.eventTypeId) {
    const sameTypeCount = attendedEvents.filter(te => 
      te.event?.eventTypeId === event.eventTypeId
    ).length;
    
    if (sameTypeCount > 0) {
      // Strong match: user has attended this exact event type before
      const matchRatio = sameTypeCount / attendedEvents.length;
      const typeScore = Math.min(95, 50 + (matchRatio * 45));
      score += typeScore * 0.6;
      weights.eventType = 0.6;
    } else if (event.category?.name) {
      // Check if event type name is similar to user's attended event types
      const similarTypes = attendedEvents.filter(te => {
        const attendedTypeName = te.event?.category?.name?.toLowerCase();
        const currentTypeName = event.category?.name?.toLowerCase();
        return attendedTypeName && currentTypeName && (
          attendedTypeName.includes(currentTypeName) ||
          currentTypeName.includes(attendedTypeName)
        );
      }).length;
      
      if (similarTypes > 0) {
        score += 50 * 0.6;
        weights.eventType = 0.6;
      } else {
        // Different event type - lower score
        score += 25 * 0.6;
        weights.eventType = 0.6;
      }
    }
  }
  
  // 2. ORGANIZER MATCHING (Secondary - 25% weight)
  const similarOrganizers = attendedEvents.filter(te => {
    const attendedOrg = te.event?.organizer?.toLowerCase();
    const currentOrg = event.organizer?.toLowerCase();
    return attendedOrg && currentOrg && (
      attendedOrg.includes(currentOrg) ||
      currentOrg.includes(attendedOrg)
    );
  }).length;
  
  if (similarOrganizers > 0) {
    const orgRatio = similarOrganizers / attendedEvents.length;
    const orgScore = Math.min(90, 40 + (orgRatio * 50));
    score += orgScore * 0.25;
    weights.organizer = 0.25;
  } else {
    score += 20 * 0.25;
    weights.organizer = 0.25;
  }
  
  // 3. KEYWORD/TITLE MATCHING (Tertiary - 15% weight)
  const similarTitles = attendedEvents.filter(te => 
    te.event?.title && event.title &&
    (hasCommonKeywords(te.event.title, event.title) || 
     hasSimilarEventFormat(te.event.title, event.title))
  ).length;
  
  if (similarTitles > 0) {
    const titleRatio = similarTitles / attendedEvents.length;
    const titleScore = Math.min(80, 30 + (titleRatio * 50));
    score += titleScore * 0.15;
    weights.keywords = 0.15;
  } else {
    score += 15 * 0.15;
    weights.keywords = 0.15;
  }
  
  // Normalize score if weights don't add up to 1.0
  const totalWeight = weights.eventType + weights.organizer + weights.keywords;
  const normalizedScore = totalWeight > 0 ? score / totalWeight : 30;
  
  return Math.min(95, Math.max(10, Math.round(normalizedScore)));
};

/**
 * Check if two event titles have common keywords
 */
const hasCommonKeywords = (title1: string, title2: string): boolean => {
  const words1 = title1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = title2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.length >= 1;
};

/**
 * Check if two events have similar format patterns
 */
const hasSimilarEventFormat = (title1: string, title2: string): boolean => {
  const format1 = extractEventFormat(title1);
  const format2 = extractEventFormat(title2);
  
  return format1 === format2 && format1 !== 'unknown';
};

/**
 * Extract event format from title
 */
const extractEventFormat = (title: string): string => {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('day') || lowerTitle.includes('weekend')) return 'multi-day';
  if (lowerTitle.includes('hour') || lowerTitle.includes('session')) return 'session';
  if (lowerTitle.includes('series') || lowerTitle.includes('track')) return 'series';
  
  return 'unknown';
};

/**
 * Calculate tag match score based on user's historical tag preferences
 */
const calculateTagMatch = (event: Event, trackedEvents: TrackedEventRecord[]): number => {
  const attendedEvents = trackedEvents.filter(e => e.status === 'attended' && e.event);
  
  if (attendedEvents.length === 0) return 50; // Neutral if no history
  
  // Get current event's tags
  const currentTags = event.tags || [];
  if (currentTags.length === 0) return 40; // Slight penalty for events without tags
  
  // Build user's tag preference map from attended events
  const userTagFrequency = new Map<string, number>();
  let totalTagCount = 0;
  
  attendedEvents.forEach(te => {
    const eventTags = te.event?.tags || [];
    eventTags.forEach(tag => {
      const count = userTagFrequency.get(tag.id) || 0;
      userTagFrequency.set(tag.id, count + 1);
      totalTagCount++;
    });
  });
  
  if (totalTagCount === 0) return 50; // Neutral if attended events have no tags
  
  // Calculate match score
  let matchScore = 0;
  let matchedTagCount = 0;
  
  currentTags.forEach(tag => {
    const userFrequency = userTagFrequency.get(tag.id) || 0;
    if (userFrequency > 0) {
      // Tag match found - score based on frequency
      const frequencyRatio = userFrequency / attendedEvents.length;
      matchScore += Math.min(95, 40 + (frequencyRatio * 55));
      matchedTagCount++;
    } else {
      // New tag - lower score
      matchScore += 20;
    }
  });
  
  // Average score across all tags
  const avgScore = currentTags.length > 0 ? matchScore / currentTags.length : 30;
  
  // Boost score if multiple tags match
  const matchRatio = matchedTagCount / currentTags.length;
  const boostedScore = avgScore + (matchRatio * 10);
  
  return Math.min(95, Math.max(10, Math.round(boostedScore)));
};

/**
 * Calculate skills alignment based on user's skill profile
 */
const calculateSkillsAlignment = (event: Event, trackedEvents: TrackedEventRecord[]): number => {
  // This would analyze event topics against user's skill interests
  // For now, use a heuristic based on attendance patterns
  const attendedEvents = trackedEvents.filter(e => e.status === 'attended');
  const skillRelevance = attendedEvents.length > 0 ? Math.min(80, 25 + (attendedEvents.length * 3)) : 20;
  return skillRelevance;
};

/**
 * Calculate schedule fit based on timing and user patterns
 */
const calculateScheduleFit = (event: Event, trackedEvents: TrackedEventRecord[]): number => {
  const eventDate = new Date(event.startTime);
  const dayOfWeek = eventDate.getDay();
  
  // Analyze user's historical attendance by day of week
  const attendedEvents = trackedEvents.filter(e => e.status === 'attended');
  
  if (attendedEvents.length === 0) return 50; // Neutral if no history
  
  // Simple heuristic: prefer weekends for events, weekdays for workshops
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const baseFit = isWeekend ? 70 : 60;
  
  return Math.min(90, baseFit + Math.min(20, attendedEvents.length * 2));
};

/**
 * Generate contextual explanation and key factors
 */
const generateExplanation = (
  score: number,
  breakdown: { 
    eventTypeMatch: number; 
    tagMatch: number;
    skillsAlignment: number; 
    pastAttendance: number; 
    scheduleFit: number;
  }
) => {
  let explanation = '';
  const keyFactors: string[] = [];
  
  // Build explanation based on overall score
  if (score >= 70) {
    explanation = 'Strong match with your interests and past attendance patterns';
  } else if (score >= 40) {
    explanation = 'Moderate alignment with your preferences and schedule';
  } else {
    explanation = 'Lower confidence based on your event history and interests';
  }
  
  // Add key factors based on breakdown scores
  // Prioritize factors with highest impact (positive or negative)
  const factors = [
    { score: breakdown.eventTypeMatch, threshold: 60, high: 'Event type matches your attended events', low: 'Event type differs from your history' },
    { score: breakdown.tagMatch, threshold: 60, high: 'Event topics match your interests', low: 'Event topics are new to you' },
    { score: breakdown.skillsAlignment, threshold: 60, high: 'Skills align with your profile', low: 'Limited skills overlap' },
    { score: breakdown.pastAttendance, threshold: 60, high: 'High past attendance rate', low: 'Your past RSVP patterns suggest lower likelihood' },
    { score: breakdown.scheduleFit, threshold: 60, high: 'Good schedule fit', low: 'Schedule compatibility concerns' }
  ];
  
  // Sort factors by their scores (descending) to show most impactful first
  factors.sort((a, b) => b.score - a.score);
  
  // Add top 3-4 factors
  factors.forEach(factor => {
    if (keyFactors.length < 4) {
      keyFactors.push(factor.score >= factor.threshold ? factor.high : factor.low);
    }
  });
  
  // Ensure we have at least 3 key factors
  if (keyFactors.length < 3) {
    keyFactors.push('Based on your event preferences');
  }
  
  return { explanation, keyFactors: keyFactors.slice(0, 4) };
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

