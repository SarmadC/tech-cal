/**
 * Dashboard Metrics Hook
 * 
 * Minimal, component-driven metrics computation for dashboard.
 * Built incrementally - only computes what's needed for the current component.
 * 
 * Includes caching for fallback scoring and observability/logging.
 */

import { useMemo } from 'react';
import { calculateEventAlignment } from '@/utils/uiScoringAdapter';
import { doesEventMatchGoal, getGoalTarget } from '@/utils/eventGoalAlignment';
import { getCanonicalSkillMeta } from '@/utils/skillTaxonomy';
import { differenceInDays } from 'date-fns';
import type { Event, TrackedEventRecord, CareerProfile } from '@/types';
import { RECOMMENDATION_THRESHOLDS } from '@/config/recommendationThresholds';

/**
 * Extract career impact score from event (like useSmartFilters pattern)
 */
function getCareerImpactScore(event: Event): number {
  const asScored = event as {
    careerImpactLite?: { overall: number };
    careerImpact?: { overall: number };
  };
  return (
    asScored.careerImpactLite?.overall ??
    asScored.careerImpact?.overall ??
    0
  );
}

/**
 * Extract full career impact data from event
 */
function getCareerImpact(
  event: Event
): { overall: number; explanation?: { reasons: string[]; matchedSkills: string[] } } | null {
  const asScored = event as {
    careerImpactLite?: { overall: number };
    careerImpact?: {
      overall: number;
      explanation?: { reasons: string[]; matchedSkills: string[] };
    };
  };
  
  if (asScored.careerImpact) {
    return {
      overall: asScored.careerImpact.overall,
      explanation: asScored.careerImpact.explanation,
    };
  }
  
  if (asScored.careerImpactLite) {
    return {
      overall: asScored.careerImpactLite.overall,
    };
  }
  
  return null;
}

function getEventOccurrenceDate(event: Event): Date {
  return new Date(event.endTime || event.startTime);
}

/**
 * Goal progress data for Career Progress Card
 */
export interface GoalProgress {
  goal: string;
  eventCount: number;
  impactTotal: number; // Sum of impact scores for events matching this goal
  progress: number; // 0-100 based on event count toward target
  targetEventCount: number; // Target from goal config
  upcomingMatchCount: number; // Recommended upcoming events matching this goal
  nextRecommendedEventTitle?: string;
  matchedEvents: Array<{ // Which events matched this goal
    id: string;
    title: string;
    attendedDate: string;
  }>;
  suggestedAction?: string;
}

function truncateEventTitle(title: string, maxLength: number = 44): string {
  if (title.length <= maxLength) return title;
  return `${title.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildSuggestedGoalAction(params: {
  goal: string;
  progress: number;
  eventCount: number;
  targetEventCount: number;
  nextRecommendedEventTitle?: string;
}): string | undefined {
  const { goal, progress, eventCount, targetEventCount, nextRecommendedEventTitle } = params;

  if (progress >= 100) return undefined;

  const eventsNeeded = Math.max(0, targetEventCount - eventCount);
  if (eventsNeeded <= 0) return undefined;

  if (nextRecommendedEventTitle) {
    const eventLabel = truncateEventTitle(nextRecommendedEventTitle);
    if (eventCount === 0) {
      return `Start this goal with "${eventLabel}"`;
    }
    return `Attend ${eventsNeeded} more event${eventsNeeded === 1 ? '' : 's'} (next: "${eventLabel}")`;
  }

  if (eventCount === 0) {
    return `Add your first ${goal.replace(/-/g, ' ')} event to your pipeline`;
  }

  return `Attend ${eventsNeeded} more ${goal.replace(/-/g, ' ')} event${eventsNeeded === 1 ? '' : 's'}`;
}

/**
 * Metrics computed for dashboard components
 * Extended incrementally as new components are built.
 */
interface DashboardMetrics {
  // Focus Hero metrics
  topRecommendedEvent: {
    event: Event;
    score: number;
    computed: boolean; // true if computed via fallback, false if pre-computed
    reason?: string; // Primary recommendation reason
  } | null;
  upcomingCommitments: number;
  lastImpactScore: {
    score: number;
    computed: boolean;
    eventTitle?: string;
  } | null;
  avgImpactEventCount: number;

  // Career Progress metrics
  goalProgress: GoalProgress[];

  // Learning Progress metrics
  skillsCoveredThisMonth: {
    uniqueSkills: string[];
    canonicalMatches: number; // Count using taxonomy
  };
  allTimeSkillsCovered: {
    count: number;
    skills: string[];
  };
  
  // Helper function to get matched skills for an event (checks cache)
  getEventMatchedSkills: (event: Event) => string[];
  getEventAlignment: (event: Event) => {
    score: number;
    computed: boolean;
    reason?: string;
  };
  
  // Pipeline metrics
  topRecommendedEvents: Array<{
    event: Event;
    score: number;
    reason?: string;
  }>;
  followUpReminders: Array<{
    event: Event;
    daysUntil: number;
    trackingId: string;
  }>;
  
  // Recent Wins metrics
  recentWins: Array<{
    event: Event;
    score: number;
    trackedAt: string;
    attendedDate: string;
    matchedSkills: string[];
    matchedGoals: string[];
    bookmarkedLeadDays?: number; // Days between first save and the event
  }>;
}

interface UseDashboardMetricsOptions {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  careerProfile: CareerProfile | null;
}

/**
 * Dashboard metrics hook - computes incrementally as components are added
 */
export function useDashboardMetrics({
  trackedEvents,
  upcomingEvents,
  careerProfile,
}: UseDashboardMetricsOptions): DashboardMetrics {
  const computedAlignmentByEventId = useMemo(() => {
    const alignmentMap = new Map<string, {
      score: number;
      reasons: string[];
      matchedSkills: string[];
      matchedGoals: string[];
    }>();

    if (!careerProfile) {
      return alignmentMap;
    }

    const eventsToCompute = new Map<string, Event>();
    const collectEventForComputation = (event: Event | null | undefined) => {
      if (!event) return;
      if (getCareerImpactScore(event) > 0) return;
      eventsToCompute.set(event.id, event);
    };

    upcomingEvents.forEach(collectEventForComputation);
    trackedEvents.forEach(te => collectEventForComputation(te.event));

    eventsToCompute.forEach((event, eventId) => {
      try {
        const alignment = calculateEventAlignment(event, careerProfile);
        alignmentMap.set(eventId, {
          score: alignment.alignmentScore,
          reasons: alignment.alignmentReasons.map(reason => reason.reason),
          matchedSkills: alignment.matchedSkills,
          matchedGoals: alignment.matchedGoals,
        });
      } catch (error) {
        console.error('[useDashboardMetrics] Error computing alignment:', error);
      }
    });

    if (process.env.NODE_ENV !== 'production' && alignmentMap.size > 0) {
      console.log('[useDashboardMetrics] Computed fallback alignments:', alignmentMap.size);
    }

    return alignmentMap;
  }, [careerProfile, upcomingEvents, trackedEvents]);
  
  // Helper to get or compute alignment
  const getOrComputeAlignment = useMemo(() => {
    return (event: Event): { score: number; computed: boolean; reason?: string } => {
      // First try to get pre-computed score
      const precomputed = getCareerImpactScore(event);
      if (precomputed > 0) {
        const impact = getCareerImpact(event);
        return {
          score: precomputed,
          computed: false,
          reason: impact?.explanation?.reasons?.[0],
        };
      }
      
      // If no pre-computed score and no profile, return zero
      if (!careerProfile) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[useDashboardMetrics] No career profile, cannot compute alignment for event:', event.id);
        }
        return { score: 0, computed: false };
      }
      
      const cached = computedAlignmentByEventId.get(event.id);
      if (cached != null) {
        return {
          score: cached.score,
          computed: true,
          reason: cached.reasons[0],
        };
      }

      return { score: 0, computed: false };
    };
  }, [careerProfile, computedAlignmentByEventId]);
  
  // Helper to get event's matched skills (from pre-computed impact or memoized fallback)
  const getEventMatchedSkills = useMemo(() => {
    return (event: Event): string[] => {
      const impact = getCareerImpact(event);
      if (impact?.explanation?.matchedSkills) {
        return impact.explanation.matchedSkills;
      }
      
      return computedAlignmentByEventId.get(event.id)?.matchedSkills ?? [];
    };
  }, [computedAlignmentByEventId]);

  // Check if components data is available (in both upcoming and tracked events)
  const hasComponentsData = useMemo(() => {
    // Check upcoming events
    const sampleUpcoming = upcomingEvents.find(e => {
      const asScored = e as { careerImpact?: { components?: unknown } };
      return asScored.careerImpact?.components != null;
    });
    
    // Check tracked events
    const sampleTracked = trackedEvents.find(te => {
      if (!te.event) return false;
      const asScored = te.event as { careerImpact?: { components?: unknown } };
      return asScored.careerImpact?.components != null;
    });
    
    return sampleUpcoming != null || sampleTracked != null;
  }, [upcomingEvents, trackedEvents]);
  
  // Pre-compute scored upcoming events (used by multiple metrics)
  const scoredUpcoming = useMemo(() => {
    return upcomingEvents
      .map(event => ({
        event,
        ...getOrComputeAlignment(event),
      }))
      .filter(item => item.score >= RECOMMENDATION_THRESHOLDS.RECOMMENDED)
      .sort((a, b) => b.score - a.score);
  }, [upcomingEvents, getOrComputeAlignment]);
  
  // Pre-compute attended events (used by multiple metrics)
  // Only include events that have ACTUALLY occurred (event date is in the past)
  const attendedEvents = useMemo(() => {
    const now = new Date();
    return trackedEvents
      .filter(te => {
        if (te.status !== 'attended' || !te.event) return false;
        // Only include if event end date (or start date if no end) has passed
        const eventEndDate = getEventOccurrenceDate(te.event);
        return eventEndDate < now;
      })
      .sort((a, b) => getEventOccurrenceDate(b.event!).getTime() - getEventOccurrenceDate(a.event!).getTime());
  }, [trackedEvents]);
  
  // Calculate skills covered this month (current calendar month)
  // NOTE: This must come AFTER attendedEvents is computed
  const skillsCoveredThisMonth = useMemo(() => {
    const uniqueSkills = new Set<string>();
    const canonicalMatches = new Set<string>();
    const needsVerification = new Set<string>();
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthEvents = attendedEvents.filter(te => {
      const eventDate = getEventOccurrenceDate(te.event!);
      return eventDate >= monthStart;
    });
    
    if (careerProfile && careerProfile.skillsToLearn.length > 0) {
      monthEvents.forEach(te => {
        if (!te.event) return;
        
        const matchedSkills = getEventMatchedSkills(te.event);
        
        matchedSkills.forEach(skill => {
          // Check if skill can be matched via canonical taxonomy
          const canonical = getCanonicalSkillMeta(skill);
          if (canonical) {
            // Use canonical name for both uniqueSkills and canonical count
            uniqueSkills.add(canonical.name);
            canonicalMatches.add(canonical.name);
          } else {
            // Check if it matches any skillsToLearn
            const matchesTargetSkill = careerProfile.skillsToLearn.some(
              targetSkill => {
                const targetCanonical = getCanonicalSkillMeta(targetSkill);
                return targetCanonical?.name.toLowerCase().includes(skill.toLowerCase()) ||
                       skill.toLowerCase().includes(targetCanonical?.name.toLowerCase() || '');
              }
            );
            
            if (matchesTargetSkill) {
              uniqueSkills.add(skill);
            } else {
              needsVerification.add(skill);
            }
          }
        });
      });
    }
    
    return {
      uniqueSkills: Array.from(uniqueSkills),
      canonicalMatches: canonicalMatches.size,
    };
  }, [attendedEvents, careerProfile, getEventMatchedSkills]);
  
  // All-time skills coverage (cumulative, not rolling window)
  const allTimeSkillsCovered = useMemo(() => {
    if (!careerProfile || careerProfile.skillsToLearn.length === 0) {
      return { count: 0, skills: [] as string[] };
    }
    const covered = new Set<string>();
    attendedEvents.forEach(te => {
      if (!te.event) return;
      getEventMatchedSkills(te.event).forEach(skill => {
        const canonical = getCanonicalSkillMeta(skill);
        const name = canonical?.name ?? skill;
        const matchesTarget = careerProfile.skillsToLearn.some(t => {
          const tc = getCanonicalSkillMeta(t);
          return (tc?.name ?? t).toLowerCase() === name.toLowerCase();
        });
        if (matchesTarget) covered.add(name);
      });
    });
    return { count: covered.size, skills: Array.from(covered) };
  }, [attendedEvents, careerProfile, getEventMatchedSkills]);

  // Compute metrics
  const metrics = useMemo(() => {
    // 1. Top recommended event (highest score from upcoming events)
    const topRecommendedEvent =
      scoredUpcoming.length > 0
        ? {
            event: scoredUpcoming[0].event,
            score: scoredUpcoming[0].score,
            computed: scoredUpcoming[0].computed,
            reason: scoredUpcoming[0].reason,
          }
        : null;
    
    // 2. Follow-up reminders (RSVP'd but not yet attended, sorted by urgency)
    const followUpReminders = trackedEvents
      .filter(te => {
        if (!te.event || te.status !== 'attending') return false;
        // Only show events that haven't occurred yet
        const eventDate = new Date(te.event.startTime);
        const now = new Date();
        return eventDate > now;
      })
      .map(te => {
        const eventDate = new Date(te.event!.startTime);
        return {
          event: te.event!,
          daysUntil: Math.max(0, differenceInDays(eventDate, new Date())),
          trackingId: te.trackingId,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);

    // 3. Upcoming commitments count (derived from reminders)
    const upcomingCommitments = followUpReminders.length;
    
    // 4. Last impact score (most recent attended event)
    const lastAttended = attendedEvents[0];
    const lastImpactScore = lastAttended?.event
      ? {
          ...getOrComputeAlignment(lastAttended.event),
          eventTitle: lastAttended.event.title,
        }
      : null;

    // 4b. 30-day average impact score
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const recentAttended = attendedEvents.filter(te =>
      te.event && getEventOccurrenceDate(te.event) >= last30Days
    );
    const avgImpactEventCount = recentAttended.length;
    
    // 5. Goal progress (for Career Progress Card)
    const goalProgress: GoalProgress[] = [];
    
    if (careerProfile && careerProfile.careerGoals.length > 0) {
      careerProfile.careerGoals.forEach(goal => {
        const goalEvents = attendedEvents.filter(te => 
          te.event && doesEventMatchGoal(te.event, goal)
        );
        const matchingUpcoming = scoredUpcoming.filter(item => doesEventMatchGoal(item.event, goal));
        
        let impactTotal = 0;
        goalEvents.forEach(te => {
          if (te.event) {
            const impact = getCareerImpact(te.event);
            impactTotal += impact?.overall ?? 0;
          }
        });
        
        const target = getGoalTarget(goal);
        // Progress based on event count toward target (simple, intuitive calculation)
        // e.g., 1 of 12 events = ~8%, 6 of 12 = 50%
        const progress = target > 0 ? Math.min(Math.round((goalEvents.length / target) * 100), 100) : 0;
        
        // Track which events contributed to this goal
        const matchedEvents = goalEvents.map(te => ({
          id: te.event!.id,
          title: te.event!.title,
          attendedDate: te.event!.startTime,
        }));
        
        goalProgress.push({
          goal,
          eventCount: goalEvents.length,
          impactTotal: Math.round(impactTotal),
          progress,
          targetEventCount: target,
          upcomingMatchCount: matchingUpcoming.length,
          nextRecommendedEventTitle: matchingUpcoming[0]?.event.title,
          matchedEvents,
          suggestedAction: buildSuggestedGoalAction({
            goal,
            progress,
            eventCount: goalEvents.length,
            targetEventCount: target,
            nextRecommendedEventTitle: matchingUpcoming[0]?.event.title,
          }),
        });
      });
    }
    
    // Log missing data in dev
    if (process.env.NODE_ENV !== 'production') {
      if (!topRecommendedEvent && upcomingEvents.length > 0) {
        console.warn('[useDashboardMetrics] No recommended events found (score >=', RECOMMENDATION_THRESHOLDS.RECOMMENDED, ')');
      }
      if (upcomingCommitments === 0 && trackedEvents.length > 0) {
        console.info('[useDashboardMetrics] No upcoming commitments found');
      }
      if (!lastImpactScore && attendedEvents.length > 0) {
        console.warn('[useDashboardMetrics] Attended events found but no impact scores available');
      }
      if (!hasComponentsData) {
        console.info('[useDashboardMetrics] Using aggregate scoring (careerImpact.components not available)');
      }
    }
    
    return {
      topRecommendedEvent,
      upcomingCommitments,
      lastImpactScore,
      avgImpactEventCount,
      goalProgress,
      // Top recommended events for Pipeline (up to 3)
      topRecommendedEvents: scoredUpcoming
        .slice(0, 3)
        .map(item => ({
          event: item.event,
          score: item.score,
          reason: item.reason,
        })),
      followUpReminders,
      // Recent Wins (last 10 attended events)
      // Recent Wins (last 10 attended events)
      recentWins: attendedEvents.slice(0, 10).map(te => {
        const event = te.event!;
        const alignment = getOrComputeAlignment(event);
        const matchedSkills = getEventMatchedSkills(event);
        
        // Get matched goals
        const matchedGoals: string[] = [];
        if (careerProfile) {
          careerProfile.careerGoals.forEach(goal => {
            const goalEvents = [te];
            if (goalEvents.some(ge => ge.event && doesEventMatchGoal(ge.event, goal))) {
              matchedGoals.push(goal);
            }
          });
        }
        
        const eventDate = getEventOccurrenceDate(event);
        const bookmarkedDate = te.bookmarkedAt ? new Date(te.bookmarkedAt) : null;
        const bookmarkedLeadDays = bookmarkedDate
          ? differenceInDays(eventDate, bookmarkedDate)
          : undefined;
        
        return {
          event,
          score: alignment.score,
          trackedAt: te.trackedAt,
          attendedDate: event.startTime,
          matchedSkills,
          matchedGoals,
          bookmarkedLeadDays: bookmarkedLeadDays !== undefined && bookmarkedLeadDays >= 0
            ? bookmarkedLeadDays
            : undefined,
        };
      }),
    };
  }, [trackedEvents, upcomingEvents, careerProfile, getEventMatchedSkills, getOrComputeAlignment, attendedEvents, scoredUpcoming, hasComponentsData]);

  return {
    ...metrics,
    skillsCoveredThisMonth,
    allTimeSkillsCovered,
    getEventAlignment: getOrComputeAlignment,
    getEventMatchedSkills, // Expose helper for components that need it
  };
}
