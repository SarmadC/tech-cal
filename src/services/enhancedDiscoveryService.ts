'use client';

import { Event, AppProfile, TrackedEvent } from '@/types';
import { DiscoveryService, DiscoveryEvent, DiscoveryMetrics } from './discoveryService';
import { EnhancedAnalyticsService, UserBehaviorPattern } from './enhancedAnalyticsService';
import { SemanticSimilarityService } from '@/utils/semanticSimilarity';
import { SkillProgressionService } from '@/utils/skillProgression';
import { extractCareerProfile } from '@/utils/profileTypeGuards';
import { capScore } from '@/utils/commonUtils';
import { SCORING_CONFIG, TIME_CONSTANTS } from '@/config/analyticsConfig';
import { DatabaseQueryPatterns } from '@/utils/databaseQueryPatterns';
import { UnifiedEventUtils } from '@/utils/unifiedEventUtils';
import { RecommendationEvent, migrateDiscoveryEvent } from '@/types/unifiedEventTypes';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

type SupabaseClientType = SupabaseClient<Database>;

// =============================================
// ENHANCED DISCOVERY SERVICE
// =============================================

/**
 * @deprecated Use RecommendationEvent from @/types/unifiedEventTypes instead
 * This interface will be removed in v2.0
 */
export interface EnhancedDiscoveryEvent extends DiscoveryEvent {
  behaviorScore?: number;
  collaborativeScore?: number;
  timingScore?: number;
  diversityScore?: number;
  semanticScore?: number;
  skillProgressionScore?: number;
  categoryAffinityScore?: number;
}

export class EnhancedDiscoveryService extends DiscoveryService {
  /**
   * Get enhanced personalized recommendations using behavioral data
   */
  static async getEnhancedPersonalizedRecommendations(
    events: Event[],
    userProfile: AppProfile | null,
    trackedEvents: TrackedEvent[] = [],
    supabaseClient: SupabaseClientType,
    limit: number = 5,
    userLocation?: { city?: string; country?: string; timezone?: string }
  ): Promise<RecommendationEvent[]> {
    if (!userProfile || events.length === 0) return [];

    try {

    // Get user behavior patterns
    const behaviorPattern = await EnhancedAnalyticsService.getUserBehaviorPattern(
      userProfile.id,
      supabaseClient
    );

    // Cold start detection: if no behavior data, use basic algorithm
    if (!behaviorPattern && trackedEvents.length < SCORING_CONFIG.MIN_TRACKED_EVENTS_FOR_ENHANCED) {
      console.log('Cold start detected: using basic recommendations');
      const basicRecs = this.getPersonalizedRecommendations(
        events,
        userProfile,
        trackedEvents,
        limit,
        userLocation
      );
      // Convert to unified type
      return basicRecs.map(event => migrateDiscoveryEvent(event));
    }

    // Get base recommendations from original service (will be enhanced)
    const baseRecommendations = this.getPersonalizedRecommendations(
      events,
      userProfile,
      trackedEvents,
      limit * 2, // Get more to allow for reranking
      userLocation
    ).map(event => migrateDiscoveryEvent(event));

    // Get collaborative scores for all events in batch (fix N+1 query problem)
    const eventIds = baseRecommendations.map(e => e.id);
    const collaborativeScores = await this.batchCalculateCollaborativeScores(
      eventIds,
      userProfile.id,
      supabaseClient
    );

    // Enhance with behavioral scoring
    const enhancedRecommendations = baseRecommendations.map((event, _index) => {
      const behaviorScore = this.calculateBehaviorScore(event, behaviorPattern);
      const collaborativeScore = collaborativeScores[event.id] || 0.5;
      const timingScore = this.calculateTimingScore(event, behaviorPattern);
      const diversityScore = 0.5; // Simple diversity score for now
      
      // New enhanced scoring components
      const semanticScore = this.calculateSemanticScore(event, userProfile);
      const skillProgressionScore = this.calculateSkillProgressionScore(event, userProfile, trackedEvents);
      const categoryAffinityScore = this.calculateCategoryAffinityScore(event, behaviorPattern);

        // Enhanced scoring with all signals
        const originalScore = event.discoveryMetrics?.personalizedScore || 0;
        const enhancedScore = this.combineScores({
          originalScore,
          behaviorScore,
          collaborativeScore,
          timingScore,
          diversityScore,
          semanticScore,
          skillProgressionScore,
          categoryAffinityScore
        });

        return {
          ...event,
          discoveryMetrics: {
            ...event.discoveryMetrics,
            personalizedScore: enhancedScore,
            behaviorScore,
            collaborativeScore,
            timingScore,
            diversityScore,
            semanticScore,
            skillProgressionScore,
            categoryAffinityScore
          }
        } as RecommendationEvent;
    });

    // Sort by enhanced score and return top results
    return enhancedRecommendations
      .sort((a, b) => (b.discoveryMetrics?.personalizedScore || 0) - (a.discoveryMetrics?.personalizedScore || 0))
      .slice(0, limit);

    } catch (error) {
      console.error('Error in enhanced personalized recommendations:', error);
      // Fallback to basic recommendations
      const fallbackRecs = this.getPersonalizedRecommendations(
        events,
        userProfile,
        trackedEvents,
        limit,
        userLocation
      );
      return fallbackRecs.map(event => migrateDiscoveryEvent(event));
    }
  }

  /**
   * Calculate behavior-based scoring
   */
  private static calculateBehaviorScore(
    event: Event,
    behaviorPattern: UserBehaviorPattern | null
  ): number {
    if (!behaviorPattern) return 0.5; // Neutral score for new users

    let score = 0;

    // Section preference bonus
    const eventSection = this.getEventSection(event);
    if (behaviorPattern.preferredSections.includes(eventSection)) {
      const sectionRank = behaviorPattern.preferredSections.indexOf(eventSection);
      score += (3 - sectionRank) * 0.2; // Higher score for more preferred sections
    }

    // Time preference bonus
    const eventHour = new Date(event.startTime).getHours();
    if (behaviorPattern.mostActiveHours.includes(eventHour)) {
      score += 0.3;
    }

    // Engagement pattern bonus
    if (behaviorPattern.clickThroughRate > 0.1) { // Active user
      score += 0.2;
    }

    // Session duration correlation
    const eventDuration = this.getEventDurationHours(event);
    const userAvgSessionMinutes = behaviorPattern.avgSessionDuration / 60000; // Convert to minutes
    
    if (eventDuration <= 2 && userAvgSessionMinutes <= 30) { // Short events for short sessions
      score += 0.2;
    } else if (eventDuration > 2 && userAvgSessionMinutes > 30) { // Long events for long sessions
      score += 0.2;
    }

    return capScore(score);
  }

  /**
   * Batch calculate collaborative scores for multiple events (fix N+1 query)
   */
  private static async batchCalculateCollaborativeScores(
    eventIds: string[],
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<Record<string, number>> {
    try {
      // Get all interaction data in one query (using unified pattern)
      const { data: similarUsers, error } = await DatabaseQueryPatterns.getCollaborativeData(
        eventIds,
        userId,
        supabaseClient,
        30 // 30 days
      );

      if (error || !similarUsers) {
        // Return neutral scores for all events
        return eventIds.reduce((acc, eventId) => {
          acc[eventId] = 0.5;
          return acc;
        }, {} as Record<string, number>);
      }

      const totalSimilarUsers = new Set(similarUsers.map(u => u.user_id)).size;
      
      // Calculate scores for each event
      const scores: Record<string, number> = {};
      
      for (const eventId of eventIds) {
        const eventInteractions = similarUsers.filter(u => u.event_id === eventId).length;
        
        if (totalSimilarUsers === 0) {
          scores[eventId] = 0.5;
        } else {
          const popularityRatio = eventInteractions / totalSimilarUsers;
          scores[eventId] = capScore(popularityRatio * 2);
        }
      }

      return scores;

    } catch (error) {
      console.error('Error calculating collaborative scores:', error);
      // Return neutral scores for all events on error
      return eventIds.reduce((acc, eventId) => {
        acc[eventId] = 0.5;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  /**
   * Calculate timing relevance score
   */
  private static calculateTimingScore(
    event: Event,
    behaviorPattern: UserBehaviorPattern | null
  ): number {
    const eventDate = new Date(event.startTime);
    const now = new Date();
    const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    let score = 0.5; // Base score

    // Optimal timing based on user behavior
    if (behaviorPattern) {
      // Users who interact frequently prefer events happening sooner
      if (behaviorPattern.interactionFrequency > 50) { // Active users
        if (daysUntilEvent <= 7) score += 0.3;
        else if (daysUntilEvent <= 14) score += 0.2;
      } else { // Less active users prefer more notice
        if (daysUntilEvent >= 14 && daysUntilEvent <= 30) score += 0.3;
        else if (daysUntilEvent >= 7 && daysUntilEvent <= 14) score += 0.2;
      }
    }

    // Weekend vs weekday preference based on event timing
    const eventDay = eventDate.getDay();
    const isWeekend = eventDay === 0 || eventDay === 6;
    
    if (behaviorPattern?.mostActiveHours) {
      const avgActiveHour = behaviorPattern.mostActiveHours.reduce((a, b) => a + b, 0) / behaviorPattern.mostActiveHours.length;
      
      // If user is most active during business hours, prefer weekday events
      if (avgActiveHour >= 9 && avgActiveHour <= 17 && !isWeekend) {
        score += 0.2;
      }
      // If user is most active in evenings/weekends, prefer weekend events
      else if ((avgActiveHour < 9 || avgActiveHour > 17) && isWeekend) {
        score += 0.2;
      }
    }

    return capScore(score);
  }

  /**
   * Calculate diversity score to avoid filter bubbles
   */
  private static calculateDiversityScore(
    event: Event,
    allRecommendations: DiscoveryEvent[]
  ): number {
    // Check diversity across different dimensions
    let diversityScore = 0.5; // Base score

    // Category diversity
    const eventCategories = allRecommendations.map(e => e.eventTypeId);
    const uniqueCategories = new Set(eventCategories);
    const categoryDiversity = uniqueCategories.size / eventCategories.length;
    
    if (categoryDiversity > 0.7) { // High diversity
      diversityScore += 0.2;
    }

    // Organizer diversity
    const organizers = allRecommendations.map(e => e.organization?.id).filter(Boolean);
    const uniqueOrganizers = new Set(organizers);
    const organizerDiversity = organizers.length > 0 ? uniqueOrganizers.size / organizers.length : 1;
    
    if (organizerDiversity > 0.8) {
      diversityScore += 0.2;
    }

    // Format diversity (virtual vs in-person)
    const formats = allRecommendations.map(e => 
      e.location?.toLowerCase().includes('virtual') || e.livestreamUrl ? 'virtual' : 'in-person'
    );
    const uniqueFormats = new Set(formats);
    
    if (uniqueFormats.size > 1) {
      diversityScore += 0.1;
    }

    return Math.min(diversityScore, 1.0);
  }

  /**
   * Calculate semantic similarity score
   */
  private static calculateSemanticScore(event: Event, userProfile: AppProfile): number {
    const careerProfile = extractCareerProfile(userProfile);
    if (!careerProfile) return 0.5;

    const primarySkills = careerProfile.primarySkills || [];
    const interests = careerProfile.interests || [];
    
    const semanticMatch = SemanticSimilarityService.calculateEventSimilarity(
      event,
      primarySkills,
      interests
    );

    return semanticMatch.similarity;
  }

  /**
   * Calculate skill progression score
   */
  private static calculateSkillProgressionScore(
    event: Event,
    userProfile: AppProfile,
    trackedEvents: TrackedEvent[]
  ): number {
    const skillProgression = SkillProgressionService.analyzeSkillProgression(
      userProfile,
      trackedEvents
    );

    const progressionEvents = SkillProgressionService.getSkillProgressionEvents(
      [event],
      skillProgression,
      1
    );

    return progressionEvents.length > 0 ? progressionEvents[0].progressionScore : 0.3;
  }

  /**
   * Calculate category affinity score
   */
  private static calculateCategoryAffinityScore(
    event: Event,
    behaviorPattern: UserBehaviorPattern | null
  ): number {
    if (!behaviorPattern) return 0.5;

    // Check if event category aligns with user's preferred sections
    const eventSection = this.getEventSection(event);
    const sectionPreference = behaviorPattern.preferredSections.indexOf(eventSection);
    
    if (sectionPreference === -1) return 0.3; // Not in preferred sections
    
    // Higher score for more preferred sections
    return 0.8 - (sectionPreference * 0.1);
  }

  /**
   * Combine multiple scores with adaptive weights
   */
  private static combineScores(scores: {
    originalScore: number;
    behaviorScore: number;
    collaborativeScore: number;
    timingScore: number;
    diversityScore: number;
    semanticScore: number;
    skillProgressionScore: number;
    categoryAffinityScore: number;
  }): number {
    // Use centralized scoring weights
    const weights = SCORING_CONFIG.ENHANCED_WEIGHTS;

    return (
      scores.originalScore * weights.original +
      scores.behaviorScore * weights.behavior +
      scores.collaborativeScore * weights.collaborative +
      scores.semanticScore * weights.semantic +
      scores.skillProgressionScore * weights.skillProgression +
      scores.timingScore * weights.timing +
      scores.categoryAffinityScore * weights.categoryAffinity +
      scores.diversityScore * weights.diversity
    );
  }

  /**
   * Get the section this event would appear in
   */
  private static getEventSection(event: Event): string {
    // Logic to determine which section this event belongs to
    const now = new Date();
    const eventDate = new Date(event.startTime);
    const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (event.attendeeCount && event.attendeeCount > 500) return 'trending';
    if (daysUntilEvent <= 7) return 'new_this_week';
    if (this.getEventDurationHours(event) <= 2) return 'quick_wins';
    
    return 'for_you';
  }

  /**
   * Get event duration in hours (unified)
   */
  private static getEventDurationHours(event: Event): number {
    return UnifiedEventUtils.getDurationAs(event, 'hours') as number;
  }

  /**
   * Get trending events with enhanced behavioral insights
   */
  static async getEnhancedTrendingEvents(
    events: Event[],
    supabaseClient: SupabaseClientType,
    limit: number = 5,
    userLocation?: { city?: string; country?: string; timezone?: string }
  ): Promise<EnhancedDiscoveryEvent[]> {
    // Get base trending events
    const baseTrending = this.getTrendingEvents(events, limit * 2, userLocation) as EnhancedDiscoveryEvent[];

    // Enhance with real interaction data
    const enhancedTrending = await Promise.all(
      baseTrending.map(async (event) => {
        const realTrendingScore = await this.calculateRealTrendingScore(event, supabaseClient);
        
        return {
          ...event,
          discoveryMetrics: {
            ...event.discoveryMetrics,
            trendingScore: realTrendingScore
          } as DiscoveryMetrics
        };
      })
    );

    return enhancedTrending
      .sort((a, b) => (b.discoveryMetrics?.trendingScore || 0) - (a.discoveryMetrics?.trendingScore || 0))
      .slice(0, limit);
  }

  /**
   * Calculate real trending score based on actual user interactions
   */
  private static async calculateRealTrendingScore(
    event: Event,
    supabaseClient: SupabaseClientType
  ): Promise<number> {
    try {
      const { data: interactions, error } = await DatabaseQueryPatterns.getTrendingData(
        event.id,
        supabaseClient,
        7 // 7 days
      );

      if (error || !interactions) return 0;

      const totalInteractions = interactions.length;
      const recentInteractions = interactions.filter(
        i => new Date(i.created_at!).getTime() > Date.now() - TIME_CONSTANTS.DAY
      ).length;

      // Calculate trending velocity (recent activity / total activity)
      const trendingVelocity = totalInteractions > 0 ? recentInteractions / totalInteractions : 0;
      
      // Combine with base trending score (simplified)
      const baseTrending = 0;
      const realTrending = capScore(baseTrending + (trendingVelocity * 0.3));

      return realTrending;

    } catch (error) {
      console.error('Error calculating real trending score:', error);
      return 0;
    }
  }

  /**
   * Get A/B test variant for user
   */
  static async getAlgorithmVariant(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<string> {
    try {
      // Check if user has existing experiment assignment
      const { data: existing, error } = await supabaseClient
        .from('user_experiments')
        .select('variant')
        .eq('user_id', userId)
        .eq('experiment_name', 'recommendation_algorithm')
        .single();

      if (!error && existing) {
        return existing.variant;
      }

      // Assign new variant (50/50 split between v1.0 and v2.0)
      const variant = Math.random() < 0.5 ? 'v1.0' : 'v2.0';
      
      // Store assignment
      await supabaseClient
        .from('user_experiments')
        .insert({
          user_id: userId,
          experiment_name: 'recommendation_algorithm',
          variant
        });

      return variant;

    } catch (error) {
      console.error('Error getting algorithm variant:', error);
      return 'v1.0'; // Default variant
    }
  }
}
