/**
 * Lookalike User Service
 * 
 * Service for handling cold start users and lookalike recommendations
 */

import type { Event, RecommendationMetadata, SupabaseClientType, RecommendationTelemetryContext } from '@/types';
import type { Database } from '@/types/supabase';
import type { CareerProfile } from '@/types/career';
import { isColdStartUser } from '@/utils/behavioralBoostUtils';
import { eventDetailedTransformer } from '@/utils/transformers';
import { DiversityEnhancementService } from '@/services/diversityEnhancementService';
import { CareerProfileService } from '@/services/careerProfileService';

/** Seniority levels ordered by career progression, for proximity scoring */
const SENIORITY_LADDER: ReadonlyArray<Database['public']['Enums']['seniority_level']> = [
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
];
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
      const eventSupport = new Map<string, number>();
      candidateEvents.forEach(event => {
        eventSupport.set(event.id, (eventSupport.get(event.id) ?? 0) + 1);
        if (!uniqueEvents.has(event.id)) {
          uniqueEvents.set(event.id, event);
        }
      });

      const rankedCandidates = Array.from(uniqueEvents.values()).sort((a, b) => {
        const supportDelta = (eventSupport.get(b.id) ?? 0) - (eventSupport.get(a.id) ?? 0);
        if (supportDelta !== 0) {
          return supportDelta;
        }

        const attendeeDelta = (b.attendeeCount ?? 0) - (a.attendeeCount ?? 0);
        if (attendeeDelta !== 0) {
          return attendeeDelta;
        }

        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

      const filtered = rankedCandidates
        .slice(0, limit * 2)
        .map(event => {
          const lookalikeSupport = eventSupport.get(event.id) ?? 1;
          const primaryReason = lookalikeSupport > 1
            ? `Popular with ${lookalikeSupport} similar professionals`
            : 'Retrieved from similar professionals';
          const recommendationMetadata: RecommendationMetadata = {
            matchedTags: [],
            // matchScore/totalScore are on a 0-100 scale elsewhere in the system;
            // the lookalike support count lives in lookalikeSupport below. Putting
            // the raw count here let "support = 1" normalize to a perfect score
            // in surfaces like mobile Top Picks.
            matchScore: 0,
            impactScore: 0,
            profileBoost: 0,
            recencyBoost: 0,
            popularityBoost: 0,
            totalScore: 0,
            reasons: [primaryReason],
            candidateSources: ['lookalike', 'cold-start'],
            source: 'lookalike',
            lookalikeSupport,
            lookalikeCohortSize: similarProfiles.length // Actual number of similar users
          };

          return {
            ...event,
            recommendationMetadata,
            recommendationProvenance: ['lookalike', 'cold-start']
          } as Event;
        });

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
      // Upcoming events ranked by attendee count
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
        // No fabricated format/cost/difficulty: downstream behavioral similarity
        // must only see real event data.
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
    // Both cohort queries match on exact industry; without one the eq() filter
    // is meaningless and the "cohort" would be arbitrary profiles.
    if (!careerProfile.industry) {
      return [];
    }

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

    // Fallback: fetch a wider industry cohort, then rank in memory by profile
    // similarity (seniority proximity + skill/interest overlap). The previous
    // exact-seniority filter either excluded near-matches entirely or returned
    // an arbitrary slice of the industry.
    const fetchLimit = Math.max(limit * 3, 60);
    const { data, error } = await supabaseClient
      .from('career_profiles')
      .select('*')
      .neq('user_id', userId)
      .eq('industry', careerProfile.industry)
      .limit(fetchLimit);

    if (error) {
      console.warn('[Lookalike] Failed to fetch similar profiles:', error);
      return [];
    }

    const cohort = (data || []).map(row => CareerProfileService['transformRowToCareerProfile'](row as never));
    return this.rankCohortBySimilarity(careerProfile, cohort).slice(0, limit);
  }

  /**
   * Rank a cohort of same-industry profiles by similarity to the user.
   * Stable: ties keep the database order.
   */
  private static rankCohortBySimilarity(
    user: CareerProfile,
    cohort: CareerProfile[]
  ): CareerProfile[] {
    return cohort
      .map((profile, index) => ({ profile, index, score: this.profileSimilarity(user, profile) }))
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index))
      .map(entry => entry.profile);
  }

  private static profileSimilarity(user: CareerProfile, candidate: CareerProfile): number {
    let score = 0;

    // Seniority proximity: exact 3, one step on the ladder 2, two steps 1
    const userRung = SENIORITY_LADDER.indexOf(user.seniority as typeof SENIORITY_LADDER[number]);
    const candidateRung = SENIORITY_LADDER.indexOf(candidate.seniority as typeof SENIORITY_LADDER[number]);
    if (userRung >= 0 && candidateRung >= 0) {
      const distance = Math.abs(userRung - candidateRung);
      if (distance === 0) score += 3;
      else if (distance === 1) score += 2;
      else if (distance === 2) score += 1;
    }

    const overlap = (left?: string[], right?: string[]): number => {
      if (!left?.length || !right?.length) return 0;
      const rightSet = new Set(right.map(value => value.toLowerCase()));
      return left.filter(value => rightSet.has(value.toLowerCase())).length;
    };

    // Caps keep one long list from dominating the ranking
    score += Math.min(overlap(user.primarySkills, candidate.primarySkills), 4);
    score += Math.min(overlap(user.interests, candidate.interests), 3);
    // People who already have what the user wants to learn are good proxies
    score += Math.min(overlap(user.skillsToLearn, candidate.primarySkills), 3);

    return score;
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
