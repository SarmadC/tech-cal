/**
 * Strategy Pattern for Career Impact Scoring
 *
 * This interface defines the contract for all career impact scoring algorithms.
 * Implementations can use deterministic rules, machine learning models, or hybrid approaches.
 *
 * Benefits:
 * - Easy A/B testing via user_experiments table
 * - Algorithm versioning and comparison
 * - Swap algorithms without changing service layer
 * - Future-proof for ML-based scoring
 */

import { Event, CareerImpactScore } from '@/types';
import { CareerProfile } from '@/types/career';
import {
  CareerImpactCalculationInput,
  CareerImpactCalculationOptions,
  ScoringAlgorithmConfig
} from '@/types/careerImpact';

/**
 * Core interface for career impact scoring strategies
 */
export interface ScoringStrategy {
  /**
   * Unique version identifier (e.g., "v2.0.0", "ml-v1.0")
   */
  readonly version: string;

  /**
   * Human-readable name for the strategy
   */
  readonly name: string;

  /**
   * Calculate career impact score for an event
   *
   * @param input - Event and career profile data
   * @param options - Optional calculation parameters
   * @returns Complete career impact score with components and explanation
   */
  calculate(
    input: CareerImpactCalculationInput,
    options?: CareerImpactCalculationOptions
  ): CareerImpactScore;

  /**
   * Get the algorithm configuration used by this strategy
   *
   * @returns Algorithm config with weights, thresholds, and confidence factors
   */
  getConfig(): ScoringAlgorithmConfig;

  /**
   * Validate that this strategy can score the given input
   *
   * @param event - Event to score
   * @param careerProfile - User's career profile
   * @returns True if strategy can handle this input
   */
  canScore(event: Event, careerProfile: CareerProfile): boolean;
}

/**
 * Base abstract class providing common functionality for strategies
 */
export abstract class BaseScoringStrategy implements ScoringStrategy {
  abstract readonly version: string;
  abstract readonly name: string;

  abstract calculate(
    input: CareerImpactCalculationInput,
    options?: CareerImpactCalculationOptions
  ): CareerImpactScore;

  abstract getConfig(): ScoringAlgorithmConfig;

  /**
   * Default validation - can be overridden by specific strategies
   */
  canScore(event: Event, careerProfile: CareerProfile): boolean {
    // Basic validation: event and profile must exist
    if (!event?.id || !event?.title) {
      return false;
    }

    if (!careerProfile?.primarySkills && !careerProfile?.skillsToLearn) {
      return false;
    }

    return true;
  }

  /**
   * Utility: Round score to specified decimal places
   */
  protected roundDecimal(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Utility: Round score to nearest integer
   */
  protected roundScore(value: number): number {
    return Math.round(value);
  }

  /**
   * Utility: Clamp value between min and max
   */
  protected clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
