'use client';

import { useQuery } from '@tanstack/react-query';
import { EventService } from '@/services/eventServices';
import { EventTypeService } from '@/services/eventTypeService';
import { HackathonService } from '@/services/hackathonService';
import { UserEventService } from '@/services/userEventService';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import type { EventType, Event, TrackedEventRecord } from '@/types';
import type { HackathonEvent } from '@/types/hackathon';

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
  const { user } = useAuth();
  
  // Load full tracked event details so dashboard analytics can score attended events accurately.
  const { data: trackedEvents, isLoading: trackedEventsLoading, error: trackedEventsError } = useQuery({
    queryKey: ['dashboardTrackedEvents', user?.id],
    queryFn: () => UserEventService.getTrackedEvents(user!.id, supabase!),
    enabled: !!user?.id && !!supabase && isReady,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 2 * 60 * 1000,
    initialData: initialTrackedEvents,
  });
  
  // Get event types with server data as initial data
  const { data: eventTypes, isLoading: eventTypesLoading, error: eventTypesError } = useQuery({
    queryKey: ['eventTypes'],
    queryFn: () => EventTypeService.getEventTypes(supabase!),
    enabled: !!supabase && isReady,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Event types change rarely; keep them fresh for longer to avoid extra requests
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours cache retention
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

  // Get hackathon events with user participation data
  const { data: hackathons, isLoading: hackathonsLoading, error: hackathonsError } = useQuery({
    queryKey: ['hackathonEvents', user?.id],
    queryFn: () => HackathonService.getHackathonEvents(supabase!, user?.id),
    enabled: !!supabase && isReady,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes (hackathons don't change as frequently)
  });

  return {
    trackedEvents: trackedEvents || [],
    eventTypes: eventTypes || [],
    allUpcomingEvents: allUpcomingEvents || [],
    hackathons: (hackathons || []) as HackathonEvent[],
    isLoading: trackedEventsLoading || eventTypesLoading || upcomingEventsLoading || !isReady,
    hackathonsLoading,
    isReady: !!supabase && isReady,
    errors: {
      trackedEvents: trackedEventsError,
      eventTypes: eventTypesError,
      upcomingEvents: upcomingEventsError,
      hackathons: hackathonsError,
    }
  };
}
