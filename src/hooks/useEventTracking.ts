// src/hooks/useEventTracking.ts
'use-client';

import { useAuth } from '@/contexts/AuthContext';
import { UserEventService } from '@/services/userEventService';
import type { AppTrackedEvent, EventStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner'; // Import the toast function

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
 * UI refetching with toast notifications.
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
    onSuccess: (result, variables) => {
      // Invalidate queries to trigger an automatic UI refetch.
      queryClient.invalidateQueries({ queryKey: ['trackedEvents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId] });
      
      // Show a success notification
      toast.success(result.message || 'Event tracked!');
    },
    onError: (error) => {
      // Show an error notification
      toast.error(error.message || 'Failed to track event.');
    },
  });

  // --- MUTATION: Untrack a single event ---
  const { mutate: untrackEvent, isPending: isUntracking } = useMutation({
    mutationFn: (variables: UntrackEventVariables) => {
      if (!user) throw new Error('User not authenticated.');
      return UserEventService.untrackEvent(user.id, variables.eventId);
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trackedEvents', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId] });
      
      // Show a success notification
      toast.success(result.message || 'Event untracked.');
    },
    onError: (error) => {
      // Show an error notification
      toast.error(error.message || 'Failed to untrack event.');
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