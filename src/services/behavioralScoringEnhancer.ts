/**
 * Behavioral Scoring Enhancer
 *
 * Wrapper service that adds behavioral boosts to existing scoring strategies
 * Simplifies integration of Phase 3 behavioral layer
 */

import type { Event, CareerImpactScore } from '@/types';
import type { CareerProfile } from '@/types/career';
// import type { SupabaseClientType } from '@/types'; // Unused for now
import type { CareerImpactCalculationInput, CareerImpactCalculationOptions } from '@/types/careerImpact';
import { getUserInteractedEvents, isBehavioralBoostEnabled } from '@/utils/behavioralBoostUtils';
import { BehavioralBoostService } from './behavioralBoostService';
import { BehavioralAnalyticsService } from './behavioralAnalyticsService';
import { ScoringStrategy } from './scoring/ScoringStrategy';

/**
 * Enhanced scoring options that include behavioral boost data
 */
export interface BehavioralScoringOptions extends CareerImpactCalculationOptions {
  enableBehavioralBoost?: boolean;
  behavioralBoostCacheKey?: string;
}

/**
 * Service that wraps any scoring strategy with behavioral boost capabilities
 */
export class BehavioralScoringEnhancer {
  constructor(private baseStrategy: ScoringStrategy) {}

  /**
   * Calculate score with behavioral boost enhancement
   */
  async calculateWithBehavioralBoost(
    input: CareerImpactCalculationInput,
    options: BehavioralScoringOptions = {}
  ): Promise<CareerImpactScore> {
    const { event: _event, careerProfile: _careerProfile } = input;

    // Check if behavioral boost is enabled
    const shouldApplyBoost =
      isBehavioralBoostEnabled() &&
      options.enableBehavioralBoost !== false &&
      options.userId &&
      options.supabaseClient;

    if (!shouldApplyBoost) {
      // Use base strategy without enhancement
      return this.baseStrategy.calculate(input, options);
    }

    try {
      // Get user's interaction history
      const interactedEvents = await getUserInteractedEvents(
        options.userId!,
        options.supabaseClient!,
        30 // 30 days
      );

      // Get user context for behavioral boost
      const userContext = await BehavioralAnalyticsService.getUserContext(
        options.userId!,
        options.supabaseClient!
      );

      // Calculate behavioral boost with context
      const behavioralBoost = await BehavioralBoostService.calculateBehavioralBoost(
        options.userId!,
        input.event,
        interactedEvents,
        options.supabaseClient!,
        userContext || undefined
      );

      // Get base score from strategy
      const baseScore = await this.baseStrategy.calculate(input, options);

      // Apply behavioral boost
      const enhancedScore: CareerImpactScore = {
        ...baseScore,
        overall: Math.min(100, Math.max(0, baseScore.overall + behavioralBoost.boost)),
        metadata: {
          ...baseScore.metadata,
          // Add behavioral boost info to appliedAdjustments
          appliedAdjustments: {
            ...baseScore.metadata.appliedAdjustments,
            behavioralBoost: behavioralBoost.boost,
            behavioralSimilarEvents: behavioralBoost.similarities.map(s => s.eventId)
          }
        }
      };

      return enhancedScore;

    } catch (error) {
      console.warn('Behavioral boost enhancement failed, falling back to base strategy:', error);

      // Fallback to base strategy
      return this.baseStrategy.calculate(input, options);
    }
  }

  /**
   * Calculate scores for multiple events with behavioral boost
   */
  async calculateBatchWithBehavioralBoost(
    events: Event[],
    careerProfile: CareerProfile,
    options: BehavioralScoringOptions = {}
  ): Promise<Array<{ event: Event; score: CareerImpactScore }>> {
    // Check if behavioral boost is enabled
    const shouldApplyBoost =
      isBehavioralBoostEnabled() &&
      options.enableBehavioralBoost !== false &&
      options.userId &&
      options.supabaseClient;

    if (!shouldApplyBoost) {
      // Use base strategy without enhancement
      const scorePromises = events.map(async (event) => {
        const score = await this.baseStrategy.calculate(
          { event, careerProfile },
          options
        );
        return { event, score };
      });
      return Promise.all(scorePromises);
    }

    try {
      // Get interaction history and user context once for all events
      const [interactedEvents, userContext] = await Promise.all([
        getUserInteractedEvents(options.userId!, options.supabaseClient!, 30),
        BehavioralAnalyticsService.getUserContext(options.userId!, options.supabaseClient!)
      ]);

      // Calculate scores in parallel with behavioral boost
      const scorePromises = events.map(async (event) => {
        // Get base score
        const baseScore = await this.baseStrategy.calculate(
          { event, careerProfile },
          options
        );

        // Calculate behavioral boost
        const behavioralBoost = await BehavioralBoostService.calculateBehavioralBoost(
          options.userId!,
          event,
          interactedEvents,
          options.supabaseClient!,
          userContext || undefined
        );

        // Apply boost
        const enhancedScore: CareerImpactScore = {
          ...baseScore,
          overall: Math.min(100, Math.max(0, baseScore.overall + behavioralBoost.boost)),
          metadata: {
            ...baseScore.metadata,
            // Add behavioral boost info to appliedAdjustments
            appliedAdjustments: {
              ...baseScore.metadata.appliedAdjustments,
              behavioralBoost: behavioralBoost.boost,
              behavioralSimilarEvents: behavioralBoost.similarities.map(s => s.eventId)
            }
          }
        };

        return { event, score: enhancedScore };
      });

      return Promise.all(scorePromises);

    } catch (error) {
      console.warn('Behavioral boost enhancement failed for batch scoring, falling back to base strategy:', error);
      
      // Fallback to base strategy
      const scorePromises = events.map(async (event) => {
        const score = await this.baseStrategy.calculate(
          { event, careerProfile },
          options
        );
        return { event, score };
      });
      return Promise.all(scorePromises);
    }
  }

  /**
   * Get the underlying strategy
   */
  getBaseStrategy(): ScoringStrategy {
    return this.baseStrategy;
  }

  /**
   * Check if behavioral boost would be applied for given options
   */
  static wouldApplyBehavioralBoost(options: BehavioralScoringOptions): boolean {
    return (
      isBehavioralBoostEnabled() &&
      options.enableBehavioralBoost !== false &&
      !!options.userId &&
      !!options.supabaseClient
    );
  }
}

/**
 * Factory function to create enhanced scorer with behavioral boost
 */
export function createBehavioralEnhancedScorer(baseStrategy: ScoringStrategy): BehavioralScoringEnhancer {
  return new BehavioralScoringEnhancer(baseStrategy);
}

/**
 * Simple helper for one-off enhanced scoring
 */
export async function scoreEventWithBehavioralBoost(
  event: Event,
  careerProfile: CareerProfile,
  baseStrategy: ScoringStrategy,
  options: BehavioralScoringOptions
): Promise<CareerImpactScore> {
  const enhancer = new BehavioralScoringEnhancer(baseStrategy);
  return enhancer.calculateWithBehavioralBoost({ event, careerProfile }, options);
}