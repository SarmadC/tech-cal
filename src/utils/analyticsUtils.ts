// Utility functions for analytics context extraction and tracking
// Consolidates duplicate logic across click/save tracking

import { ANALYTICS_CONFIG } from '@/config/analyticsConfig';

/**
 * Extract algorithm context from event metadata
 * Handles both careerImpact and careerImpactLite structures
 */
export function extractAlgorithmContext(event: Record<string, unknown>): {
  algorithmVersion: string;
  scoringTriggers?: string[];
} {
  // Try careerImpact.metadata first (newer structure)
  const metadata = (event?.careerImpact as any)?.metadata; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (metadata) {
    return {
      algorithmVersion: metadata.algorithmVersion || ANALYTICS_CONFIG.CURRENT_ALGORITHM_VERSION,
      scoringTriggers: metadata.scoringTriggers
    };
  }

  // Fallback to careerImpactLite (legacy structure)
  const lite = (event?.careerImpactLite as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (lite) {
    return {
      algorithmVersion: lite.algorithmVersion || ANALYTICS_CONFIG.CURRENT_ALGORITHM_VERSION,
      scoringTriggers: lite.scoringTriggers
    };
  }

  // Default fallback
  return {
    algorithmVersion: ANALYTICS_CONFIG.CURRENT_ALGORITHM_VERSION
  };
}

/**
 * Create analytics context object for tracking
 * Consolidates the context creation logic
 */
export function createAnalyticsContext(event: Record<string, unknown>): Record<string, unknown> {
  const { algorithmVersion, scoringTriggers } = extractAlgorithmContext(event);
  
  const context: Record<string, unknown> = { algorithmVersion };
  if (scoringTriggers && Array.isArray(scoringTriggers)) {
    context.scoringTriggers = scoringTriggers;
  }
  
  return context;
}

/**
 * Calculate basic analytics from tracked events and upcoming events
 */
export function calculateBasicAnalytics(
  trackedEvents: Array<{ trackingId: string; status: string; trackedAt: string }>,
  upcomingEvents: Array<{ id: string; startTime: string; attendeeCount?: number | null }>
): {
  totalTracked: number;
  completedEvents: number;
  upcomingEvents: number;
  averageAttendees: number;
} {
  const totalTracked = trackedEvents.length;
  const completedEvents = trackedEvents.filter(event => 
    event.status === 'completed' || event.status === 'attended'
  ).length;
  const upcomingEventsCount = upcomingEvents.length;
  
  const attendees = upcomingEvents
    .map(event => event.attendeeCount || 0)
    .filter(count => count > 0);
  
  const averageAttendees = attendees.length > 0 
    ? attendees.reduce((sum, count) => sum + count, 0) / attendees.length 
    : 0;

  return {
    totalTracked,
    completedEvents,
    upcomingEvents: upcomingEventsCount,
    averageAttendees: Math.round(averageAttendees)
  };
}

/**
 * Calculate upcoming opportunities from events
 */
export function calculateUpcomingOpportunities(
  upcomingEvents: Array<{ 
    id: string; 
    title: string; 
    startTime: string; 
    attendeeCount?: number | null;
    category?: { name: string };
  }>
): Array<{
  id: string;
  title: string;
  startTime: string;
  attendeeCount: number;
  category: string;
  priority: 'high' | 'medium' | 'low';
}> {
  return upcomingEvents
    .map(event => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      attendeeCount: event.attendeeCount || 0,
      category: event.category?.name || 'General',
      priority: (event.attendeeCount || 0) > 100 ? 'high' as const :
                (event.attendeeCount || 0) > 50 ? 'medium' as const : 'low' as const
    }))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}