/**
 * Career Impact Service
 *
 * High-level service for calculating career impact scores.
 * Uses the Strategy pattern for flexible algorithm selection.
 *
 * This service provides:
 * - Synchronous and asynchronous score calculation
 * - Caching support for performance
 * - Batch processing
 * - Cache management
 * - Strategy selection (default or user-specific)
 */

import { CareerImpactScore } from '@/types';
import { CareerProfile } from '@/types/career';
import {
  CareerImpactCalculationInput,
  CareerImpactCalculationOptions,
  BatchCareerImpactInput,
  BatchCareerImpactResult,
  CareerImpactScoreLite
} from '@/types/careerImpact';
import { CareerImpactCache } from '@/services/cache/careerImpactCache';
import { ScoringStrategyFactory } from '@/services/scoring';

export class CareerImpactService {
  static readonly EMPTY_COMPONENTS = {
    skillRelevance: 0,
    careerStageMatch: 0,
    networkingValue: 0,
    industryRelevance: 0,
    timingBonus: 0
  };

  /**
   * Create cached score explanation
   */
  private static createCachedExplanation(category: string) {
    return {
      careerImpactCategory: category as 'transformative' | 'high' | 'moderate' | 'low',
      reasons: [`Cached result for ${category} impact event`],
      matchedSkills: [],
      speakerHighlights: [],
      confidenceFactors: [`${Math.round(0.9 * 100)}% confidence`]
    };
  }

  /**
   * Calculate career impact score with caching (async version)
   */
  static async calculateCareerImpactScoreAsync(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<CareerImpactScore> {
    const { event, careerProfile } = input;

    try {
      // Generate cache key
      const profileHash = CareerImpactCache.generateProfileHash(careerProfile);

      // Try cache first (unless explicitly skipped)
      if (!options.skipCache) {
        const cached = await CareerImpactCache.get(event.id, profileHash);
        if (cached) {
          // Get strategy to determine version
          const strategy = ScoringStrategyFactory.getDefaultStrategy();

          // Convert lite score to full score for compatibility
          return {
            overall: cached.overall,
            confidence: cached.confidence,
            components: this.EMPTY_COMPONENTS,
            explanation: this.createCachedExplanation(cached.category),
            metadata: {
              algorithmVersion: strategy.version,
              calculatedAt: new Date().toISOString(),
              careerProfileHash: profileHash,
              eventDataHash: CareerImpactCache.generateEventHash(event)
            }
          };
        }
      }
    } catch (error) {
      console.warn('Cache lookup failed, falling back to calculation:', error);
    }

    // Calculate and cache result
    const result = this.calculateCareerImpactScore(input, options);

    // Cache the lite version asynchronously (unless explicitly skipped)
    if (!options.skipCache) {
      const profileHash = CareerImpactCache.generateProfileHash(careerProfile);
      const lite: CareerImpactScoreLite = {
        overall: result.overall,
        confidence: result.confidence,
        category: result.explanation.careerImpactCategory
      };

      CareerImpactCache.set(event.id, profileHash, lite).catch(error => {
        console.warn('Cache set failed:', error);
      });
    }

    return result;
  }

  /**
   * Get lightweight career impact score with caching (async version)
   */
  static async getCareerImpactScoreLiteAsync(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<CareerImpactScoreLite> {
    const { event, careerProfile } = input;

    try {
      // Generate cache key
      const profileHash = CareerImpactCache.generateProfileHash(careerProfile);

      // Try cache first (unless explicitly skipped)
      if (!options.skipCache) {
        const cached = await CareerImpactCache.get(event.id, profileHash);
        if (cached) {
          return cached;
        }
      }
    } catch (error) {
      console.warn('Cache lookup failed, falling back to calculation:', error);
    }

    // Calculate and cache result
    const result = this.getCareerImpactScoreLite(input, options);

    // Cache result asynchronously (unless explicitly skipped)
    if (!options.skipCache) {
      const profileHash = CareerImpactCache.generateProfileHash(careerProfile);
      CareerImpactCache.set(event.id, profileHash, result).catch(error => {
        console.warn('Cache set failed:', error);
      });
    }

    return result;
  }

  /**
   * Calculate batch career impact scores for multiple events
   */
  static async calculateBatchCareerImpact(
    input: BatchCareerImpactInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<BatchCareerImpactResult> {
    // Use direct calculation for now (cache optimization will be added later)
    return this.calculateBatchCareerImpactDirect(input, options);
  }

  /**
   * Direct batch calculation without caching (fallback method)
   */
  private static calculateBatchCareerImpactDirect(
    input: BatchCareerImpactInput,
    options: CareerImpactCalculationOptions = {}
  ): BatchCareerImpactResult {
    const startTime = Date.now();
    const results = new Map<string, CareerImpactScore>();
    const errors: Array<{ eventId: string; error: string }> = [];

    for (const event of input.events) {
      try {
        const score = this.calculateCareerImpactScore(
          { event, careerProfile: input.careerProfile },
          options
        );
        results.set(event.id, score);
      } catch (error) {
        errors.push({
          eventId: event.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const endTime = Date.now();

    return {
      scores: results,
      errors,
      stats: {
        totalEvents: input.events.length,
        successfulCalculations: results.size,
        cachedScores: 0,
        newCalculations: results.size,
        processingTimeMs: endTime - startTime
      }
    };
  }

  /**
   * Cache invalidation methods for when data changes
   */
  static async invalidateProfileCache(careerProfile: CareerProfile): Promise<number> {
    try {
      const profileHash = CareerImpactCache.generateProfileHash(careerProfile);
      return await CareerImpactCache.invalidateProfile(profileHash);
    } catch (error) {
      console.warn('Profile cache invalidation failed:', error);
      return 0;
    }
  }

  static async invalidateEventCache(eventId: string): Promise<number> {
    try {
      return await CareerImpactCache.invalidateEvent(eventId);
    } catch (error) {
      console.warn('Event cache invalidation failed:', error);
      return 0;
    }
  }

  static async invalidateAllCache(): Promise<number> {
    try {
      return await CareerImpactCache.invalidateAll();
    } catch (error) {
      console.warn('Full cache invalidation failed:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static async getCacheStats() {
    try {
      return await CareerImpactCache.getStats();
    } catch (error) {
      console.warn('Cache stats retrieval failed:', error);
      return { hits: 0, misses: 0, totalRequests: 0, hitRate: 0, lastReset: new Date().toISOString() };
    }
  }

  /**
   * Get lightweight career impact score (essential data only)
   */
  static getCareerImpactScoreLite(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): CareerImpactScoreLite {
    const fullScore = CareerImpactService.calculateCareerImpactScore(input, options);

    return {
      overall: fullScore.overall,
      confidence: fullScore.confidence,
      category: fullScore.explanation.careerImpactCategory
    };
  }

  /**
   * Calculate career impact score for an event
   *
   * This method uses the Strategy pattern to delegate calculation to the appropriate
   * scoring algorithm. By default, it uses the current production algorithm.
   *
   * To use a specific algorithm version:
   * ```typescript
   * calculateCareerImpactScore(input, { algorithmVersion: 'v2.0.0' })
   * ```
   */
  static calculateCareerImpactScore(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): CareerImpactScore {
    // Get the appropriate strategy
    const strategy = options.algorithmVersion
      ? ScoringStrategyFactory.getStrategy(options.algorithmVersion) || ScoringStrategyFactory.getDefaultStrategy()
      : ScoringStrategyFactory.getDefaultStrategy();

    // Delegate calculation to the strategy
    return strategy.calculate(input, options);
  }
}
