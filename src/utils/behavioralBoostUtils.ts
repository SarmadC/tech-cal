/**
 * Behavioral Boost Utilities
 * 
 * Utility functions for managing behavioral boost features
 */

import type { Event, SupabaseClientType } from '@/types';

/**
 * Check if behavioral boost feature is enabled
 */
export function isBehavioralBoostEnabled(): boolean {
  try {
    // Check environment variable first
    if (process.env.NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST === 'false') {
      return false;
    }
    
    // Default to enabled in development, disabled in production until fully tested
    if (process.env.NODE_ENV === 'production') {
      return process.env.NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST === 'true';
    }
    
    return true; // Enabled by default in development
  } catch {
    return false; // Safe fallback
  }
}

/**
 * Get user's interacted events for behavioral analysis
 */
export async function getUserInteractedEvents(
  userId: string,
  supabaseClient: SupabaseClientType,
  daysBack: number = 30
): Promise<Event[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const { data, error } = await supabaseClient
      .from('user_events')
      .select(`
        events (
          id,
          title,
          description,
          start_time,
          end_time,
          event_type_id,
          organizer_id,
          attendee_count,
          location,
          difficulty_level,
          event_format,
          created_at,
          source_url,
          livestream_url
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch user interacted events:', error);
      return [];
    }

    return (data || [])
      .map(item => item.events)
      .filter(event => event !== null)
      .map(event => ({
        id: event.id,
        title: event.title || 'Untitled Event',
        description: event.description || '',
        startTime: event.start_time,
        endTime: event.end_time,
        eventTypeId: event.event_type_id || '',
        organizerId: event.organizer_id,
        attendeeCount: event.attendee_count || 0,
        location: event.location || '',
        // Real values only — fabricated defaults here previously made
        // behavioral similarity compare constants instead of event data.
        difficulty: (event.difficulty_level as Event['difficulty']) ?? null,
        eventFormat: (event.event_format as Event['eventFormat']) ?? null,
        color: '#3B82F6', // Default color
        tags: [], // Default empty tags
        careerImpactScore: 0, // Default score
        careerImpactComponents: {}, // Default components
        createdAt: event.created_at,
        status: 'upcoming' as const,
        sourceUrl: event.source_url || '',
        livestreamUrl: event.livestream_url || '',
        organizer: '' // Default empty organizer
      }));
  } catch (error) {
    console.warn('Error fetching user interacted events:', error);
    return [];
  }
}

/**
 * Check if user is in cold start state (no interaction history)
 */
export async function isColdStartUser(
  userId: string,
  supabaseClient: SupabaseClientType
): Promise<boolean> {
  try {
    const { count, error } = await supabaseClient
      .from('user_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.warn('Failed to check cold start status:', error);
      return true; // Assume cold start on error
    }

    return (count || 0) < 3; // Cold start if less than 3 interactions
  } catch (error) {
    console.warn('Error checking cold start status:', error);
    return true; // Assume cold start on error
  }
}

/**
 * Get behavioral boost configuration
 */
export function getBehavioralBoostConfig(): {
  enabled: boolean;
  maxBoost: number;
  minInteractions: number;
  daysBack: number;
} {
  return {
    enabled: isBehavioralBoostEnabled(),
    maxBoost: 15, // Maximum boost percentage
    minInteractions: 3, // Minimum interactions needed for boost
    daysBack: 30 // Days of history to consider
  };
}