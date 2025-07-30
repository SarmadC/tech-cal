// src/hooks/useEventTracking.ts
'use-client';

import { useAuth } from '@/contexts/AuthContext';
import { UserEventService } from '@/services/userEventService';
import type { AppTrackedEvent, EventStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// --- Type Definitions (no changes needed) ---
type TrackEventVariables = { eventId: string; status: EventStatus; notes?: string };
type UntrackEventVariables = { eventId: string };
type BulkTrackEventsVariables = { eventIds: string[]; status?: EventStatus };

// --- Main Hook for Write Operations (Mutations) ---
export function useEventTracking() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const queryKey = ['trackedEvents', user?.id]; // Centralize the query key

    // --- MUTATION: Track a single event (NOW WITH OPTIMISTIC UPDATE) ---
    const { mutate: trackEvent, isPending: isTracking } = useMutation({
        mutationFn: (variables: TrackEventVariables) => {
            if (!user) throw new Error('User not authenticated.');
            return UserEventService.trackEvent(user.id, variables.eventId, variables.status, variables.notes);
        },
        // This `onMutate` function runs *before* the mutationFn. This is where the magic happens.
        onMutate: async (newEvent) => {
            // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
            await queryClient.cancelQueries({ queryKey });

            // 2. Snapshot the previous value
            const previousTrackedEvents = queryClient.getQueryData<AppTrackedEvent[]>(queryKey);

            // 3. Optimistically update to the new value
            queryClient.setQueryData<AppTrackedEvent[]>(queryKey, (old) => {
                // Create a placeholder for the new tracked event
                const optimisticEvent: AppTrackedEvent = {
                    trackingId: `optimistic-${Date.now()}`, // Temporary ID
                    userId: user!.id,
                    eventId: newEvent.eventId,
                    status: newEvent.status,
                    notes: newEvent.notes || null,
                    trackedAt: new Date().toISOString(),
                    event: null, // We don't have full event details, but that's okay for the list
                };
                // Add the new event to the list
                return [...(old || []), optimisticEvent];
            });

            // 4. Return a context object with the snapshotted value
            return { previousTrackedEvents };
        },
        // If the mutation fails, use the context returned from onMutate to roll back
        onError: (err, _newEvent, context) => {
            queryClient.setQueryData(queryKey, context?.previousTrackedEvents);
            toast.error(err.message || 'Failed to track event.');
        },
        // Always refetch after error or success to ensure the server state is the source of truth
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // --- MUTATION: Untrack a single event (NOW WITH OPTIMISTIC UPDATE) ---
    const { mutate: untrackEvent, isPending: isUntracking } = useMutation({
        mutationFn: (variables: UntrackEventVariables) => {
            if (!user) throw new Error('User not authenticated.');
            return UserEventService.untrackEvent(user.id, variables.eventId);
        },
        onMutate: async (eventToUntrack) => {
            await queryClient.cancelQueries({ queryKey });
            const previousTrackedEvents = queryClient.getQueryData<AppTrackedEvent[]>(queryKey);

            // Optimistically remove the event from the list
            queryClient.setQueryData<AppTrackedEvent[]>(queryKey, (old) =>
                (old || []).filter(event => event.eventId !== eventToUntrack.eventId)
            );

            return { previousTrackedEvents };
        },
        onError: (err, _eventToUntrack, context) => {
            queryClient.setQueryData(queryKey, context?.previousTrackedEvents);
            toast.error(err.message || 'Failed to untrack event.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

  // --- MUTATION: Bulk track multiple events ---
  const { mutate: bulkTrackEvents, isPending: isBulkTracking } = useMutation({
    mutationFn: (variables: BulkTrackEventsVariables) => {
      if (!user) throw new Error('User not authenticated.');
      return UserEventService.bulkTrackEvents(user.id, variables.eventIds, variables.status);
    },
    onSuccess: (response) => {
      if (response.data && response.data.tracked > 0) {
        queryClient.invalidateQueries({ queryKey: ['trackedEvents', user?.id] });
        // Show a specific success message for bulk actions
        toast.success(`Successfully tracked ${response.data.tracked} new events!`);
      } else {
        // Show an informational message if nothing changed
        toast.info('All selected events were already tracked.');
      }
    },
    onError: (error) => {
      // Show an error notification for bulk actions
      toast.error(error.message || 'Failed to bulk track events.');
    },
  });

  const isLoading = isTracking || isUntracking || isBulkTracking;

  return {
    trackEvent,
    untrackEvent,
    bulkTrackEvents,
    isLoading,
  };
}

// --- Hook for Reading All Tracked Events ---

/**
 * A hook for fetching all events tracked by the current user.
 * Uses TanStack Query's `useQuery` for caching, background refetching, and more.
 */
export function useTrackedEvents() {
  const { user } = useAuth();

  return useQuery<AppTrackedEvent[]>({
    queryKey: ['trackedEvents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await UserEventService.getTrackedEvents(user.id);
      if (!response.success || !response.data) {
        // Errors from queries are automatically caught by TanStack Query
        throw new Error(response.error || 'Failed to fetch tracked events');
      }
      return response.data;
    },
    enabled: !!user,
  });
}

// --- Hook for Reading a Single Event's Tracking Status ---

/**
 * A hook for checking if a *specific* event is tracked by the user.
 * Ideal for use in an event card or event detail panel.
 * @param eventId The ID of the event to check.
 */
export function useEventTrackingStatus(eventId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['eventTrackingStatus', eventId, user?.id],
    queryFn: async () => {
      if (!user || !eventId) return { isTracked: false };
      const response = await UserEventService.isEventTracked(user.id, eventId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to check event status');
      }
      return response.data;
    },
    enabled: !!user && !!eventId,
  });
}