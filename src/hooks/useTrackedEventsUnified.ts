'use client';

import { useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts';
import { UserEventService } from '@/services/userEventService';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { EVENT_STATUS, EventStatus } from '@/types';
import { TrackedEventRecord } from '@/types';
import { useEventEngagement } from './useEventEngagement';

/**
 * UNIFIED tracked events management hook (Backward Compatibility Wrapper)
 * 
 * @deprecated This hook wraps useEventEngagement for backward compatibility.
 * Use useEventEngagement directly for new code to access bookmark and attendance separately.
 * 
 * Returns:
 * - trackedEvents: Full TrackedEventRecord[] with event details
 * - trackedEventIds: Set of tracked event IDs for quick lookup (now based on is_bookmarked)
 * - isLoading: Loading state
 * - error: Error state
 * - trackEvent: Function to track an event (deprecated - use toggleBookmark/setAttendanceStatus)
 * - untrackEvent: Function to untrack an event
 * - refetch: Function to manually refetch data
 */
export function useTrackedEventsUnified() {
  const engagement = useEventEngagement();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { supabase, isReady: _isReady } = useSupabaseSafe();

  // AbortController ref for calendar unsync requests - prevents state updates on unmounted components
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Map bookmarkedEventIds to trackedEventIds for backward compatibility
  // Note: "tracked" now means "bookmarked" in the new model
  const trackedEventIds = engagement.bookmarkedEventIds;

  // Legacy trackEvent - wraps new bookmark/attendance logic
  const trackEvent = async (
    eventId: string, 
    status: typeof EVENT_STATUS[keyof typeof EVENT_STATUS] | 'bookmarked', // 'bookmarked' allowed for backward compat
    event?: Record<string, unknown>
  ) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    // Map old status to new behavior:
    // - 'bookmarked' (deprecated) -> toggle bookmark
    // - 'attending'/'attended'/'cancelled' -> set attendance (auto-bookmarks)
    // For backward compatibility, if status is 'bookmarked', just bookmark
    // Otherwise, set attendance which auto-bookmarks
    if (status === 'bookmarked') {
      await engagement.toggleBookmark(eventId, event);
    } else {
      // Old API: setting attendance also tracks (now auto-bookmarks)
      await engagement.setAttendanceStatus(eventId, status as EventStatus, undefined, event);
    }
  };

  // Legacy untrackEvent - unbookmarks if no attendance status
  const untrackEvent = async (eventId: string) => {
    if (!user?.id || !supabase) throw new Error('User not authenticated');
    
    const currentStatus = engagement.getAttendanceStatus(eventId);
    
    // If not attending/attended, just unbookmark
    if (!currentStatus || (currentStatus !== 'attending' && currentStatus !== 'attended')) {
      await engagement.toggleBookmark(eventId);
    } else {
      // If attending/attended, need to remove from calendar but keep bookmark
      // Use the old untrackEvent which handles calendar cleanup
      const { external_calendar_event_id, external_provider } = await UserEventService.untrackEvent(user.id, eventId, supabase);
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['trackedEvents', user.id] });
      
      // Calendar unsync
      if (external_calendar_event_id && external_provider) {
        // Cancel any previous calendar unsync request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        fetch('/api/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            eventId,
            action: 'delete',
            external_calendar_event_id,
            external_provider
          }),
          signal
        })
          .then(async (res) => {
            if (signal.aborted) return;
            if (res.status === 202) {
              console.log('Calendar unsync queued');
            } else if (!res.ok && res.status !== 404) {
              console.warn('Calendar unsync failed');
            }
          })
          .catch((err) => {
            if (err.name === 'AbortError') return; // Ignore abort errors
            console.error('Calendar unsync request failed:', err);
          });
      }
    }
  };

  return {
    trackedEvents: engagement.trackedEvents,
    trackedEventIds,
    isLoading: engagement.isLoading,
    error: engagement.error,
    trackEvent,
    untrackEvent,
    refetch: engagement.refetch
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

