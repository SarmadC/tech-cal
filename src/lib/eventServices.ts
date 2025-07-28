// src/lib/event-service.ts

import { supabase } from './supabaseClient';
import { AppEvent, SupabaseEvent } from '@/types';
import { mapSupabaseEventToAppEvent } from './dataMapper';

/**
 * Fetches recommended events based on a user's top categories, excluding events they already track.
 */
export async function fetchRecommendedOpportunities(
    topCategories: string[],
    trackedEventIds: string[]
): Promise<AppEvent[]> {
    if (topCategories.length === 0) return [];

    let query = supabase
        .from('events')
        .select('*, event_type!inner(name)') // Fetch all event columns
        .in('event_type.name', topCategories)
        .gte('start_time', new Date().toISOString());

    if (trackedEventIds.length > 0) {
        query = query.not('id', 'in', `(${trackedEventIds.join(',')})`);
    }

    const { data, error } = await query.limit(3);

    if (error) {
        console.error('Error fetching upcoming opportunities:', error);
        return [];
    }

    // Map the raw Supabase data to our clean AppEvent type
    return (data as SupabaseEvent[]).map(mapSupabaseEventToAppEvent);
}