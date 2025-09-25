'use client';

import { useQuery } from '@tanstack/react-query';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { useLightweightTrackedEvents } from '@/hooks/useTrackedEventsUnified';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import type { EventType, Event, TrackedEventRecord } from '@/types';

interface UseDashboardDataProps {
  initialEventTypes?: EventType[];
  initialUpcomingEvents?: Event[];
  initialTrackedEvents?: TrackedEventRecord[];
}

export function useDashboardData({ 
  initialEventTypes = [], 
  initialUpcomingEvents = [],
  initialTrackedEvents = []
}: UseDashboardDataProps = {}) {
  const { supabase, isReady } = useSupabaseSafe();
  
  // Get tracked events using the existing hook with initial data
  const { data: trackedEvents, isLoading: trackedEventsLoading, error: trackedEventsError } = useLightweightTrackedEvents(initialTrackedEvents);
  
  // Get event types with server data as initial data
  const { data: eventTypes, isLoading: eventTypesLoading, error: eventTypesError } = useQuery({
    queryKey: ['eventTypes'],
    queryFn: () => EventTypeService.getEventTypes(supabase!),
    enabled: !!supabase && isReady,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: initialEventTypes,
  });

  // Get upcoming events with server data as initial data
  const { data: allUpcomingEvents, isLoading: upcomingEventsLoading, error: upcomingEventsError } = useQuery({
    queryKey: ['allUpcomingEvents'],
    queryFn: () => EventService.getEvents({ startDate: new Date() }, supabase!, 1, 100),
    enabled: !!supabase && isReady,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 2 * 60 * 1000, // 2 minutes (events change more frequently)
    initialData: initialUpcomingEvents,
  });

  return {
    trackedEvents: trackedEvents || [],
    eventTypes: eventTypes || [],
    allUpcomingEvents: allUpcomingEvents || [],
    isLoading: trackedEventsLoading || eventTypesLoading || upcomingEventsLoading || !isReady,
    isReady: !!supabase && isReady,
    errors: {
      trackedEvents: trackedEventsError,
      eventTypes: eventTypesError,
      upcomingEvents: upcomingEventsError,
    }
  };
}
