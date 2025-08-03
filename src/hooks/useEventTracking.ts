// src/hooks/useEventTracking.ts
'use client'; // Custom hooks that use other hooks like useState must be client components

// 1. IMPORT useState to hold the client instance
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserEventService } from '@/services/userEventService';
import type { AppTrackedEvent, EventStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// 2. IMPORT the client creator
import { createClient } from '@/utils/supabase/client';

// --- Type Definitions ---
type TrackEventVariables = { eventId: string; status: EventStatus; notes?: string };
type UntrackEventVariables = { eventId: string };
// The status for bulk tracking should be required for clarity
type BulkTrackEventsVariables = { eventIds: string[]; status: EventStatus };

// --- Main Hook for Write Operations (Mutations) ---
export function useEventTracking() {
    // 3. CREATE the Supabase client instance
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const listQueryKey = ['trackedEvents', user?.id];

    const { mutate: trackEvent, isPending: isTracking } = useMutation({
        mutationFn: (variables: TrackEventVariables) => {
            if (!user) throw new Error('User not authenticated.');
            // 4. PASS the client instance to the service method
            return UserEventService.trackEvent(
                user.id,
                variables.eventId,
                variables.status,
                variables.notes,
                supabase
            );
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId, user?.id] });
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to track event.');
        },
    });

    const { mutate: untrackEvent, isPending: isUntracking } = useMutation({
        mutationFn: (variables: UntrackEventVariables) => {
            if (!user) throw new Error('User not authenticated.');
            // 4. PASS the client instance to the service method
            return UserEventService.untrackEvent(user.id, variables.eventId, supabase);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId, user?.id] });
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to untrack event.');
        },
    });

    const { mutate: bulkTrackEvents, isPending: isBulkTracking } = useMutation({
        mutationFn: (variables: BulkTrackEventsVariables) => {
            if (!user) throw new Error('User not authenticated.');
            // 4. PASS the client instance to the service method
            return UserEventService.bulkTrackEvents(user.id, variables.eventIds, variables.status, supabase);
        },
        onSuccess: (response) => {
            if (response.data && response.data.tracked > 0) {
                queryClient.invalidateQueries({ queryKey: listQueryKey });
                toast.success(`Successfully tracked ${response.data.tracked} new events!`);
            } else if (response.data?.tracked === 0) {
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
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();

    return useQuery<AppTrackedEvent[]>({
        queryKey: ['trackedEvents', user?.id],
        queryFn: async () => {
            if (!user) return [];
            // 4. PASS the client instance to the service method
            const response = await UserEventService.getTrackedEvents(user.id, supabase);
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
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();

    return useQuery({
        queryKey: ['eventTrackingStatus', eventId, user?.id],
        queryFn: async () => {
            if (!user || !eventId) return { isTracked: false };
            // 4. PASS the client instance to the service method
            const response = await UserEventService.isEventTracked(user.id, eventId, supabase);
            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to check event status');
            }
            return response.data;
        },
        enabled: !!user && !!eventId,
    });
}