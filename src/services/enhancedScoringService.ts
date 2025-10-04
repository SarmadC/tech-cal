/**
 * Enhanced Scoring Service
 * 
 * Consolidated service that handles all scoring logic including:
 * - Base deterministic scoring
 * - Behavioral boost enhancements
 * - Contextual awareness
 * - Negative signals
 * - Temporal decay
 * 
 * This service provides a single, clean interface for all scoring needs.
 */

import type { Event, CareerProfile, SupabaseClientType } from '@/types';
import { ScoringStrategyFactory } from './scoring/ScoringStrategyFactory';
import { isBehavioralBoostEnabled } from '@/utils/behavioralBoostUtils';

export interface ScoringOptions {
  userId?: string;
  supabaseClient?: SupabaseClientType;
  enableBehavioralBoost?: boolean;
  context?: {
    timeOfDay?: number;
    dayOfWeek?: number;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
  };
}

export interface ScoringResult {
  event: Event;
  score: number;
  confidence: number;
  components: Record<string, number>;
  metadata: {
    algorithmVersion: string;
    behavioralBoost?: number;
    similarEvents?: string[];
    context?: {
      timeOfDay?: number;
      dayOfWeek?: number;
      deviceType?: string;
    };
  };
}

/**
 * Enhanced Scoring Service
 * 
 * Provides a unified interface for all scoring operations
 */
export class EnhancedScoringService {
  /**
   * Calculate career impact score for a single event
   */
  static async calculateScore(
    event: Event,
    careerProfile: CareerProfile,
    options: ScoringOptions = {}
  ): Promise<ScoringResult> {
    const { userId, supabaseClient, enableBehavioralBoost, context } = options;

    // Check if behavioral boost should be used
    const useBehavioralBoost = enableBehavioralBoost !== false && 
                              isBehavioralBoostEnabled() && 
                              userId && 
                              supabaseClient;

    if (useBehavioralBoost) {
      // Use enhanced behavioral strategy
      const enhancedStrategy = ScoringStrategyFactory.getEnhancedBehavioralStrategy(
        userId,
        supabaseClient
      );

      const score = await enhancedStrategy.calculateWithBehavioralBoost(
        { event, careerProfile },
        { userId, supabaseClient }
      );

      return {
        event,
        score: score.overall,
        confidence: score.confidence,
        components: score.components,
        metadata: {
          algorithmVersion: score.metadata?.algorithmVersion || 'v2.0.0',
          behavioralBoost: score.metadata?.appliedAdjustments?.behavioralBoost,
          similarEvents: score.metadata?.appliedAdjustments?.behavioralSimilarEvents,
          context
        }
      };
    } else {
      // Use base strategy
      const baseStrategy = ScoringStrategyFactory.getDefaultStrategy();
      
      const score = await baseStrategy.calculate(
        { event, careerProfile },
        { userId, supabaseClient }
      );

      return {
        event,
        score: score.overall,
        confidence: score.confidence,
        components: score.components,
        metadata: {
          algorithmVersion: score.metadata?.algorithmVersion || 'v2.0.0',
          context
        }
      };
    }
  }

  /**
   * Calculate scores for multiple events in batch
   */
  static async calculateBatchScores(
    events: Event[],
    careerProfile: CareerProfile,
    options: ScoringOptions = {}
  ): Promise<ScoringResult[]> {
    const { userId, supabaseClient, enableBehavioralBoost, context } = options;

    // Check if behavioral boost should be used
    const useBehavioralBoost = enableBehavioralBoost !== false && 
                              isBehavioralBoostEnabled() && 
                              userId && 
                              supabaseClient;

    if (useBehavioralBoost) {
      // Use enhanced behavioral strategy for batch processing
      const enhancedStrategy = ScoringStrategyFactory.getEnhancedBehavioralStrategy(
        userId,
        supabaseClient
      );

      const results = await enhancedStrategy.calculateBatchWithBehavioralBoost(
        events,
        careerProfile,
        { userId, supabaseClient }
      );

      return results.map(({ event, score }) => ({
        event,
        score: score.overall,
        confidence: score.confidence,
        components: score.components,
        metadata: {
          algorithmVersion: score.metadata?.algorithmVersion || 'v2.0.0',
          behavioralBoost: score.metadata?.appliedAdjustments?.behavioralBoost,
          similarEvents: score.metadata?.appliedAdjustments?.behavioralSimilarEvents,
          context
        }
      }));
    } else {
      // Use base strategy for batch processing
      const baseStrategy = ScoringStrategyFactory.getDefaultStrategy();
      
      const results = await Promise.all(
        events.map(async (event) => {
          const score = await baseStrategy.calculate(
            { event, careerProfile },
            { userId, supabaseClient }
          );
          return { event, score };
        })
      );

      return results.map(({ event, score }) => ({
        event,
        score: score.overall,
        confidence: score.confidence,
        components: score.components,
        metadata: {
          algorithmVersion: score.metadata?.algorithmVersion || 'v2.0.0',
          context
        }
      }));
    }
  }

  /**
   * Enrich events with career impact scores
   * 
   * This is a convenience method that adds scores directly to events
   */
  static async enrichEventsWithScores(
    events: Event[],
    careerProfile: CareerProfile,
    options: ScoringOptions = {}
  ): Promise<Event[]> {
    const results = await this.calculateBatchScores(events, careerProfile, options);
    
    return results.map(result => ({
      ...result.event,
      careerImpact: {
        overall: result.score,
        confidence: result.confidence,
        components: result.components,
        metadata: result.metadata
      }
    }));
  }

  /**
   * Get scoring configuration for debugging
   */
  static getScoringConfig(): {
    behavioralBoostEnabled: boolean;
    availableStrategies: string[];
    defaultStrategy: string;
  } {
    return {
      behavioralBoostEnabled: isBehavioralBoostEnabled(),
      availableStrategies: ScoringStrategyFactory.getAvailableVersions(),
      defaultStrategy: ScoringStrategyFactory.getDefaultStrategy().version
    };
  }
}
