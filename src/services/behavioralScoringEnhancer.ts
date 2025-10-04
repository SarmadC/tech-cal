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

      // Enhanced options with behavioral data
      const enhancedOptions: CareerImpactCalculationOptions = {
        ...options,
        userId: options.userId,
        supabaseClient: options.supabaseClient,
        interactedEvents
      };

      // Use enhanced strategy
      return this.baseStrategy.calculate(input, enhancedOptions);

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
    // Get interaction history once for all events
    let interactedEvents: Event[] = [];
    if (options.userId && options.supabaseClient && isBehavioralBoostEnabled()) {
      try {
        interactedEvents = await getUserInteractedEvents(
          options.userId,
          options.supabaseClient,
          30
        );
      } catch (error) {
        console.warn('Failed to get interaction history for batch scoring:', error);
      }
    }

    const enhancedOptions: CareerImpactCalculationOptions = {
      ...options,
      userId: options.userId,
      supabaseClient: options.supabaseClient,
      interactedEvents
    };

    // Calculate scores in parallel
    const scorePromises = events.map(async (event) => {
      const score = await this.baseStrategy.calculate(
        { event, careerProfile },
        enhancedOptions
      );
      return { event, score };
    });

    return Promise.all(scorePromises);
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