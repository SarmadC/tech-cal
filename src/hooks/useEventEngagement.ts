'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePostHog } from 'posthog-js/react';
import { useAuth } from '@/contexts';
import { UserEventService } from '@/services/userEventService';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { TrackedEventRecord, EventStatus } from '@/types';
import { ANALYTICS_CONFIG } from '@/config/analyticsConfig';
import { extractAlgorithmContext } from '@/utils/analyticsUtils';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useSubscriptionContext } from '@/contexts';

/**
 * Event Engagement Hook - Decoupled bookmark and attendance management
 * 
 * Returns:
 * - trackedEvents: Full TrackedEventRecord[] with event details (includes isBookmarked and status)
 * - bookmarkedEventIds: Set of bookmarked event IDs for O(1) lookup
 * - attendanceStatusMap: Map of eventId -> attendance status
 * - isBookmarked(eventId): Helper to check if event is bookmarked
 * - getAttendanceStatus(eventId): Helper to get attendance status
 * - getEventEngagement(eventId): Helper to get both bookmark and attendance in one call
 * - toggleBookmark(eventId): Toggle bookmark status (independent of attendance)
 * - setAttendanceStatus(eventId, status): Set attendance status (auto-bookmarks if attending/attended)
 * - isLoading, error, refetch
 */
export function useEventEngagement() {
  const { supabase, isReady } = useSupabaseSafe();
  const { user } = useAuth();
  const {
    isPro,
    isTrialing,
    bookmarkLimit,
    openUpgrade,
  } = useSubscriptionContext();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const posthog = usePostHog();

  // AbortController ref for calendar sync requests - prevents state updates on unmounted components
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

  // Single source of truth for tracked events (includes is_bookmarked and status)
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

  // Derived data structures for efficient lookups
  const bookmarkedEventIds = useMemo(() => {
    return new Set(trackedEvents.filter(te => te.isBookmarked).map(te => te.eventId));
  }, [trackedEvents]);

  const bookmarkedCount = useMemo(() => {
    return trackedEvents.filter(te => te.isBookmarked).length;
  }, [trackedEvents]);

  const enforceBookmarkCapacity = async () => {
    if (
      !isPro &&
      !isTrialing &&
      Number.isFinite(bookmarkLimit) &&
      bookmarkedCount >= bookmarkLimit
    ) {
      showError(`You've reached the free bookmark limit (${bookmarkLimit}). Upgrade to add more.`);
      try {
        await openUpgrade();
      } catch (err) {
        console.error('Failed to open upgrade checkout', err);
      }
      throw new Error('BOOKMARK_LIMIT_REACHED');
    }
  };

  const attendanceStatusMap = useMemo(() => {
    const map = new Map<string, EventStatus | null>();
    trackedEvents.forEach(te => {
      map.set(te.eventId, te.status);
    });
    return map;
  }, [trackedEvents]);

  // Helper functions for lookups
  const isBookmarked = (eventId: string): boolean => {
    return bookmarkedEventIds.has(eventId);
  };

  const getAttendanceStatus = (eventId: string): EventStatus | null => {
    return attendanceStatusMap.get(eventId) ?? null;
  };

  const getEventEngagement = (eventId: string): { isBookmarked: boolean; attendanceStatus: EventStatus | null } => {
    return {
      isBookmarked: isBookmarked(eventId),
      attendanceStatus: getAttendanceStatus(eventId)
    };
  };

  // Return early if Supabase client is not ready
  if (!isReady || !supabase) {
    return {
      trackedEvents: [],
      bookmarkedEventIds: new Set<string>(),
      attendanceStatusMap: new Map<string, EventStatus | null>(),
      isBookmarked: () => false,
      getAttendanceStatus: () => null,
      getEventEngagement: () => ({ isBookmarked: false, attendanceStatus: null }),
      toggleBookmark: async () => {},
      setAttendanceStatus: async () => {},
      isLoading: true,
      error: null,
      refetch: async () => {}
    };
  }

  // Toggle bookmark (independent of attendance)
  const toggleBookmark = async (eventId: string, event?: Record<string, unknown>) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    const currentIsBookmarked = isBookmarked(eventId);

    // Enforce free-tier bookmark limit before any writes
    if (
      !currentIsBookmarked
    ) {
      await enforceBookmarkCapacity();
    }
    
    // Optimistic update
    queryClient.setQueryData<TrackedEventRecord[]>(['trackedEvents', user.id], (old = []) => {
      const existing = old.find(te => te.eventId === eventId);
      if (existing) {
        return old.map(te => 
          te.eventId === eventId 
            ? { ...te, isBookmarked: !currentIsBookmarked, bookmarkedAt: !currentIsBookmarked ? new Date().toISOString() : null }
            : te
        );
      } else if (!currentIsBookmarked) {
        // New bookmark - add to list
        return [...old, {
          trackingId: '',
          userId: user.id,
          eventId,
          isBookmarked: true,
          bookmarkedAt: new Date().toISOString(),
          status: null,
          notes: null,
          trackedAt: new Date().toISOString(),
          event: null
        }];
      }
      return old;
    });
    
    try {
      const result = await UserEventService.toggleBookmark(user.id, eventId, !currentIsBookmarked, supabase);
      
      showSuccess(result.isBookmarked ? 'Event bookmarked' : 'Event unbookmarked');

      posthog?.capture(result.isBookmarked ? 'event_bookmarked' : 'event_unbookmarked', {
        event_id: eventId,
        event_title: (event as Record<string, unknown>)?.title,
        event_type: (event as Record<string, unknown>)?.eventType,
      });

      // Log analytics
      if (result.isBookmarked) {
        try {
          const { algorithmVersion } = event ? extractAlgorithmContext(event) : { algorithmVersion: ANALYTICS_CONFIG.CURRENT_ALGORITHM_VERSION };
          console.log('Career impact metric would be logged:', {
            userId: user.id,
            eventId,
            metricType: 'bookmark',
            algorithmVersion
          });
        } catch (err) {
          console.warn('Failed to log bookmark metric:', err);
        }
      }
      
      // Trigger calendar sync based on bookmark state
      // Cancel any previous calendar sync request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      if (result.isBookmarked) {
        // Bookmark ON: sync to calendar
        fetch('/api/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ eventId, action: 'sync' }),
          signal
        })
          .then(async (res) => {
            if (signal.aborted) return;
            if (res.status === 202) {
              console.log('Calendar sync queued for bookmark');
            } else if (!res.ok) {
              const data = await res.json();
              if (data.requiresReauth) {
                showError('Please reconnect your calendar in settings');
              } else if (res.status !== 404) {
                console.warn('Calendar sync failed:', data.error);
              }
            }
          })
          .catch((err) => {
            if (err.name === 'AbortError') return; // Ignore abort errors
            console.error('Calendar sync request failed:', err);
          });
      } else {
        // Bookmark OFF: Check if still attending - if so, keep calendar event
        const currentStatus = getAttendanceStatus(eventId);
        if (currentStatus && (currentStatus === 'attending' || currentStatus === 'attended')) {
          // Keep calendar event - user is still attending
          console.log('Calendar event remains because user is marked as attending');
        } else {
          // Remove from calendar
          // API will look up external_calendar_event_id and external_provider server-side if not provided
          fetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              eventId,
              action: 'delete'
              // external_calendar_event_id and external_provider will be looked up by API if not provided
            }),
            signal
          })
            .then(async (res) => {
              if (signal.aborted) return;
              if (res.ok || res.status === 200) {
                console.log('Calendar unsync successful');
              } else if (res.status !== 404) {
                const data = await res.json().catch(() => ({}));
                console.warn('Calendar unsync failed:', data.error || 'Unknown error');
              }
            })
            .catch((err) => {
              if (err.name === 'AbortError') return; // Ignore abort errors
              console.error('Calendar unsync request failed:', err);
            });
        }
      }
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['trackedEvents', user.id] });
    } catch (error) {
      // Rollback optimistic update
      await queryClient.invalidateQueries({ queryKey: ['trackedEvents', user.id] });
      showError('Failed to toggle bookmark');
      throw error;
    }
  };

  // Set attendance status
  const setAttendanceStatus = async (
    eventId: string,
    status: EventStatus | null,
    notes?: string,
    _event?: Record<string, unknown>
  ) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    if ((status === 'attending' || status === 'attended') && !isBookmarked(eventId)) {
      await enforceBookmarkCapacity();
    }

    const _previousStatus = getAttendanceStatus(eventId);
    
    // Optimistic update
    queryClient.setQueryData<TrackedEventRecord[]>(['trackedEvents', user.id], (old = []) => {
      const existing = old.find(te => te.eventId === eventId);
      if (existing) {
        // Update existing - DECOUPLED: no longer toggling isBookmarked
        return old.map(te => 
          te.eventId === eventId 
            ? { 
                ...te, 
                status,
                notes: notes ?? te.notes
              }
            : te
        );
      } else if (status === 'attending' || status === 'attended') {
        // New attendance - DECOUPLED: starting with isBookmarked = false
        return [...old, {
          trackingId: '',
          userId: user.id,
          eventId,
          isBookmarked: false,
          bookmarkedAt: null,
          status,
          notes: notes ?? null,
          trackedAt: new Date().toISOString(),
          event: null
        }];
      }
      return old;
    });
    
    try {
      const result = await UserEventService.setAttendanceStatus(user.id, eventId, status, notes, supabase);
      
      showSuccess('Attendance status updated');

      posthog?.capture('event_attendance_updated', {
        event_id: eventId,
        status,
      });

      // Log analytics
      try {
        console.log('Attendance status changed:', {
          userId: user.id,
          eventId,
          previousStatus: result.previousStatus,
          newStatus: result.newStatus,
          autoBookmarked: result.autoBookmarked
        });
      } catch (err) {
        console.warn('Failed to log attendance change:', err);
      }
      
      // Calendar sync: only update if event already exists (from bookmark)
      // Auto-bookmark in RPC will trigger sync creation if needed
      if (status && (status === 'attending' || status === 'attended')) {
        // Cancel any previous calendar sync request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        fetch('/api/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ eventId, action: 'sync' }),
          signal
        })
          .then(async (res) => {
            if (signal.aborted) return;
            if (res.status === 202) {
              console.log('Calendar sync queued for attendance');
            } else if (!res.ok && res.status !== 404) {
              console.warn('Calendar sync failed for attendance update');
            }
          })
          .catch((err) => {
            if (err.name === 'AbortError') return; // Ignore abort errors
            console.error('Calendar sync request failed:', err);
          });
      }
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['trackedEvents', user.id] });
    } catch (error) {
      // Rollback optimistic update
      await queryClient.invalidateQueries({ queryKey: ['trackedEvents', user.id] });
      if (error instanceof Error && error.message === 'BOOKMARK_LIMIT_REACHED') {
        throw error;
      }
      showError('Failed to update attendance status');
      throw error;
    }
  };

  return {
    trackedEvents,
    bookmarkedEventIds,
    attendanceStatusMap,
    isBookmarked,
    getAttendanceStatus,
    getEventEngagement,
    toggleBookmark,
    setAttendanceStatus,
    isLoading,
    error,
    refetch
  };
}
