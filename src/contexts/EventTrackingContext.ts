'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

// --- TYPE DEFINITIONS ---

/** The status of a tracked event. */
export type EventStatus = 'bookmarked' | 'attending' | 'attended' | 'cancelled';

/** The result of a tracking operation. */
interface TrackingResult {
    success: boolean;
    error?: string;
    message?: string;
}

/** The main, user-facing event tracking object, combining user data and event details. */
export interface TrackedEvent {
    id: string;
    event_id: string;
    status: EventStatus;
    created_at: string;
    notes?: string;
    // The related event details, which can be null if not found
    events: {
        id: string;
        title: string;
        start_time: string;
        end_time: string | null;
        organizer: string;
        event_type_id: string;
    } | null;
}

/** Type for the raw data returned by the Supabase query in `getTrackedEvents`. */
type SupabaseTrackedEventQuery = {
    id: string;
    event_id: string;
    status: EventStatus;
    created_at: string;
    notes?: string;
    // Supabase returns the related record as an array, even for a to-one relationship
    events: {
        id: string;
        title: string;
        start_time: string;
        end_time: string | null;
        organizer: string;
        event_type_id: string;
    }[] | null;
};

/** Type for the raw data from the Supabase query in `bulkTrackEvents` */
type ExistingTrackedEvent = {
    event_id: string;
}

// --- HOOK IMPLEMENTATION ---

/**
 * A comprehensive hook for managing event tracking for the authenticated user.
 */
export function useEventTracking() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    /**
     * Tracks a single event or updates its status if it is already being tracked.
     */
    const trackEvent = useCallback(async (
        eventId: string,
        status: EventStatus = 'bookmarked',
        notes?: string
    ): Promise<TrackingResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        setLoading(true);
        try {
            const { data: existing } = await supabase
                .from('user_events')
                .select('id, status')
                .eq('user_id', user.id)
                .eq('event_id', eventId)
                .single();

            if (existing) {
                // Event is already tracked, so we update it
                const { error } = await supabase
                    .from('user_events')
                    .update({ status, notes, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
                if (error) throw error;
                return { success: true, message: `Event status updated to ${ status } ` };
            } else {
                // Event is not tracked, so we create a new record
                const { error } = await supabase
                    .from('user_events')
                    .insert({ user_id: user.id, event_id: eventId, status, notes });
                if (error) throw error;
                return { success: true, message: 'Event tracked successfully!' };
            }
        } catch (error) {
            console.error('Error tracking event:', error);
            return { success: false, error: (error as Error).message || 'Failed to track event' };
        } finally {
            setLoading(false);
        }
    }, [user]);

    /**
     * Removes an event from the user's list of tracked events.
     */
    const untrackEvent = useCallback(async (eventId: string): Promise<TrackingResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('user_events')
                .delete()
                .eq('user_id', user.id)
                .eq('event_id', eventId);
            if (error) throw error;
            return { success: true, message: 'Event untracked successfully!' };
        } catch (error) {
            console.error('Error untracking event:', error);
            return { success: false, error: (error as Error).message || 'Failed to untrack event' };
        } finally {
            setLoading(false);
        }
    }, [user]);

    /**
     * Fetches all events being tracked by the current user, along with their details.
     */
    const getTrackedEvents = useCallback(async (): Promise<TrackedEvent[]> => {
        if (!user) return [];

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_events')
                .select(`id, event_id, status, created_at, notes, events(id, title, start_time, end_time, organizer, event_type_id)`)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform the raw Supabase data to match the TrackedEvent interface
            return (data || []).map((item: SupabaseTrackedEventQuery) => ({
                ...item,
                events: item.events && item.events.length > 0 ? item.events[0] : null,
            }));
        } catch (error) {
            console.error('Error fetching tracked events:', error);
            return [];
        } finally {
            setLoading(false);
        }
    }, [user]);

    /**
     * Checks if a single event is tracked by the user and returns its status.
     */
    const isEventTracked = useCallback(async (eventId: string): Promise<{ isTracked: boolean; status?: EventStatus }> => {
        if (!user) return { isTracked: false };

        try {
            const { data, error } = await supabase
                .from('user_events')
                .select('status')
                .eq('user_id', user.id)
                .eq('event_id', eventId)
                .single();

            // 'PGRST116' is Supabase's code for "No rows found", which is expected and not an error here.
            if (error && error.code !== 'PGRST116') throw error;

            return { isTracked: !!data, status: data?.status as EventStatus };
        } catch (error) {
            console.error('Error checking event tracking status:', error);
            return { isTracked: false };
        }
    }, [user]);

    /**
     * Adds multiple events to the user's tracked list in a single, efficient operation.
     */
    const bulkTrackEvents = useCallback(async (
        eventIds: string[],
        status: EventStatus = 'bookmarked'
    ): Promise<TrackingResult> => {
        if (!user || eventIds.length === 0) {
            return { success: false, error: 'User not authenticated or no event IDs provided.' };
        }

        setLoading(true);
        try {
            const { data: existing, error: existingError } = await supabase
                .from('user_events')
                .select('event_id')
                .eq('user_id', user.id)
                .in('event_id', eventIds);
            
            if (existingError) throw existingError;

            // FIX: Use the 'ExistingTrackedEvent' type to prevent the 'no-explicit-any' error.
            const existingEventIds = new Set(existing?.map((e: ExistingTrackedEvent) => e.event_id) || []);
            const newEventIds = eventIds.filter(id => !existingEventIds.has(id));

            if (newEventIds.length === 0) {
                return { success: true, message: 'All selected events are already tracked.' };
            }

            const insertData = newEventIds.map(eventId => ({
                user_id: user.id,
                event_id: eventId,
                status,
            }));

            const { error: insertError } = await supabase.from('user_events').insert(insertData);
            if (insertError) throw insertError;

            return { success: true, message: `Successfully tracked ${ newEventIds.length } new events.` };
        } catch (error) {
            console.error('Error bulk tracking events:', error);
            return { success: false, error: (error as Error).message || 'Failed to bulk track events.' };
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Return all functions and the loading state for components to use
    return {
        loading,
        trackEvent,
        untrackEvent,
        getTrackedEvents,
        isEventTracked,
        bulkTrackEvents,
    };
}
