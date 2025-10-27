'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts';
import { UserEventService } from '@/services/userEventService';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { TrackedEventRecord, EVENT_STATUS } from '@/types';
import { ANALYTICS_CONFIG } from '@/config/analyticsConfig';
import { extractAlgorithmContext } from '@/utils/analyticsUtils';
import { useSnackbar } from '@/contexts/SnackbarContext';

/**
 * UNIFIED tracked events management hook
 * This replaces all the duplicate tracked event queries across the app
 * 
 * Returns:
 * - trackedEvents: Full TrackedEventRecord[] with event details
 * - trackedEventIds: Set of tracked event IDs for quick lookup
 * - isLoading: Loading state
 * - error: Error state
 * - trackEvent: Function to track an event
 * - untrackEvent: Function to untrack an event
 * - refetch: Function to manually refetch data
 */
export function useTrackedEventsUnified() {
  const { supabase, isReady } = useSupabaseSafe();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  // Single source of truth for tracked events
  const {
    data: trackedEvents = [],
    isLoading,
    error,
    refetch
  } = useQuery<TrackedEventRecord[]>({
    queryKey: ['trackedEvents', user?.id],
    queryFn: async () => {
      if (!user?.id || !supabase) return [];
      return UserEventService.getTrackedEvents(user.id, supabase);
    },
    enabled: !!user?.id && !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  // Return early if Supabase client is not ready
  if (!isReady || !supabase) {
    return {
      trackedEvents: [],
      isLoading: true,
      error: null,
      trackEvent: async () => {},
      untrackEvent: async () => {},
      updateEventStatus: async () => {},
      isBulkTracking: false
    };
  }

  // Derived data - set of tracked event IDs for O(1) lookup
  const trackedEventIds = new Set(trackedEvents.map(te => te.eventId));

  // Track an event
  const trackEvent = async (
    eventId: string, 
    status: typeof EVENT_STATUS[keyof typeof EVENT_STATUS] = EVENT_STATUS.BOOKMARKED,
    event?: Record<string, unknown> // Optional event object for context extraction
  ) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    // Track in database first
    await UserEventService.trackEvent(user.id, eventId, status, undefined, supabase);
    
    // Show immediate success feedback
    showSuccess('Event tracked');
    
    // Log save metric to career_impact_analytics with context
    try {
      const { algorithmVersion } = event ? extractAlgorithmContext(event) : { algorithmVersion: ANALYTICS_CONFIG.CURRENT_ALGORITHM_VERSION };
      
      // Note: logCareerImpactMetric method not implemented yet
      // For now, we'll just log the metric for debugging
      console.log('Career impact metric would be logged:', {
        userId: user.id,
        eventId,
        metricType: 'save',
        algorithmVersion
      });
    } catch (error) {
      // Don't fail the main operation if analytics fails
      console.warn('Failed to log save metric:', error);
    }
    
    // Invalidate and refetch tracked events
    await queryClient.invalidateQueries({ queryKey: ['trackedEvents', user.id] });
    
    // Fire-and-forget calendar sync (202 Accepted pattern)
    // Don't block UI waiting for sync to complete
    fetch('/api/calendar/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({ eventId, action: 'sync' })
    })
      .then(async (res) => {
        if (res.status === 202) {
          // Accepted - syncing in background
          console.log('Calendar sync queued');
        } else if (!res.ok) {
          const data = await res.json();
          if (data.requiresReauth) {
            showError('Please reconnect your calendar in settings');
          } else if (res.status !== 404) {
            // 404 means no calendar connection, which is fine - don't show error
            console.warn('Calendar sync failed:', data.error);
          }
        }
      })
      .catch((err) => {
        // Silent failure - already tracked successfully
        console.error('Calendar sync request failed:', err);
      });
  };

  // Untrack an event
  const untrackEvent = async (eventId: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    // Untrack in database first and capture external calendar event ID
    const { external_calendar_event_id, external_provider } = await UserEventService.untrackEvent(user.id, eventId, supabase);
    
    // Invalidate and refetch tracked events
    await queryClient.invalidateQueries({ queryKey: ['trackedEvents', user.id] });
    
    // Fire-and-forget calendar unsync (202 Accepted pattern)
    // Only attempt to unsync if there was an external calendar event
    if (external_calendar_event_id && external_provider) {
      fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ 
          eventId, 
          action: 'delete',
          external_calendar_event_id,
          external_provider
        })
      })
        .then(async (res) => {
          if (res.status === 202) {
            // Accepted - unsyncing in background
            console.log('Calendar unsync queued');
          } else if (!res.ok && res.status !== 404) {
            // Log error but don't show to user - event already untracked
            console.warn('Calendar unsync failed');
          }
        })
        .catch((err) => {
          // Silent failure - event already untracked
          console.error('Calendar unsync request failed:', err);
        });
    }
  };

  return {
    trackedEvents,
    trackedEventIds,
    isLoading,
    error,
    trackEvent,
    untrackEvent,
    refetch
  };
}

/**
 * Lightweight hook for just getting tracked event IDs
 * Use this when you only need to check if events are tracked
 */
export function useTrackedEventIds() {
  const { trackedEventIds, isLoading, error } = useTrackedEventsUnified();
  return { trackedEventIds, isLoading, error };
}

/**
 * Hook for getting lightweight tracked events (for dashboard)
 * This maintains backward compatibility
 */
export function useLightweightTrackedEvents(initialData?: TrackedEventRecord[]) {
  const { supabase, isReady } = useSupabaseSafe();
  const { user } = useAuth();

  const queryResult = useQuery<TrackedEventRecord[]>({
    queryKey: ['lightweightTrackedEvents', user?.id],
    queryFn: async () => {
      if (!user?.id || !supabase) return [];
      return UserEventService.getLightweightTrackedEvents(user.id, supabase);
    },
    enabled: !!user?.id && !!supabase,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    initialData: initialData,
  });

  // Return early if Supabase client is not ready
  if (!isReady || !supabase) {
    return {
      data: [],
      isLoading: true,
      error: null,
      refetch: async () => {}
    };
  }

  return queryResult;
}

