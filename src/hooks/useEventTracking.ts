// src/hooks/useEventTracking.ts (Corrected)

'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export type EventStatus = 'bookmarked' | 'attending' | 'attended' | 'cancelled';

interface TrackingResult {
    success: boolean;
    error?: string;
    message?: string;
}

interface TrackedEvent {
    id: string;
    event_id: string;
    status: EventStatus;
    created_at: string;
    notes?: string;
    events: {
        id: string;
        title: string;
        start_time: string;
        end_time: string | null;
        organizer: string;
        event_type_id: string;
    } | null;
}

export function useEventTracking() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Track an event
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
            // Check if already tracked
            const { data: existing } = await supabase
                .from('user_events')
                .select('id, status')
                .eq('user_id', user.id)
                .eq('event_id', eventId)
                .single();

            if (existing) {
                // Update existing tracking
                const { error } = await supabase
                    .from('user_events')
                    .update({
                        status,
                        notes,
                        created_at: new Date().toISOString() // Update timestamp
                    })
                    .eq('id', existing.id);

                if (error) throw error;
                return { success: true, message: `Event status updated to ${status}` };
            } else {
                // Create new tracking record
                const { error } = await supabase
                    .from('user_events')
                    .insert({
                        user_id: user.id,
                        event_id: eventId,
                        status,
                        notes,
                        created_at: new Date().toISOString()
                    });

                if (error) throw error;
                return { success: true, message: 'Event tracked successfully!' };
            }
        } catch (error) {
            console.error('Error tracking event:', error);
            return {
                success: false,
                error: (error as Error).message || 'Failed to track event'
            };
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Untrack an event
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
            return {
                success: false,
                error: (error as Error).message || 'Failed to untrack event'
            };
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Get user's tracked events
    const getTrackedEvents = useCallback(async (): Promise<TrackedEvent[]> => {
        if (!user) return [];

        try {
            const { data, error } = await supabase
                .from('user_events')
                .select(`
          id,
          event_id,
          status,
          created_at,
          notes,
          events (
            id,
            title,
            start_time,
            end_time,
            organizer,
            event_type_id
          )
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map((item: any) => ({
                id: item.id,
                event_id: item.event_id,
                status: item.status as EventStatus,
                created_at: item.created_at,
                notes: item.notes,
                events: item.events ? {
                    id: item.events.id,
                    title: item.events.title,
                    start_time: item.events.start_time,
                    end_time: item.events.end_time,
                    organizer: item.events.organizer,
                    event_type_id: item.events.event_type_id
                } : null
            }));
        } catch (error) {
            console.error('Error fetching tracked events:', error);
            return [];
        }
    }, [user]);

    // Check if event is tracked
    const isEventTracked = useCallback(async (eventId: string): Promise<{
        isTracked: boolean;
        status?: EventStatus;
    }> => {
        if (!user) return { isTracked: false };

        try {
            const { data, error } = await supabase
                .from('user_events')
                .select('status')
                .eq('user_id', user.id)
                .eq('event_id', eventId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return {
                isTracked: !!data,
                status: data?.status as EventStatus
            };
        } catch (error) {
            console.error('Error checking event tracking status:', error);
            return { isTracked: false };
        }
    }, [user]);

    // Bulk track events
    const bulkTrackEvents = useCallback(async (
        eventIds: string[],
        status: EventStatus = 'bookmarked'
    ): Promise<TrackingResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        setLoading(true);
        try {
            // Check which events are already tracked
            const { data: existing } = await supabase
                .from('user_events')
                .select('event_id')
                .eq('user_id', user.id)
                .in('event_id', eventIds);

            const existingEventIds = new Set(existing?.map(e => e.event_id) || []);
            const newEventIds = eventIds.filter(id => !existingEventIds.has(id));

            if (newEventIds.length === 0) {
                return { success: true, message: 'All events are already tracked' };
            }

            // Insert new tracking records
            const insertData = newEventIds.map(eventId => ({
                user_id: user.id,
                event_id: eventId,
                status,
                created_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('user_events')
                .insert(insertData);

            if (error) throw error;

            return {
                success: true,
                message: `Successfully tracked ${newEventIds.length} events!`
            };
        } catch (error) {
            console.error('Error bulk tracking events:', error);
            return {
                success: false,
                error: (error as Error).message || 'Failed to track events'
            };
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