/**
 * Dashboard Metrics Hook
 * 
 * Minimal, component-driven metrics computation for dashboard.
 * Built incrementally - only computes what's needed for the current component.
 * 
 * Includes caching for fallback scoring and observability/logging.
 */

import { useMemo, useRef, useEffect } from 'react';
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

/**
 * Simple hash function for profile + event cache key
 */
function createCacheKey(eventId: string, careerProfile: CareerProfile | null): string {
  if (!careerProfile) return `${eventId}-no-profile`;
  
  // Hash relevant profile fields
  const profileHash = [
    careerProfile.currentRole,
    careerProfile.careerGoals.join(','),
    careerProfile.skillsToLearn.join(','),
    careerProfile.primarySkills.join(','),
  ].join('|');
  
  return `${eventId}-${profileHash}`;
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
  matchedEvents: Array<{ // Which events matched this goal
    id: string;
    title: string;
    attendedDate: string;
  }>;
  suggestedAction?: string; // Placeholder for now - will be computed once targets validated
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
  
  // Career Progress metrics
  goalProgress: GoalProgress[];
  hasComponentsData: boolean; // true if careerImpact.components is available
  
  // Learning Progress metrics
  skillsCoveredThisMonth: {
    uniqueSkills: string[];
    canonicalMatches: number; // Count using taxonomy
    needsVerification: string[]; // Skills that couldn't be matched via taxonomy
  };
  
  // Helper function to get matched skills for an event (checks cache)
  getEventMatchedSkills: (event: Event) => string[];
  
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
    rsvpToAttendDelta?: number; // Days between RSVP and attendance
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
  // Cache for computed alignment scores (keyed by eventId + profileHash)
  const alignmentCacheRef = useRef<Map<string, { score: number; reasons: string[]; matchedSkills?: string[]; matchedGoals?: string[] }>>(new Map());
  const previousProfileHashRef = useRef<string>('');
  
  // Clear cache if profile hash changes (useEffect ensures side effect always runs)
  useEffect(() => {
    if (!careerProfile) {
      previousProfileHashRef.current = '';
      alignmentCacheRef.current.clear();
      return;
    }
    
    const profileHash = [
      careerProfile.currentRole,
      careerProfile.careerGoals.join(','),
      careerProfile.skillsToLearn.join(','),
      careerProfile.primarySkills.join(','),
    ].join('|');
    
    if (previousProfileHashRef.current !== profileHash) {
      alignmentCacheRef.current.clear();
      previousProfileHashRef.current = profileHash;
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[useDashboardMetrics] Profile changed, cleared alignment cache');
      }
    }
  }, [careerProfile]);
  
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
      
      // Check cache
      const cacheKey = createCacheKey(event.id, careerProfile);
      const cached = alignmentCacheRef.current.get(cacheKey);
      if (cached) {
        return {
          score: cached.score,
          computed: true,
          reason: cached.reasons[0],
        };
      }
      
      // Compute alignment and cache it
      try {
        const alignment = calculateEventAlignment(event, careerProfile);
        alignmentCacheRef.current.set(cacheKey, {
          score: alignment.alignmentScore,
          reasons: alignment.alignmentReasons.map(r => r.reason),
          matchedSkills: alignment.matchedSkills,
          matchedGoals: alignment.matchedGoals,
        });
        
        // Log fallback usage in dev
        if (process.env.NODE_ENV !== 'production') {
          console.log('[useDashboardMetrics] Computed alignment for event:', event.id, 'score:', alignment.alignmentScore);
        }
        
        return {
          score: alignment.alignmentScore,
          computed: true,
          reason: alignment.alignmentReasons[0]?.reason,
        };
      } catch (error) {
        console.error('[useDashboardMetrics] Error computing alignment:', error);
        return { score: 0, computed: false };
      }
    };
  }, [careerProfile]);
  
  // Helper to get event's matched skills (from pre-computed or fallback cache)
  const getEventMatchedSkills = useMemo(() => {
    return (event: Event): string[] => {
      // Try pre-computed first
      const impact = getCareerImpact(event);
      if (impact?.explanation?.matchedSkills) {
        return impact.explanation.matchedSkills;
      }
      
      // Try fallback cache
      if (careerProfile) {
        const cacheKey = createCacheKey(event.id, careerProfile);
        const cached = alignmentCacheRef.current.get(cacheKey);
        if (cached?.matchedSkills) {
          return cached.matchedSkills;
        }
      }
      
      return [];
    };
  }, [careerProfile]);

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
        const eventEndDate = new Date(te.event.endTime || te.event.startTime);
        return eventEndDate < now;
      })
      .sort((a, b) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime());
  }, [trackedEvents]);
  
  // Calculate skills covered this month (extracted to top-level useMemo)
  // NOTE: This must come AFTER attendedEvents is computed
  const skillsCoveredThisMonth = useMemo(() => {
    const uniqueSkills = new Set<string>();
    const canonicalMatches = new Set<string>();
    const needsVerification = new Set<string>();
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEvents = attendedEvents.filter(te => {
      const eventDate = new Date(te.trackedAt);
      return eventDate >= thirtyDaysAgo;
    });
    
    if (careerProfile && careerProfile.skillsToLearn.length > 0) {
      recentEvents.forEach(te => {
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
      needsVerification: Array.from(needsVerification),
    };
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
    
    // 5. Goal progress (for Career Progress Card)
    const goalProgress: GoalProgress[] = [];
    
    if (careerProfile && careerProfile.careerGoals.length > 0) {
      careerProfile.careerGoals.forEach(goal => {
        const goalEvents = attendedEvents.filter(te => 
          te.event && doesEventMatchGoal(te.event, goal)
        );
        
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
          matchedEvents,
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
      goalProgress,
      hasComponentsData,
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
        
        // Calculate RSVP to attend delta
        const eventDate = new Date(event.startTime);
        const trackingDate = new Date(te.trackedAt);
        const rsvpToAttendDelta = differenceInDays(eventDate, trackingDate);
        
        return {
          event,
          score: alignment.score,
          trackedAt: te.trackedAt,
          attendedDate: event.startTime,
          matchedSkills,
          matchedGoals,
          rsvpToAttendDelta: rsvpToAttendDelta >= 0 ? rsvpToAttendDelta : undefined,
        };
      }),
    };
  }, [trackedEvents, upcomingEvents, careerProfile, hasComponentsData, getEventMatchedSkills, getOrComputeAlignment, attendedEvents, scoredUpcoming]);
  
  return {
    ...metrics,
    skillsCoveredThisMonth,
    getEventMatchedSkills, // Expose helper for components that need it
  };
}
