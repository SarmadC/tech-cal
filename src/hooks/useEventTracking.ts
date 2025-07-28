// src/hooks/useEventTracking.ts
'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

// --- Type Imports ---
// FIX: Ensure all necessary types are imported from the central types file.
import { AppTrackedEvent, SupabaseTrackedEvent} from '@/types';
import { mapSupabaseEventToAppEvent } from '@/lib/dataMapper';

export type EventStatus = 'bookmarked' | 'attending' | 'attended' | 'cancelled';

interface TrackingResult {
    success: boolean;
    error?: string;
    message?: string;
}

// Re-export our clean AppTrackedEvent type as TrackedEvent for consistent use in components
export type TrackedEvent = AppTrackedEvent;

export function useEventTracking() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const trackEvent = useCallback(async (
        eventId: string,
        status: EventStatus = 'bookmarked',
        notes?: string
    ): Promise<TrackingResult> => {
        // This function's logic is correct and remains unchanged.
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }
        setLoading(true);
        try {
            const { data: existing } = await supabase.from('user_events').select('id, status').eq('user_id', user.id).eq('event_id', eventId).single();
            if (existing) {
                const { error } = await supabase.from('user_events').update({ status, notes, created_at: new Date().toISOString() }).eq('id', existing.id);
                if (error) throw error;
                return { success: true, message: `Event status updated to ${status}` };
            } else {
                const { error } = await supabase.from('user_events').insert({ user_id: user.id, event_id: eventId, status, notes, created_at: new Date().toISOString() });
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

    const untrackEvent = useCallback(async (eventId: string): Promise<TrackingResult> => {
        // This function's logic is correct and remains unchanged.
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('user_events').delete().eq('user_id', user.id).eq('event_id', eventId);
            if (error) throw error;
            return { success: true, message: 'Event untracked successfully!' };
        } catch (error) {
            console.error('Error untracking event:', error);
            return { success: false, error: (error as Error).message || 'Failed to untrack event' };
        } finally {
            setLoading(false);
        }
    }, [user]);

    const getTrackedEvents = useCallback(async (): Promise<TrackedEvent[]> => {
        if (!user) return [];

        try {
            // FIX: Explicitly select all fields needed for SupabaseEvent and SupabaseTrackedEvent
            const { data, error } = await supabase
                .from('user_events')
                .select(`
                    id, user_id, event_id, status, created_at, notes,
                    events (id, created_at, title, description, start_time, end_time, organizer, location, status, source_url, livestream_url, event_type_id)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // This cast is now safe because our select statement and types match.
            const rawData = data as SupabaseTrackedEvent[];

            return (rawData || []).map((item): TrackedEvent => ({
                trackingId: item.id,
                eventId: item.event_id,
                userId: item.user_id,
                status: item.status,
                notes: item.notes,
                trackedAt: item.created_at,
                event: item.events && item.events.length > 0
                    ? mapSupabaseEventToAppEvent(item.events[0])
                    : null,
            }));
        } catch (error) {
            console.error('Error fetching tracked events:', error);
            return [];
        }
    }, [user]);

    const isEventTracked = useCallback(async (eventId: string): Promise<{
        isTracked: boolean;
        status?: EventStatus;
    }> => {
        // This function's logic is correct and remains unchanged.
        if (!user) return { isTracked: false };
        try {
            const { data, error } = await supabase.from('user_events').select('status').eq('user_id', user.id).eq('event_id', eventId).single();
            if (error && error.code !== 'PGRST116') throw error;
            return { isTracked: !!data, status: data?.status as EventStatus };
        } catch (error) {
            console.error('Error checking event tracking status:', error);
            return { isTracked: false };
        }
    }, [user]);

    const bulkTrackEvents = useCallback(async (
        eventIds: string[],
        status: EventStatus = 'bookmarked'
    ): Promise<TrackingResult> => {
        // This function's logic is correct and remains unchanged.
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }
        setLoading(true);
        try {
            const { data: existing } = await supabase.from('user_events').select('event_id').eq('user_id', user.id).in('event_id', eventIds);
            const existingEventIds = new Set(existing?.map(e => e.event_id) || []);
            const newEventIds = eventIds.filter(id => !existingEventIds.has(id));

            if (newEventIds.length === 0) {
                return { success: true, message: 'All events are already tracked' };
            }

            const insertData = newEventIds.map(eventId => ({ user_id: user.id, event_id: eventId, status, created_at: new Date().toISOString() }));
            const { error } = await supabase.from('user_events').insert(insertData);
            if (error) throw error;
            return { success: true, message: `Successfully tracked ${newEventIds.length} events!` };
        } catch (error) {
            console.error('Error bulk tracking events:', error);
            return { success: false, error: (error as Error).message || 'Failed to bulk track events' };
        } finally {
            setLoading(false);
        }
    }, [user]);

    return {
        trackEvent,
        untrackEvent,
        getTrackedEvents,
        isEventTracked,
        bulkTrackEvents,
        loading
    };
}