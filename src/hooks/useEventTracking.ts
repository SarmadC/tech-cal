// src/hooks/useEventTracking.ts
'use-client';

import { useAuth } from '@/contexts/AuthContext';
import { UserEventService } from '@/services/userEventService';
import type { AppTrackedEvent, EventStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// --- Type Definitions ---
type TrackEventVariables = { eventId: string; status: EventStatus; notes?: string };
type UntrackEventVariables = { eventId: string };
type BulkTrackEventsVariables = { eventIds: string[]; status?: EventStatus };

// --- Main Hook for Write Operations (Mutations) ---
export function useEventTracking() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const listQueryKey = ['trackedEvents', user?.id];

    // --- MUTATION: Track a single event ---
    const { mutate: trackEvent, isPending: isTracking } = useMutation({
        mutationFn: (variables: TrackEventVariables) => {
            if (!user) throw new Error('User not authenticated.');
            return UserEventService.trackEvent(user.id, variables.eventId, variables.status, variables.notes);
        },
        onSuccess: (_, variables) => {
            // After success, invalidate both the main list AND the specific event's status query.
            // This ensures all parts of the UI that depend on this data will refetch and update.
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId, user?.id] });
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to track event.');
        },
    });

    // --- MUTATION: Untrack a single event ---
    const { mutate: untrackEvent, isPending: isUntracking } = useMutation({
        mutationFn: (variables: UntrackEventVariables) => {
            if (!user) throw new Error('User not authenticated.');
            return UserEventService.untrackEvent(user.id, variables.eventId);
        },
        onSuccess: (_, variables) => {
            // Invalidate both queries on untrack as well.
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId, user?.id] });
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to untrack event.');
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
                queryClient.invalidateQueries({ queryKey: listQueryKey });
                toast.success(`Successfully tracked ${response.data.tracked} new events!`);
            } else {
                toast.info('All selected events were already tracked.');
            }
        },
        onError: (error) => {
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
export function useTrackedEvents() {
    const { user } = useAuth();

    return useQuery<AppTrackedEvent[]>({
        queryKey: ['trackedEvents', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const response = await UserEventService.getTrackedEvents(user.id);
            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to fetch tracked events');
            }
            return response.data;
        },
        enabled: !!user,
    });
}

// --- Hook for Reading a Single Event's Tracking Status ---
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