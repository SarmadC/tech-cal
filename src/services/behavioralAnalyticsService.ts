/**
 * Behavioral Analytics Service
 * 
 * Service for analyzing user behavior patterns and context
 */

import type { SupabaseClientType } from '@/types';
import type { UserContext } from './behavioralBoostService';

/**
 * Behavioral Analytics Service
 */
export class BehavioralAnalyticsService {
  /**
   * Get user context for behavioral analysis
   */
  static async getUserContext(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<UserContext | null> {
    try {
      // Get user's interaction history
      const { data: interactions, error } = await supabaseClient
        .from('user_events')
        .select(`
          created_at,
          events (
            event_type_id,
            format,
            start_time,
            end_time,
            attendee_count
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !interactions || interactions.length === 0) {
        return null;
      }

      // Analyze patterns
      const preferredCategories = this.analyzePreferredCategories(interactions);
      const preferredFormats = this.analyzePreferredFormats(interactions);
      const preferredTimes = this.analyzePreferredTimes(interactions);
      const averageEventDuration = this.calculateAverageDuration(interactions);
      const interactionFrequency = this.calculateInteractionFrequency(interactions);

      return {
        preferredCategories,
        preferredFormats,
        preferredTimes,
        averageEventDuration,
        interactionFrequency
      };

    } catch (error) {
      console.warn('Error getting user context:', error);
      return null;
    }
  }

  /**
   * Analyze preferred categories from interaction history
   */
  private static analyzePreferredCategories(interactions: Record<string, unknown>[]): string[] {
    const categoryCounts = new Map<string, number>();
    
    for (const interaction of interactions) {
      const eventTypeId = (interaction.events as Record<string, unknown>)?.event_type_id;
      if (eventTypeId && typeof eventTypeId === 'string') {
        categoryCounts.set(eventTypeId, (categoryCounts.get(eventTypeId) || 0) + 1);
      }
    }

    return Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([categoryId]) => categoryId);
  }

  /**
   * Analyze preferred formats from interaction history
   */
  private static analyzePreferredFormats(interactions: Record<string, unknown>[]): string[] {
    const formatCounts = new Map<string, number>();
    
    for (const interaction of interactions) {
      const format = (interaction.events as Record<string, unknown>)?.format;
      if (format && typeof format === 'string') {
        formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
      }
    }

    return Array.from(formatCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([format]) => format);
  }

  /**
   * Analyze preferred times from interaction history
   */
  private static analyzePreferredTimes(interactions: Record<string, unknown>[]): string[] {
    const timeSlots = new Map<string, number>();
    
    for (const interaction of interactions) {
      const startTime = (interaction.events as Record<string, unknown>)?.start_time;
      if (startTime && typeof startTime === 'string') {
        try {
          const hour = new Date(startTime).getHours();
          let timeSlot: string;
          
          if (hour >= 6 && hour < 12) timeSlot = 'morning';
          else if (hour >= 12 && hour < 17) timeSlot = 'afternoon';
          else if (hour >= 17 && hour < 21) timeSlot = 'evening';
          else timeSlot = 'night';
          
          timeSlots.set(timeSlot, (timeSlots.get(timeSlot) || 0) + 1);
        } catch {
          // Skip invalid dates
        }
      }
    }

    return Array.from(timeSlots.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([timeSlot]) => timeSlot);
  }

  /**
   * Calculate average event duration from interaction history
   */
  private static calculateAverageDuration(interactions: Record<string, unknown>[]): number {
    let totalDuration = 0;
    let validInteractions = 0;

    for (const interaction of interactions) {
      const startTime = (interaction.events as Record<string, unknown>)?.start_time;
      const endTime = (interaction.events as Record<string, unknown>)?.end_time;
      
      if (startTime && endTime && typeof startTime === 'string' && typeof endTime === 'string') {
        try {
          const start = new Date(startTime);
          const end = new Date(endTime);
          const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Hours
          
          if (duration > 0 && duration < 24) { // Reasonable duration
            totalDuration += duration;
            validInteractions++;
          }
        } catch {
          // Skip invalid dates
        }
      }
    }

    return validInteractions > 0 ? totalDuration / validInteractions : 2; // Default 2 hours
  }

  /**
   * Calculate interaction frequency (interactions per week)
   */
  private static calculateInteractionFrequency(interactions: Record<string, unknown>[]): number {
    if (interactions.length < 2) return 0;

    try {
      const firstInteraction = new Date(interactions[interactions.length - 1].created_at as string);
      const lastInteraction = new Date(interactions[0].created_at as string);
      
      const timeDiff = lastInteraction.getTime() - firstInteraction.getTime();
      const weeksDiff = timeDiff / (1000 * 60 * 60 * 24 * 7);
      
      return weeksDiff > 0 ? interactions.length / weeksDiff : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get user's analytics consent status
   * For now, returns true by default (assume consent given)
   */
  static async getAnalyticsConsent(
    _userId: string,
    _supabaseClient: SupabaseClientType
  ): Promise<boolean | null> {
    try {
      // For now, assume users have given consent
      // In the future, this would check a user_preferences table
      return true;
    } catch (error) {
      console.warn('Error getting analytics consent:', error);
      return null;
    }
  }

  /**
   * Set user's analytics consent
   * For now, just logs the consent
   */
  static async setAnalyticsConsent(
    userId: string,
    consent: boolean,
    _supabaseClient: SupabaseClientType
  ): Promise<boolean> {
    try {
      // For now, just log the consent
      console.log(`Analytics consent set for user ${userId}: ${consent}`);
      return true;
    } catch (error) {
      console.error('Error setting analytics consent:', error);
      return false;
    }
  }

  /**
   * Force flush user analytics data
   */
  static async forceFlushUser(userId: string): Promise<void> {
    try {
      // This would typically flush any pending analytics data to storage
      // For now, we'll just log that the flush was requested
      console.log(`Analytics flush requested for user: ${userId}`);
      
      // In a real implementation, this might:
      // 1. Send pending interaction events to analytics service
      // 2. Update user behavior models
      // 3. Clear local analytics cache
      
    } catch (error) {
      console.warn('Error flushing user analytics:', error);
    }
  }

  /**
   * Force flush all analytics data
   */
  static async forceFlushAll(): Promise<void> {
    try {
      // This would typically flush all pending analytics data to storage
      // For now, we'll just log that the flush was requested
      console.log('Analytics flush requested for all users');
      
      // In a real implementation, this might:
      // 1. Send all pending interaction events to analytics service
      // 2. Update all user behavior models
      // 3. Clear all local analytics cache
      
    } catch (error) {
      console.warn('Error flushing all analytics:', error);
    }
  }

  /**
   * Track user interaction for analytics
   * For now, just logs the interaction
   */
  static async trackInteraction(
    userId: string,
    interactionType: string,
    data: Record<string, unknown>,
    _supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      // For now, just log the interaction
      console.log(`User interaction tracked: ${userId} - ${interactionType}`, data);
    } catch (error) {
      console.warn('Error tracking interaction:', error);
    }
  }
}
