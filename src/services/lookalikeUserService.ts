/**
 * Lookalike User Service
 * 
 * Service for handling cold start users and lookalike recommendations
 */

import type { Event, SupabaseClientType } from '@/types';
import { isColdStartUser } from '@/utils/behavioralBoostUtils';

/**
 * Lookalike User Service
 */
export class LookalikeUserService {
  /**
   * Check if user is in cold start state
   */
  static async isColdStartUser(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<boolean> {
    return isColdStartUser(userId, supabaseClient);
  }

  /**
   * Get lookalike recommendations for cold start users
   */
  static async getLookalikeRecommendations(
    userId: string,
    supabaseClient: SupabaseClientType,
    limit: number = 10
  ): Promise<Event[]> {
    try {
      // For cold start users, return popular events
      const { data, error } = await supabaseClient
        .from('events')
        .select(`
          *,
          event_type:event_type_id (*),
          organizer:organizers (id, name, logo_url)
        `)
        .gte('start_time', new Date().toISOString())
        .order('attendee_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Failed to fetch lookalike recommendations:', error);
        return [];
      }

      return (data || []).map(event => ({
        id: event.id,
        title: event.title || 'Untitled Event',
        description: event.description || '',
        startTime: event.start_time,
        endTime: event.end_time,
        eventTypeId: event.event_type_id || '',
        organizerId: event.organizer_id,
        attendeeCount: event.attendee_count || 0,
        location: event.location || '',
        format: 'virtual', // Default format
        cost: 'free', // Default cost
        difficulty: 'beginner', // Default difficulty
        color: '#3B82F6', // Default color
        tags: [], // Default empty tags
        careerImpactScore: 0, // Default score
        careerImpactComponents: {}, // Default components
        createdAt: event.created_at,
        status: 'upcoming' as const,
        sourceUrl: event.source_url || '',
        livestreamUrl: event.livestream_url || '',
        eventType: event.event_type ? {
          id: event.event_type.id,
          name: event.event_type.name,
          description: event.event_type.description || '',
          color: event.event_type.color || '#3B82F6'
        } : undefined,
        organizer: event.organizer?.name || 'Unknown Organizer'
      }));

    } catch (error) {
      console.warn('Error getting lookalike recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending events for cold start users
   */
  static async getTrendingEvents(
    supabaseClient: SupabaseClientType,
    limit: number = 20
  ): Promise<Event[]> {
    try {
      // Get events with high attendee count from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabaseClient
        .from('events')
        .select(`
          *,
          event_type:event_type_id (*),
          organizer:organizers (id, name, logo_url)
        `)
        .gte('start_time', thirtyDaysAgo.toISOString())
        .gte('start_time', new Date().toISOString())
        .order('attendee_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Failed to fetch trending events:', error);
        return [];
      }

      return (data || []).map(event => ({
        id: event.id,
        title: event.title || 'Untitled Event',
        description: event.description || '',
        startTime: event.start_time,
        endTime: event.end_time,
        eventTypeId: event.event_type_id || '',
        organizerId: event.organizer_id,
        attendeeCount: event.attendee_count || 0,
        location: event.location || '',
        format: 'virtual', // Default format
        cost: 'free', // Default cost
        difficulty: 'beginner', // Default difficulty
        color: '#3B82F6', // Default color
        tags: [], // Default empty tags
        careerImpactScore: 0, // Default score
        careerImpactComponents: {}, // Default components
        createdAt: event.created_at,
        status: 'upcoming' as const,
        sourceUrl: event.source_url || '',
        livestreamUrl: event.livestream_url || '',
        eventType: event.event_type ? {
          id: event.event_type.id,
          name: event.event_type.name,
          description: event.event_type.description || '',
          color: event.event_type.color || '#3B82F6'
        } : undefined,
        organizer: event.organizer?.name || 'Unknown Organizer'
      }));

    } catch (error) {
      console.warn('Error getting trending events:', error);
      return [];
    }
  }
}