'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserEventService } from '@/services/userEventService';
import type { TrackedEventRecord, EventStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

import { trackEventAction, untrackEventAction } from '@/app/calendar/actions';

type TrackEventVariables = { eventId: string; status: EventStatus; notes?: string };
type UntrackEventVariables = { eventId: string };
type BulkTrackEventsVariables = { eventIds: string[]; status: EventStatus };

type BulkTrackResponse = {
    tracked: number;
    skipped: number;
};

export function useEventTracking() {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const listQueryKey = ['trackedEvents', user?.id];

    const { mutate: trackEvent, isPending: isTracking } = useMutation({
        mutationFn: async (variables: TrackEventVariables) => {

            const formData = new FormData();
            formData.append('eventId', variables.eventId);
            formData.append('status', variables.status);
            if (variables.notes) {
                formData.append('notes', variables.notes);
            }

            const result = await trackEventAction(formData);

            if (!result.success) {
                throw new Error(result.error || 'Failed to track event.');
            }
            return result;
        },
        onSuccess: (_, variables) => {
            const statusText = variables.status === 'bookmarked' ? 'bookmarked' :
                variables.status === 'attending' ? 'marked as attending' :
                    variables.status === 'attended' ? 'marked as attended' : 'tracked';
            toast.success(`Event ${statusText}!`);

            queryClient.invalidateQueries({ queryKey: listQueryKey });
            // --- FIX START ---
            // Invalidate the query used by the main calendar view to update the UI
            queryClient.invalidateQueries({ queryKey: ['allTrackedEventIds', user?.id] });
            // --- FIX END ---
            queryClient.invalidateQueries({
                queryKey: ['eventTrackingStatus', variables.eventId, user?.id]
            });
        },
        onError: (err) => {
            console.error('Track event error:', err);
            toast.error(err.message || 'Failed to track event');
        },
    });

    const { mutate: untrackEvent, isPending: isUntracking } = useMutation({
        mutationFn: async (variables: UntrackEventVariables) => {

            const formData = new FormData();
            formData.append('eventId', variables.eventId);

            const result = await untrackEventAction(formData);

            if (!result.success) {
                throw new Error(result.error || 'Failed to untrack event.');
            }
            return result;
        },
        onSuccess: (_, variables) => {
            toast.success('Event untracked.');

            queryClient.invalidateQueries({ queryKey: listQueryKey });
            // --- FIX START ---
            // Also invalidate the query for the main calendar view upon untracking
            queryClient.invalidateQueries({ queryKey: ['allTrackedEventIds', user?.id] });
            // --- FIX END ---
            queryClient.invalidateQueries({
                queryKey: ['eventTrackingStatus', variables.eventId, user?.id]
            });
        },
        onError: (err) => {
            console.error('Untrack event error:', err);
            toast.error(err.message || 'Failed to untrack event');
        },
    });

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

export function useTrackedEvents() {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();


    return useQuery<TrackedEventRecord[]>({
        queryKey: ['trackedEvents', user?.id],
        queryFn: async () => {
            if (!user) return [];

            return UserEventService.getTrackedEvents(user.id, supabase);
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
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
                return { isTracked: false };
            }
        },
        enabled: !!user && !!eventId,
        staleTime: 2 * 60 * 1000,
        retry: 1,
    });
}