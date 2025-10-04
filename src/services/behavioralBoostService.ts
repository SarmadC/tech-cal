/**
 * Behavioral Boost Service
 *
 * Phase 3: Implements post-interaction learning
 * - Similarity detection between events
 * - Post-interaction boost calculation
 * - A/B testing for boost strength
 */

import type { Event } from '@/types';
import type { SupabaseClientType } from '@/types';
import { BEHAVIORAL_CONFIG, type ABTestGroup } from '@/config/behavioralConstants';
import { handleServiceError } from '@/utils/commonUtils';

// =============================================
// TYPES
// =============================================

interface UserInteractionRecord {
  event_id: string;
  interaction_type: 'click' | 'save' | 'dismiss';
  created_at: string;
}

interface SimilarityScore {
  eventId: string;
  score: number;
  reasons: string[];
}

interface BoostApplication {
  eventId: string;
  boostAmount: number;
  similarEvents: string[];
  abGroup: ABTestGroup;
  appliedAt: string;
}

// =============================================
// BEHAVIORAL BOOST SERVICE
// =============================================

export class BehavioralBoostService {

  /**
   * Get A/B test group for user (deterministic based on user ID)
   */
  static getABTestGroup(userId: string): ABTestGroup {
    // Simple hash of user ID to ensure consistent group assignment
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const groupIndex = hash % 4;

    return Object.keys(BEHAVIORAL_CONFIG.AB_TEST_GROUPS)[groupIndex] as ABTestGroup;
  }

  /**
   * Get boost strength for user's A/B test group
   */
  static getBoostStrength(abGroup: ABTestGroup): number {
    // Check for environment override
    const envBoost = process.env.NEXT_PUBLIC_BEHAVIORAL_BOOST_STRENGTH;
    if (envBoost) {
      const parsed = parseInt(envBoost, 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 20) {
        return parsed;
      }
    }

    return BEHAVIORAL_CONFIG.BOOST_STRENGTHS[abGroup];
  }

  /**
   * Calculate similarity between two events
   */
  static calculateSimilarity(eventA: Event, eventB: Event): number {
    let totalSimilarity = 0;
    const weights = BEHAVIORAL_CONFIG.SIMILARITY_WEIGHTS;

    // Category similarity
    if (eventA.category?.name && eventB.category?.name) {
      if (eventA.category.name.toLowerCase() === eventB.category.name.toLowerCase()) {
        totalSimilarity += weights.CATEGORY;
      }
    }

    // Speaker similarity (check if any speakers match)
    const speakersA = (eventA as any).speakers?.map((s: any) => s.name.toLowerCase()) || []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const speakersB = (eventB as any).speakers?.map((s: any) => s.name.toLowerCase()) || []; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (speakersA.length > 0 && speakersB.length > 0) {
      const hasCommonSpeaker = speakersA.some((speaker: string) => speakersB.includes(speaker));
      if (hasCommonSpeaker) {
        totalSimilarity += weights.SPEAKER;
      }
    }

    // Tag similarity (percentage of shared tags)
    const tagsA = new Set((eventA.tags || []).map((tag: any) => tag.name?.toLowerCase() || '')); // eslint-disable-line @typescript-eslint/no-explicit-any
    const tagsB = new Set((eventB.tags || []).map((tag: any) => tag.name?.toLowerCase() || '')); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (tagsA.size > 0 && tagsB.size > 0) {
      const intersection = new Set([...tagsA].filter(tag => tagsB.has(tag)));
      const union = new Set([...tagsA, ...tagsB]);
      const tagSimilarity = intersection.size / union.size;
      totalSimilarity += weights.TAGS * tagSimilarity;
    }

    // Location similarity
    if (eventA.location && eventB.location) {
      const locationA = eventA.location.toLowerCase().trim();
      const locationB = eventB.location.toLowerCase().trim();
      if (locationA === locationB) {
        totalSimilarity += weights.LOCATION;
      }
    }

    return Math.min(totalSimilarity, 1.0); // Cap at 1.0
  }

  /**
   * Get recent user interactions from analytics
   */
  static async getUserInteractions(
    userId: string,
    supabaseClient: SupabaseClientType,
    days: number = BEHAVIORAL_CONFIG.INTERACTION_WINDOW_DAYS
  ): Promise<UserInteractionRecord[]> {
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const { data, error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('career_impact_analytics')
      .select('event_id, metric_type, measured_at')
      .eq('user_id', userId)
      .gte('measured_at', startDate.toISOString())
      .order('measured_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      event_id: row.event_id,
      interaction_type: row.metric_type as 'click' | 'save',
      created_at: row.measured_at
    }));
  }

  /**
   * Find similar events to user's interaction history
   */
  static findSimilarEvents(
    targetEvent: Event,
    interactedEvents: Event[]
  ): SimilarityScore[] {
    const similarities: SimilarityScore[] = [];

    for (const interactedEvent of interactedEvents) {
      const score = this.calculateSimilarity(targetEvent, interactedEvent);

      if (score >= BEHAVIORAL_CONFIG.MIN_SIMILARITY_THRESHOLD) {
        const reasons: string[] = [];

        // Build explanation for similarity
        if (targetEvent.category?.name === interactedEvent.category?.name) {
          reasons.push(`same category (${targetEvent.category?.name || 'unknown'})`);
        }

        const commonSpeakers = (targetEvent as any).speakers?.filter((speakerA: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
          (interactedEvent as any).speakers?.some((speakerB: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            speakerA.name.toLowerCase() === speakerB.name.toLowerCase()
          )
        ) || [];
        if (commonSpeakers.length > 0) {
          reasons.push(`shared speaker (${commonSpeakers[0].name})`);
        }

        const commonTags = (targetEvent.tags || []).filter((tagA: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
          (interactedEvent.tags || []).some((tagB: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            tagA.name?.toLowerCase() === tagB.name?.toLowerCase()
          )
        );
        if (commonTags.length > 0) {
          reasons.push(`shared tags (${commonTags.slice(0, 2).join(', ')})`);
        }

        similarities.push({
          eventId: interactedEvent.id,
          score,
          reasons
        });
      }
    }

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, BEHAVIORAL_CONFIG.MAX_SIMILAR_EVENTS);
  }

  /**
   * Calculate behavioral boost for an event based on user's interaction history
   */
  static async calculateBehavioralBoost(
    userId: string,
    targetEvent: Event,
    interactedEvents: Event[],
    supabaseClient: SupabaseClientType,
    context?: {
      timeOfDay?: number; // 0-23
      dayOfWeek?: number; // 0-6 (Sunday = 0)
      deviceType?: 'mobile' | 'desktop' | 'tablet';
    }
  ): Promise<{
    boost: number;
    application: BoostApplication | null;
    similarities: SimilarityScore[];
  }> {
    try {
      // Get user's A/B test group
      const abGroup = this.getABTestGroup(userId);
      const maxBoostStrength = this.getBoostStrength(abGroup);

      // No boost for control group
      if (maxBoostStrength === 0) {
        return {
          boost: 0,
          application: null,
          similarities: []
        };
      }

      // Get user interactions with temporal decay
      const recentInteractions = await this.getUserInteractions(userId, supabaseClient);
      if (recentInteractions.length < BEHAVIORAL_CONFIG.MIN_INTERACTIONS_FOR_BOOST) {
        return {
          boost: 0,
          application: null,
          similarities: []
        };
      }

      // Separate positive and negative interactions
      const positiveInteractions = recentInteractions.filter(i => 
        i.interaction_type === 'click' || i.interaction_type === 'save'
      );
      const negativeInteractions = recentInteractions.filter(i => 
        i.interaction_type === 'dismiss'
      );

      // Find similar events for both positive and negative interactions
      const positiveSimilarities = this.findSimilarEvents(targetEvent, interactedEvents);
      const negativeSimilarities = negativeInteractions.length > 0 
        ? this.findSimilarEvents(targetEvent, interactedEvents.filter(e => 
            negativeInteractions.some(ni => ni.event_id === e.id)
          ))
        : [];

      if (positiveSimilarities.length === 0 && negativeSimilarities.length === 0) {
        return {
          boost: 0,
          application: null,
          similarities: []
        };
      }

      // Calculate temporal decay weights
      const now = new Date();
      const temporalDecay = (interactionDate: string) => {
        const daysDiff = (now.getTime() - new Date(interactionDate).getTime()) / (1000 * 60 * 60 * 24);
        return Math.exp(-daysDiff / 30); // e^(-t/30) decay
      };

      // Calculate weighted similarity scores with temporal decay
      let weightedPositiveScore = 0;
      let weightedNegativeScore = 0;
      let totalPositiveWeight = 0;
      let totalNegativeWeight = 0;

      // Process positive interactions
      for (const interaction of positiveInteractions) {
        const decayWeight = temporalDecay(interaction.created_at);
        const similarity = positiveSimilarities.find(s => s.eventId === interaction.event_id);
        if (similarity) {
          weightedPositiveScore += similarity.score * decayWeight;
          totalPositiveWeight += decayWeight;
        }
      }

      // Process negative interactions
      for (const interaction of negativeInteractions) {
        const decayWeight = temporalDecay(interaction.created_at);
        const similarity = negativeSimilarities.find(s => s.eventId === interaction.event_id);
        if (similarity) {
          weightedNegativeScore += similarity.score * decayWeight;
          totalNegativeWeight += decayWeight;
        }
      }

      // Calculate contextual awareness boost
      let contextualBoost = 0;
      if (context?.timeOfDay !== undefined && targetEvent.startTime) {
        const eventHour = new Date(targetEvent.startTime).getHours();
        const timeDiff = Math.abs(eventHour - context.timeOfDay);
        // Boost if event time is within 2 hours of user's typical activity time
        if (timeDiff <= 2) {
          contextualBoost = 0.1; // 10% boost for good timing
        }
      }

      // Calculate final boost with positive, negative, and contextual components
      const avgPositiveSimilarity = totalPositiveWeight > 0 ? weightedPositiveScore / totalPositiveWeight : 0;
      const avgNegativeSimilarity = totalNegativeWeight > 0 ? weightedNegativeScore / totalNegativeWeight : 0;
      
      // Apply negative penalty (reduce boost if similar to dismissed events)
      const negativePenalty = avgNegativeSimilarity * 0.5; // 50% penalty for dismissed similar events
      
      const baseBoost = avgPositiveSimilarity - negativePenalty + contextualBoost;
      const boost = Math.round(maxBoostStrength * Math.max(0, Math.min(1, baseBoost))); // Clamp between 0 and 1

      const application: BoostApplication = {
        eventId: targetEvent.id,
        boostAmount: boost,
        similarEvents: [...positiveSimilarities, ...negativeSimilarities].map(s => s.eventId),
        abGroup,
        appliedAt: new Date().toISOString()
      };

      return {
        boost,
        application,
        similarities: [...positiveSimilarities, ...negativeSimilarities]
      };

    } catch (error) {
      handleServiceError(error, {
        function: 'calculateBehavioralBoost',
        userId,
        eventId: targetEvent.id
      });

      return {
        boost: 0,
        application: null,
        similarities: []
      };
    }
  }

  /**
   * Log behavioral boost application for analytics
   */
  static async logBoostApplication(
    application: BoostApplication,
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    if (!BEHAVIORAL_CONFIG.BEHAVIORAL_ANALYTICS.TRACK_BOOST_APPLICATIONS) {
      return;
    }

    try {
      const { error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('behavioral_boosts')
        .insert({
          user_id: userId,
          event_id: application.eventId,
          boost_amount: application.boostAmount,
          similar_event_ids: application.similarEvents,
          ab_group: application.abGroup,
          applied_at: application.appliedAt
        });

      if (error) throw error;
    } catch (error) {
      // Log but don't fail the request
      console.error('Error logging boost application:', error);
    }
  }

  /**
   * Get behavioral boost statistics for monitoring
   */
  static async getBoostStatistics(
    supabaseClient: SupabaseClientType,
    days: number = 7
  ): Promise<{
    totalBoosts: number;
    avgBoostAmount: number;
    abGroupDistribution: Record<string, number>;
    topSimilarityReasons: Array<{ reason: string; count: number }>;
  } | null> {
    try {
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

      const { data, error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('behavioral_boosts')
        .select('boost_amount, ab_group, applied_at')
        .gte('applied_at', startDate.toISOString());

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const totalBoosts = data.length;
      const avgBoostAmount = data.reduce((sum: number, row: any) => sum + row.boost_amount, 0) / totalBoosts; // eslint-disable-line @typescript-eslint/no-explicit-any

      const abGroupDistribution = data.reduce((acc: any, row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        acc[row.ab_group] = (acc[row.ab_group] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalBoosts,
        avgBoostAmount,
        abGroupDistribution,
        topSimilarityReasons: [] // Could be enhanced to track reasons
      };

    } catch (error) {
      console.error('Error getting boost statistics:', error);
      return null;
    }
  }
}