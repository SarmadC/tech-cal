// src/hooks/useEventTracking.ts
'use client';
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserEventService } from '@/services/userEventService';
import type { AppTrackedEvent as TrackedEvent, EventStatus } from '@/types';
interface TrackingResult {
    success: boolean;
    error?: string;
    message?: string;
}

/**
 * A hook for managing all user-event tracking interactions.
 * It acts as a thin wrapper around the UserEventService.
 */
export function useEventTracking() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // The implementation of all these functions remains the same.
    const trackEvent = useCallback(async (
        eventId: string,
        status: EventStatus = 'bookmarked',
        notes?: string
    ): Promise<TrackingResult> => {
        if (!user) return { success: false, error: 'User not authenticated' };

        setLoading(true);
        const response = await UserEventService.trackEvent(user.id, eventId, status, notes);
        setLoading(false);

        return response;
    }, [user]);

    const untrackEvent = useCallback(async (eventId: string): Promise<TrackingResult> => {
        if (!user) return { success: false, error: 'User not authenticated' };

        setLoading(true);
        const response = await UserEventService.untrackEvent(user.id, eventId);
        setLoading(false);

        return response;
    }, [user]);

    // FIX: The return type `Promise<TrackedEvent[]>` now works correctly because
    // `TrackedEvent` is a known alias for `AppTrackedEvent`.
    const getTrackedEvents = useCallback(async (): Promise<TrackedEvent[]> => {
        if (!user) return [];

        setLoading(true);
        const response = await UserEventService.getTrackedEvents(user.id);
        setLoading(false);

        if (response.success && response.data) {
            return response.data;
        }

        if (!response.success) {
            console.error("Failed to get tracked events:", response.error);
        }

        return [];
    }, [user]);

    const isEventTracked = useCallback(async (eventId: string): Promise<{
        isTracked: boolean;
        status?: EventStatus;
    }> => {
        if (!user) return { isTracked: false };

        const response = await UserEventService.isEventTracked(user.id, eventId);

        if (response.success && response.data) {
            return response.data;
        }

        return { isTracked: false };
    }, [user]);

    const bulkTrackEvents = useCallback(async (
        eventIds: string[],
        status: EventStatus = 'bookmarked'
    ): Promise<TrackingResult> => {
        if (!user) return { success: false, error: 'User not authenticated' };

        setLoading(true);
        const response = await UserEventService.bulkTrackEvents(user.id, eventIds, status);
        setLoading(false);

        return {
            success: response.success,
            message: response.message,
            error: response.error
        };
    }, [user]);

    return {
        trackEvent,
        untrackEvent,
        getTrackedEvents,
        isEventTracked,
        bulkTrackEvents,
        loading,
    };
}