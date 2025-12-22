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
 * - Result-based error handling (v2 methods)
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
import {
  Result,
  success,
  failure,
  failureFromError,
  RecommendationErrorCode,
  tryAsync,
  ResultMetadata,
} from '@/types/recommendationResult';
import * as Sentry from '@sentry/nextjs';

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
   * Try to get cached score (helper for async methods)
   */
  private static async _tryGetCached(
    eventId: string,
    careerProfile: CareerProfile,
    skipCache: boolean = false
  ): Promise<CareerImpactScoreLite | null> {
    if (skipCache) return null;

    try {
      const profileHash = CareerImpactCache.generateProfileHash(careerProfile);
      return await CareerImpactCache.get(eventId, profileHash);
    } catch (error) {
      console.warn('Cache lookup failed, falling back to calculation:', error);
      return null;
    }
  }

  /**
   * Cache score (helper for async methods)
   */
  private static _setCached(
    eventId: string,
    careerProfile: CareerProfile,
    lite: CareerImpactScoreLite,
    skipCache: boolean = false
  ): void {
    if (skipCache) return;

    const profileHash = CareerImpactCache.generateProfileHash(careerProfile);
    CareerImpactCache.set(eventId, profileHash, lite).catch(error => {
      console.warn('Cache set failed:', error);
    });
  }

  /**
   * Calculate career impact score with caching (async version)
   */
  static async calculateCareerImpactScoreAsync(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<CareerImpactScore> {
    const { event, careerProfile } = input;

    // Try cache first
    const cached = await this._tryGetCached(event.id, careerProfile, options.skipCache);
    if (cached) {
      const strategy = ScoringStrategyFactory.getDefaultStrategy();
      const profileHash = CareerImpactCache.generateProfileHash(careerProfile);

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

    // Calculate result
    const result = await this.calculateCareerImpactScore(input, options);

    // Cache the lite version
    const lite: CareerImpactScoreLite = {
      overall: result.overall,
      confidence: result.confidence,
      category: result.explanation.careerImpactCategory
    };
    this._setCached(event.id, careerProfile, lite, options.skipCache);

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

    // Try cache first
    const cached = await this._tryGetCached(event.id, careerProfile, options.skipCache);
    if (cached) {
      return cached;
    }

    // Calculate result
    const result = await this.getCareerImpactScoreLite(input, options);

    // Cache result
    this._setCached(event.id, careerProfile, result, options.skipCache);

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
    return await this.calculateBatchCareerImpactDirect(input, options);
  }

  /**
   * Direct batch calculation without caching (fallback method)
   */
  private static async calculateBatchCareerImpactDirect(
    input: BatchCareerImpactInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<BatchCareerImpactResult> {
    const startTime = Date.now();
    const results = new Map<string, CareerImpactScore>();
    const errors: Array<{ eventId: string; error: string }> = [];

    for (const event of input.events) {
      try {
        const score = await this.calculateCareerImpactScore(
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
   * Core calculation method (private) - single source of truth
   */
  private static async _calculateScore(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<CareerImpactScore> {
    const strategy = options.algorithmVersion
      ? ScoringStrategyFactory.getStrategy(options.algorithmVersion) || ScoringStrategyFactory.getDefaultStrategy()
      : ScoringStrategyFactory.getDefaultStrategy();

    return await strategy.calculate(input, options);
  }

  /**
   * Get lightweight career impact score (essential data only)
   */
  static async getCareerImpactScoreLite(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<CareerImpactScoreLite> {
    const fullScore = await this._calculateScore(input, options);

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
  static async calculateCareerImpactScore(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<CareerImpactScore> {
    return await this._calculateScore(input, options);
  }

  // ============================================
  // RESULT-BASED METHODS (v2 API)
  // ============================================

  /**
   * Calculate career impact score with Result-based error handling
   * 
   * Returns a Result<CareerImpactScore> for type-safe error handling.
   * Use this method when you want explicit error handling without exceptions.
   */
  static async calculateScoreWithResult(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<Result<CareerImpactScore>> {
    const startTime = Date.now();

    // Input validation
    if (!input.event) {
      return failure(
        RecommendationErrorCode.INVALID_EVENT,
        'Event is required for score calculation',
        { input: { hasEvent: false } }
      );
    }

    if (!input.careerProfile) {
      return failure(
        RecommendationErrorCode.INVALID_PROFILE,
        'Career profile is required for score calculation',
        { input: { hasProfile: false } }
      );
    }

    // Check if profile has minimum required data
    const profile = input.careerProfile;
    const hasMinimumData = 
      (profile.primarySkills?.length || 0) > 0 ||
      (profile.interests?.length || 0) > 0 ||
      profile.currentRole;

    if (!hasMinimumData) {
      return failure(
        RecommendationErrorCode.INSUFFICIENT_DATA,
        'Career profile needs at least one skill, interest, or role',
        { 
          primarySkillsCount: profile.primarySkills?.length || 0,
          interestsCount: profile.interests?.length || 0,
          hasRole: !!profile.currentRole 
        }
      );
    }

    // Perform calculation with error handling
    const result = await tryAsync(
      async () => this._calculateScore(input, options),
      RecommendationErrorCode.SCORING_FAILED
    );

    const duration = Date.now() - startTime;

    // Add metadata to successful results
    if (result.success) {
      const strategy = ScoringStrategyFactory.getDefaultStrategy();
      const metadata: ResultMetadata = {
        duration,
        cached: false,
        algorithm: strategy.version,
      };

      return success(result.data, metadata);
    }

    // Log errors to Sentry for monitoring
    this._logError('calculateScoreWithResult', result.error, {
      eventId: input.event.id,
      profileId: input.careerProfile.userId,
      duration,
    });

    return result;
  }

  /**
   * Get lightweight career impact score with Result-based error handling
   */
  static async getScoreLiteWithResult(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<Result<CareerImpactScoreLite>> {
    const startTime = Date.now();

    // Use cached version if available
    const cached = await this._tryGetCached(
      input.event.id,
      input.careerProfile,
      options.skipCache
    );

    if (cached) {
      return success(cached, {
        duration: Date.now() - startTime,
        cached: true,
      });
    }

    // Calculate full score and extract lite version
    const fullResult = await this.calculateScoreWithResult(input, options);

    if (!fullResult.success) {
      return fullResult; // Propagate error
    }

    const lite: CareerImpactScoreLite = {
      overall: fullResult.data.overall,
      confidence: fullResult.data.confidence,
      category: fullResult.data.explanation.careerImpactCategory,
    };

    // Cache the result
    this._setCached(input.event.id, input.careerProfile, lite, options.skipCache);

    return success(lite, {
      duration: Date.now() - startTime,
      cached: false,
      algorithm: fullResult.metadata?.algorithm,
    });
  }

  /**
   * Calculate batch career impact scores with Result-based error handling
   * Returns individual results for each event, allowing partial success
   */
  static async calculateBatchWithResult(
    input: BatchCareerImpactInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<Result<Map<string, Result<CareerImpactScore>>>> {
    const startTime = Date.now();

    if (!input.events || input.events.length === 0) {
      return failure(
        RecommendationErrorCode.NO_EVENTS_FOUND,
        'No events provided for batch calculation'
      );
    }

    if (!input.careerProfile) {
      return failure(
        RecommendationErrorCode.INVALID_PROFILE,
        'Career profile is required for batch calculation'
      );
    }

    const results = new Map<string, Result<CareerImpactScore>>();

    for (const event of input.events) {
      const result = await this.calculateScoreWithResult(
        { event, careerProfile: input.careerProfile },
        options
      );
      results.set(event.id, result);
    }

    const successCount = Array.from(results.values()).filter(r => r.success).length;
    const duration = Date.now() - startTime;

    return success(results, {
      duration,
      candidateCount: input.events.length,
    });
  }

  // ============================================
  // ERROR LOGGING HELPERS
  // ============================================

  /**
   * Log error to Sentry with context
   */
  private static _logError(
    operation: string,
    error: { code: string; message: string; details?: Record<string, unknown> },
    context: Record<string, unknown>
  ): void {
    try {
      Sentry.captureException(new Error(`${operation}: ${error.message}`), {
        tags: {
          errorCode: error.code,
          operation,
        },
        extra: {
          ...context,
          ...error.details,
        },
      });
    } catch {
      // Fail silently if Sentry is not available
      console.error(`[CareerImpactService] ${operation} failed:`, error.message, context);
    }
  }

  /**
   * Log warning for cache-related issues
   */
  private static _logCacheWarning(
    operation: string,
    error: unknown,
    context?: Record<string, unknown>
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[CareerImpactService] ${operation}:`, message, context);

    try {
      Sentry.addBreadcrumb({
        category: 'cache',
        level: 'warning',
        message: `${operation}: ${message}`,
        data: context,
      });
    } catch {
      // Fail silently
    }
  }
}

