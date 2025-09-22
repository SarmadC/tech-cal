import { useMemo } from 'react';
import type { Event, TrackedEventRecord } from '@/types';

interface EventMetrics {
  total: number;
  tracked: number;
  thisMonth: number;
  virtual: number;
  upcoming: number;
  categories: Record<string, number>;
  monthlyTrend: number;
}

/**
 * Consolidated hook for calculating event metrics
 */
export function useEventMetrics(
  allEvents: Event[] = [],
  trackedEvents: TrackedEventRecord[] = []
): EventMetrics {
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter events for current month
    const thisMonthEvents = allEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.getMonth() === currentMonth && 
             eventDate.getFullYear() === currentYear;
    });
    
    // Filter virtual events
    const virtualEvents = allEvents.filter(event => 
      event.livestreamUrl || 
      event.location?.toLowerCase().includes('virtual')
    );
    
    // Filter upcoming events
    const upcomingEvents = allEvents.filter(event => 
      new Date(event.startTime) > now
    );
    
    // Calculate category distribution
    const categories = allEvents.reduce((acc, event) => {
      const category = event.category?.name || 'Other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate monthly trend (simplified)
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthEvents = allEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.getMonth() === lastMonth && 
             eventDate.getFullYear() === currentYear;
    });
    
    const monthlyTrend = lastMonthEvents.length > 0 
      ? Math.round(((thisMonthEvents.length - lastMonthEvents.length) / lastMonthEvents.length) * 100)
      : 0;
    
    return {
      total: allEvents.length,
      tracked: trackedEvents.length,
      thisMonth: thisMonthEvents.length,
      virtual: virtualEvents.length,
      upcoming: upcomingEvents.length,
      categories,
      monthlyTrend
    };
  }, [allEvents, trackedEvents]);
}
