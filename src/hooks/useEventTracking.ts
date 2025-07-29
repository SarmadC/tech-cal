// src/hooks/useEventTracking.ts
'use-client';

import { useAuth } from '@/contexts/AuthContext';
import { UserEventService } from '@/services/userEventService';
import type { AppTrackedEvent, EventStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// --- Type Definitions for our Mutations ---

type TrackEventVariables = {
  eventId: string;
  status: EventStatus;
  notes?: string;
};

type UntrackEventVariables = {
  eventId: string;
};

type BulkTrackEventsVariables = {
  eventIds: string[];
  status?: EventStatus;
};

// --- Main Hook for Write Operations (Mutations) ---

/**
 * A hook for managing all user-event tracking write operations (create, update, delete).
 * Leverages TanStack Query's `useMutation` for robust server-side updates and automatic
 * UI refetching.
 */
export function useEventTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- MUTATION: Track a single event ---
  const { mutate: trackEvent, isPending: isTracking } = useMutation({
    mutationFn: (variables: TrackEventVariables) => {
      if (!user) throw new Error('User not authenticated.');
      return UserEventService.trackEvent(
        user.id,
        variables.eventId,
        variables.status,
        variables.notes
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to trigger a refetch and update the UI automatically.
      // This ensures the dashboard list and the specific event's status are updated.
      queryClient.invalidateQueries({ queryKey: ['trackedEvents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId] });
      // You would show a success toast here in a real app
      console.log(`Successfully tracked event ${variables.eventId}`);
    },
    onError: (error) => {
      // You would show an error toast here
      console.error('Failed to track event:', error.message);
    },
  });

  // --- MUTATION: Untrack a single event ---
  const { mutate: untrackEvent, isPending: isUntracking } = useMutation({
    mutationFn: (variables: UntrackEventVariables) => {
      if (!user) throw new Error('User not authenticated.');
      return UserEventService.untrackEvent(user.id, variables.eventId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trackedEvents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId] });
      console.log(`Successfully untracked event ${variables.eventId}`);
    },
    onError: (error) => {
      console.error('Failed to untrack event:', error.message);
    },
  });

  // --- MUTATION: Bulk track multiple events ---
  const { mutate: bulkTrackEvents, isPending: isBulkTracking } = useMutation({
    mutationFn: (variables: BulkTrackEventsVariables) => {
      if (!user) throw new Error('User not authenticated.');
      return UserEventService.bulkTrackEvents(user.id, variables.eventIds, variables.status);
    },
    onSuccess: (response) => {
      // Only invalidate if at least one event was newly tracked.
      if (response.data && response.data.tracked > 0) {
        queryClient.invalidateQueries({ queryKey: ['trackedEvents', user?.id] });
      }
      console.log(response.message || 'Bulk track complete.');
    },
    onError: (error) => {
      console.error('Failed to bulk track events:', error.message);
    },
  });

  // Combine loading states for a general purpose "something is happening" indicator.
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
    // A unique key for this data. TanStack Query uses this for caching.
    // The query will automatically re-run if `user.id` changes.
    queryKey: ['trackedEvents', user?.id],
    // The function that fetches the data. It MUST return a promise.
    queryFn: async () => {
      if (!user) return []; // If no user, return empty array
      const response = await UserEventService.getTrackedEvents(user.id);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch tracked events');
      }
      return response.data;
    },
    // This query will only run if `user` is not null.
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