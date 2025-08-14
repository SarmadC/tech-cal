// src/hooks/useEventTracking.ts
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserEventService } from '@/services/userEventService';
import type { AppTrackedEvent, EventStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

// Input types for the mutation hooks
type TrackEventVariables = { eventId: string; status: EventStatus; notes?: string };
type UntrackEventVariables = { eventId: string };
type BulkTrackEventsVariables = { eventIds: string[]; status: EventStatus };

// Return type for the bulk track mutation
type BulkTrackResponse = {
    tracked: number;
    skipped: number;
};

export function useEventTracking() {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const listQueryKey = ['trackedEvents', user?.id];

    // trackEvent mutation using your existing UserEventService
    const { mutate: trackEvent, isPending: isTracking } = useMutation({
        mutationFn: async (variables: TrackEventVariables) => {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }

            // Use your existing service method directly
            await UserEventService.trackEvent(
                user.id,
                variables.eventId,
                variables.status,
                variables.notes,
                supabase
            );

            return { success: true };
        },
        onSuccess: (_, variables) => {
            toast.success(`Event ${variables.status}!`);
            // Invalidate queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            queryClient.invalidateQueries({
                queryKey: ['eventTrackingStatus', variables.eventId, user?.id]
            });
        },
        onError: (err) => {
            console.error('Track event error:', err);
            toast.error(err.message || 'Failed to track event');
        },
    });

    // untrackEvent mutation using your existing UserEventService
    const { mutate: untrackEvent, isPending: isUntracking } = useMutation({
        mutationFn: async (variables: UntrackEventVariables) => {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }

            // Use your existing service method directly
            await UserEventService.untrackEvent(
                user.id,
                variables.eventId,
                supabase
            );

            return { success: true };
        },
        onSuccess: (_, variables) => {
            toast.success('Event untracked.');
            // Invalidate queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            queryClient.invalidateQueries({
                queryKey: ['eventTrackingStatus', variables.eventId, user?.id]
            });
        },
        onError: (err) => {
            console.error('Untrack event error:', err);
            toast.error(err.message || 'Failed to untrack event');
        },
    });

    // bulkTrackEvents mutation using your existing service
    const { mutate: bulkTrackEvents, isPending: isBulkTracking } = useMutation({
        mutationFn: (variables: BulkTrackEventsVariables): Promise<BulkTrackResponse> => {
            if (!user) throw new Error('User not authenticated.');
            return UserEventService.bulkTrackEvents(
                user.id,
                variables.eventIds,
                variables.status,
                supabase
            );
        },
        onSuccess: (response: BulkTrackResponse) => {
            if (response.tracked > 0) {
                queryClient.invalidateQueries({ queryKey: listQueryKey });
                toast.success(`Successfully tracked ${response.tracked} new events!`);
            } else if (response.tracked === 0 && response.skipped > 0) {
                toast.info('All selected events were already tracked.');
            }
        },
        onError: (error) => {
            console.error('Bulk track error:', error);
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

// READ hooks - these should work fine as they use your existing services
export function useTrackedEvents() {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();

    return useQuery<AppTrackedEvent[]>({
        queryKey: ['trackedEvents', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return UserEventService.getTrackedEvents(user.id, supabase);
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
    });
}

export function useEventTrackingStatus(eventId: string | undefined) {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();

    return useQuery({
        queryKey: ['eventTrackingStatus', eventId, user?.id],
        queryFn: async () => {
            if (!user || !eventId) return { isTracked: false };

            try {
                return await UserEventService.isEventTracked(user.id, eventId, supabase);
            } catch (error) {
                console.error('Error checking tracking status:', error);
                // Return default state instead of throwing
                return { isTracked: false };
            }
        },
        enabled: !!user && !!eventId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        retry: 1,
    });
}