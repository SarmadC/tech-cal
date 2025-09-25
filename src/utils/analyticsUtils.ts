// src/utils/analyticsUtils.ts

import type { TrackedEventRecord, Event } from '@/types';

export interface BasicAnalyticsData {
  averageImpactScore: number;
  monthlyStats: {
    eventsAttended: number;
    highImpactEvents: number;
    skillsImproved: number;
    networkingEvents: number;
  };
  isBasic: true;
}

/**
 * Calculate basic analytics from tracked events and upcoming events
 * This replaces the need for API calls in ProgressiveAnalytics
 */
export function calculateBasicAnalytics(
  trackedEvents: TrackedEventRecord[],
  upcomingEvents: Event[]
): BasicAnalyticsData {
  // Input validation
  if (!Array.isArray(trackedEvents) || !Array.isArray(upcomingEvents)) {
    return getDefaultAnalytics();
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Filter events from the last 30 days using trackedAt (when user tracked the event)
  const recentTrackedEvents = trackedEvents.filter(event => {
    if (!event.trackedAt) return false;
    const eventDate = new Date(event.trackedAt);
    return !isNaN(eventDate.getTime()) && eventDate >= thirtyDaysAgo;
  });

  // Calculate events attended (attended events)
  const eventsAttended = recentTrackedEvents.filter(event => 
    event.status === 'attended'
  ).length;

  // Calculate high impact events (events with specific high-impact keywords)
  const highImpactEvents = recentTrackedEvents.filter(event => {
    const eventData = event.event;
    if (!eventData?.title) return false;
    
    const title = eventData.title.toLowerCase();
    return title.includes('conference') || 
           title.includes('workshop') || 
           title.includes('summit') ||
           title.includes('symposium');
  }).length;

  // Calculate skills improved (based on unique event types attended)
  const skillsImproved = new Set(
    recentTrackedEvents
      .filter(event => event.status === 'attended' && event.event?.eventTypeId)
      .map(event => event.event!.eventTypeId)
  ).size;

  // Calculate networking events (events with networking keywords)
  const networkingEvents = recentTrackedEvents.filter(event => {
    const eventData = event.event;
    if (!eventData?.title) return false;
    
    const title = eventData.title.toLowerCase();
    return title.includes('networking') ||
           title.includes('meetup') ||
           title.includes('community') ||
           title.includes('social');
  }).length;

  // Calculate average impact score (simplified calculation)
  const totalEvents = recentTrackedEvents.length;
  const averageImpactScore = totalEvents > 0 
    ? Math.min(0.95, Math.max(0.1, (eventsAttended * 0.3 + highImpactEvents * 0.4 + skillsImproved * 0.2 + networkingEvents * 0.1) / totalEvents))
    : 0.1;

  return {
    averageImpactScore,
    monthlyStats: {
      eventsAttended,
      highImpactEvents,
      skillsImproved,
      networkingEvents,
    },
    isBasic: true,
  };
}

/**
 * Calculate upcoming opportunities from upcoming events
 */
export function calculateUpcomingOpportunities(upcomingEvents: Event[]): Event[] {
  if (!Array.isArray(upcomingEvents)) {
    return [];
  }

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return upcomingEvents
    .filter(event => {
      if (!event.startTime) return false;
      const eventDate = new Date(event.startTime);
      return !isNaN(eventDate.getTime()) && eventDate >= now && eventDate <= nextWeek;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5); // Top 5 upcoming opportunities
}

/**
 * Get default analytics data for error cases
 */
function getDefaultAnalytics(): BasicAnalyticsData {
  return {
    averageImpactScore: 0.1,
    monthlyStats: {
      eventsAttended: 0,
      highImpactEvents: 0,
      skillsImproved: 0,
      networkingEvents: 0,
    },
    isBasic: true,
  };
}
