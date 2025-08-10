// src/hooks/useEventTracking.ts
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserEventService } from '@/services/userEventService';
import type { AppTrackedEvent, EventStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

import { trackEventAction, untrackEventAction } from '@/app/calendar/actions';

// Input types for the mutation hooks
type TrackEventVariables = { eventId: string; status: EventStatus; notes?: string };
type UntrackEventVariables = { eventId: string };
type BulkTrackEventsVariables = { eventIds: string[]; status: EventStatus };

// ✅ DEFINE the return type for the bulk track mutation
type BulkTrackResponse = {
    tracked: number;
    skipped: number;
};

export function useEventTracking() {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const listQueryKey = ['trackedEvents', user?.id];

    // trackEvent mutation using the Server Action
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
            toast.success(`Event ${variables.status}!`);
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus', variables.eventId, user?.id] });
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    // untrackEvent mutation using the Server Action
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
        onSuccess: () => {
            toast.success('Event untracked.');
            queryClient.invalidateQueries({ queryKey: listQueryKey });
            queryClient.invalidateQueries({ queryKey: ['eventTrackingStatus'] });
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    // bulkTrackEvents mutation (still client-side for now)
    const { mutate: bulkTrackEvents, isPending: isBulkTracking } = useMutation({
        // The mutation function now returns our specific type
        mutationFn: (variables: BulkTrackEventsVariables): Promise<BulkTrackResponse> => {
            if (!user) throw new Error('User not authenticated.');
            return UserEventService.bulkTrackEvents(user.id, variables.eventIds, variables.status, supabase);
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

// READ hooks remain unchanged
export function useTrackedEvents() {
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();

    return useQuery<AppTrackedEvent[]>({
        queryKey: ['trackedEvents', user?.id],
        queryFn: async () => {
            if (!user) return [];
            // Assuming getTrackedEvents from service returns AppTrackedEvent[]
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
        queryFn: async () => {
            if (!user || !eventId) return { isTracked: false };
            return UserEventService.isEventTracked(user.id, eventId, supabase);
        },
        enabled: !!user && !!eventId,
    });
}