/**
 * Lookalike User Service
 * 
 * Service for handling cold start users and lookalike recommendations
 */

import type { Event, SupabaseClientType, RecommendationTelemetryContext } from '@/types';
import type { Database } from '@/types/supabase';
import type { CareerProfile } from '@/types/career';
import { isColdStartUser } from '@/utils/behavioralBoostUtils';
import { eventDetailedTransformer } from '@/utils/transformers';
import { TagBasedMatchingService } from '@/services/tagBasedMatchingService';
import { DiversityEnhancementService } from '@/services/diversityEnhancementService';
import { CareerProfileService } from '@/services/careerProfileService';
import { CareerImpactService } from '@/services/careerImpactService';

const SUPABASE_SENIORITY_LEVELS = new Set<Database['public']['Enums']['seniority_level']>([
  'student',
  'entry-level',
  'junior',
  'mid-level',
  'senior',
  'staff',
  'principal',
  'lead',
  'manager',
  'director',
  'vp',
  'founder'
]);
import { logTelemetryEvent } from '@/utils/supabase/telemetry';

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
    limit: number = 10,
    telemetry?: RecommendationTelemetryContext
  ): Promise<Event[]> {
    try {
      const userProfile = await CareerProfileService.getCareerProfile(userId, supabaseClient);
      if (!userProfile) {
        console.warn('[Lookalike] No career profile found, using popularity fallback');
        return await this.getPopularFallback(supabaseClient, limit, telemetry, 'no_career_profile');
      }

      const similarProfiles = await this.findSimilarProfiles(userProfile, userId, supabaseClient, limit * 3);
      if (!similarProfiles.length) {
        console.warn('[Lookalike] No similar profiles found, using popularity fallback');
        return await this.getPopularFallback(supabaseClient, limit, telemetry, 'no_similar_profiles');
      }

      const candidateEvents = await this.collectEventsFromProfiles(similarProfiles, supabaseClient, limit * 5);
      if (!candidateEvents.length) {
        console.warn('[Lookalike] No candidate events from similar users, using popularity fallback');
        return await this.getPopularFallback(supabaseClient, limit, telemetry, 'no_candidate_events');
      }

      const uniqueEvents = new Map<string, Event>();
      candidateEvents.forEach(event => {
        if (!uniqueEvents.has(event.id)) {
          uniqueEvents.set(event.id, event);
        }
      });

      const tagged = await TagBasedMatchingService.getRecommendedEventsByTags(
        userId,
        userProfile,
        supabaseClient,
        limit * 5
      );

      const tagScoreMap = new Map<string, number>();
      tagged.forEach(result => {
        tagScoreMap.set(result.event.id, result.totalScore);
      });

      const scoredEvents = await Promise.all(
        Array.from(uniqueEvents.values()).map(async (event) => {
          const tagScore = tagScoreMap.get(event.id) ?? 0;
          try {
            const impactScore = await CareerImpactService.getCareerImpactScoreLiteAsync(
              { event, careerProfile: userProfile },
              { userId, supabaseClient }
            );
            return {
              event,
              tagScore,
              careerImpactScore: impactScore.overall
            };
          } catch (error) {
            console.warn('[Lookalike] Failed to compute impact score, skipping event', { eventId: event.id, error });
            return null;
          }
        })
      );

      const filtered = scoredEvents
        .filter((item): item is { event: Event; tagScore: number; careerImpactScore: number } => !!item)
        .sort((a, b) => (b.careerImpactScore + b.tagScore * 0.3) - (a.careerImpactScore + a.tagScore * 0.3))
        .slice(0, limit * 2)
        .map(item => ({
          ...item.event,
          recommendationMetadata: {
            source: 'lookalike',
            lookalikeTagScore: item.tagScore,
            lookalikeCareerImpactScore: item.careerImpactScore,
            lookalikeCohortSize: similarProfiles.length // Actual number of similar users
          }
        }) as Event);

      if (!filtered.length) {
        return await this.getPopularFallback(supabaseClient, limit, telemetry, 'filtered_empty');
      }

      const { enhancedRanking } = DiversityEnhancementService.enhanceRecommendations(filtered, Math.max(limit * 2, 10));
      const finalEvents = enhancedRanking.slice(0, limit);

      await this.emitTelemetry(supabaseClient, telemetry, 'lookalike_recommendations_generated', {
        requestedLimit: limit,
        finalCount: finalEvents.length,
        similarProfileCount: similarProfiles.length,
        candidateEventCount: candidateEvents.length,
        uniqueEventCount: uniqueEvents.size,
        topEventIds: finalEvents.slice(0, 5).map(event => event.id)
      });

      return finalEvents;
    } catch (error) {
      console.warn('Error getting lookalike recommendations:', error);
      return await this.getPopularFallback(supabaseClient, limit, telemetry, 'lookalike_exception');
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

  private static async findSimilarProfiles(
    careerProfile: CareerProfile,
    userId: string,
    supabaseClient: SupabaseClientType,
    limit: number
  ): Promise<CareerProfile[]> {
    // Attempt role-based cohort first
    if (careerProfile.currentRole) {
      const roleQuery = supabaseClient
        .from('career_profiles')
        .select('*')
        .neq('user_id', userId)
        .eq('industry', careerProfile.industry)
        .eq('current_role', careerProfile.currentRole)
        .limit(limit);
      
      const { data: roleData, error: roleError } = await roleQuery;
      
      if (!roleError && roleData && roleData.length >= 5) {
        // Sufficient role cohort found
        return roleData.map(row => CareerProfileService['transformRowToCareerProfile'](row as never));
      }
      // Otherwise, fall back to industry + seniority filtering
    }

    // Fallback: Create fresh query for industry + seniority filtering
    let query = supabaseClient
      .from('career_profiles')
      .select('*')
      .neq('user_id', userId)
      .eq('industry', careerProfile.industry)
      .limit(limit);

    const seniority = careerProfile.seniority as string | undefined;
    if (seniority && SUPABASE_SENIORITY_LEVELS.has(seniority as Database['public']['Enums']['seniority_level'])) {
      query = query.eq('seniority', seniority as Database['public']['Enums']['seniority_level']);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[Lookalike] Failed to fetch similar profiles:', error);
      return [];
    }

      return (data || []).map(row => CareerProfileService['transformRowToCareerProfile'](row as never));
  }

  private static async collectEventsFromProfiles(
    profiles: CareerProfile[],
    supabaseClient: SupabaseClientType,
    limit: number
  ): Promise<Event[]> {
    const profileIds = profiles.map(profile => profile.userId);

    const { data, error } = await supabaseClient
      .from('user_events')
      .select(`
        event_id,
        events_detailed (*)
      `)
      .in('user_id', profileIds)
      .eq('status', 'attended')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Lookalike] Failed to collect events for similar profiles:', error);
      return [];
    }

    const rawEvents = (data || [])
      .map(row => row.events_detailed)
      .filter(Boolean);

    return rawEvents.map(eventDetailedTransformer.toApp);
  }

  private static async getPopularFallback(
    supabaseClient: SupabaseClientType,
    limit: number,
    telemetry?: RecommendationTelemetryContext,
    reason?: string
  ): Promise<Event[]> {
    const { data, error } = await supabaseClient
      .from('events_detailed')
      .select('*')
      .gte('start_time', new Date().toISOString())
      .order('attendee_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Lookalike] Popular fallback failed:', error);
      return [];
    }

    const events = (data || []).map(eventDetailedTransformer.toApp);

    await this.emitTelemetry(supabaseClient, telemetry, 'lookalike_popular_fallback_generated', {
      requestedLimit: limit,
      finalCount: events.length,
      reason: reason ?? 'unknown',
      topEventIds: events.slice(0, 5).map(event => event.id)
    });

    return events;
  }

  private static async emitTelemetry(
    supabaseClient: SupabaseClientType,
    telemetry: RecommendationTelemetryContext | undefined,
    eventType: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (!telemetry?.hasConsent || !telemetry.userId) {
      return;
    }

    await logTelemetryEvent(supabaseClient, {
      eventType,
      eventVersion: 1,
      source: telemetry.source ?? 'backend',
      userId: telemetry.userId,
      sessionId: telemetry.sessionId ?? null,
      requestId: telemetry.requestId ?? null,
      occurredAt: new Date(),
      context: {
        surface: telemetry.surface ?? 'cold_start',
        ...telemetry.additionalContext
      },
      metadata
    });
  }
}
