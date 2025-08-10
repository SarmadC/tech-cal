'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserEventService } from '@/services/userEventService';
import type { AppTrackedEvent, EventStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createClient } from '@/utils/supabase/client';

type TrackEventVariables = { eventId: string; status: EventStatus; notes?: string };
type UntrackEventVariables = { eventId: string };
type BulkTrackEventsVariables = { eventIds: string[]; status: EventStatus };

export function useEventTracking() {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const listQueryKey = ['trackedEvents', user?.id];

    const { mutate: trackEvent, isPending: isTracking } = useMutation({
        mutationFn: (variables: TrackEventVariables) => {
            if (!user) throw new Error('User not authenticated.');
            return UserEventService.trackEvent(
                user.id,
                variables.eventId,
                variables.status,
                variables.notes,
                supabase
            );
        },
        onSuccess: (_, variables) => {
            // Invalidate queries to refetch data after a successful mutation
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId, user?.id] });
            toast.success('Event status updated!');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to track event.');
        },
    });

    const { mutate: untrackEvent, isPending: isUntracking } = useMutation({
        mutationFn: (variables: UntrackEventVariables) => {
            if (!user) throw new Error('User not authenticated.');
            return UserEventService.untrackEvent(user.id, variables.eventId, supabase);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId, user?.id] });
            toast.success('Event untracked.');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to untrack event.');
        },
    });

    const { mutate: bulkTrackEvents, isPending: isBulkTracking } = useMutation({
        mutationFn: (variables: BulkTrackEventsVariables) => {
            if (!user) throw new Error('User not authenticated.');
            return UserEventService.bulkTrackEvents(user.id, variables.eventIds, variables.status, supabase);
        },
        // --- CHANGED onSuccess block ---
        onSuccess: (response) => { // `response` is now the `{ tracked, skipped }` object
            if (response && response.tracked > 0) {
                queryClient.invalidateQueries({ queryKey: listQueryKey });
                toast.success(`Successfully tracked ${response.tracked} new events!`);
            } else if (response?.tracked === 0) {
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

export function useTrackedEvents() {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();

    return useQuery<AppTrackedEvent[]>({
        queryKey: ['trackedEvents', user?.id],
        // --- CHANGED queryFn ---
        queryFn: () => {
            if (!user) return [];
            // Service now returns data directly or throws an error.
            return UserEventService.getTrackedEvents(user.id, supabase);
        },
        enabled: !!user,
    });
}

export function useEventTrackingStatus(eventId: string | undefined) {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();

    return useQuery({
        queryKey: ['eventTrackingStatus', eventId, user?.id],
        // --- CHANGED queryFn ---
        queryFn: () => {
            if (!user || !eventId) return { isTracked: false };
            // Service now returns data directly or throws an error.
            return UserEventService.isEventTracked(user.id, eventId, supabase);
        },
        enabled: !!user && !!eventId,
    });
}