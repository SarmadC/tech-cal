/**
 * Scoring Strategy Factory
 *
 * Centralized factory for creating and managing scoring strategies.
 * Supports:
 * - Strategy registration and retrieval
 * - A/B testing via user_experiments table
 * - Default strategy fallback
 * - Version-based strategy selection
 *
 * Usage:
 * ```typescript
 * // Get default strategy
 * const strategy = ScoringStrategyFactory.getDefaultStrategy();
 *
 * // Get specific version
 * const v2 = ScoringStrategyFactory.getStrategy('v2.0.0');
 *
 * // Get strategy for user (checks experiments)
 * const userStrategy = await ScoringStrategyFactory.getStrategyForUser(userId, supabase);
 * ```
 */

import { ScoringStrategy } from './ScoringStrategy';
import { DeterministicV2Strategy } from './strategies/DeterministicV2Strategy';
import { BehavioralScoringEnhancer } from '../behavioralScoringEnhancer';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

type SupabaseClientType = SupabaseClient<Database>;

/**
 * Factory for creating and managing scoring strategies
 */
export class ScoringStrategyFactory {
  private static strategies: Map<string, ScoringStrategy> = new Map();
  private static defaultStrategyVersion = 'v2.0.0';
  private static initialized = false;

  /**
   * Initialize the factory with all available strategies
   */
  private static initialize(): void {
    if (this.initialized) return;

    // Register all available strategies
    this.register(new DeterministicV2Strategy());

    // Conditionally register upcoming variants behind env flags
    try {
      if (process.env.NEXT_PUBLIC_ENABLE_SCORING_V210 === 'true') {
        // For now, reuse DeterministicV2Strategy with version label preserved
        // Future: create a dedicated class e.g., DeterministicV2_1_0
        const v210 = new DeterministicV2Strategy();
        (v210 as any).version = 'v2.1.0'; // eslint-disable-line @typescript-eslint/no-explicit-any
        this.register(v210);
      }
      if (process.env.NEXT_PUBLIC_ENABLE_SCORING_V220 === 'true') {
        const v220 = new DeterministicV2Strategy();
        (v220 as any).version = 'v2.2.0'; // eslint-disable-line @typescript-eslint/no-explicit-any
        this.register(v220);
      }
      if (process.env.NEXT_PUBLIC_ENABLE_SCORING_V230 === 'true') {
        const v230 = new DeterministicV2Strategy();
        (v230 as any).version = 'v2.3.0'; // eslint-disable-line @typescript-eslint/no-explicit-any
        this.register(v230);
      }
    } catch {
      // no-op if env access fails in some contexts
    }

    // Future strategies can be added here:
    // this.register(new MLBasedV3Strategy());
    // this.register(new HybridV4Strategy());

    // Optionally set default version via env if registered
    try {
      const desiredDefault = process.env.NEXT_PUBLIC_SCORING_DEFAULT_VERSION;
      if (desiredDefault && this.strategies.has(desiredDefault)) {
        this.defaultStrategyVersion = desiredDefault;
        // eslint-disable-next-line no-console
        console.log(`Default scoring strategy set from env: ${desiredDefault}`);
      }
    } catch {
      // no-op
    }

    this.initialized = true;
  }

  /**
   * Register a scoring strategy
   *
   * @param strategy - Strategy instance to register
   */
  static register(strategy: ScoringStrategy): void {
    this.strategies.set(strategy.version, strategy);
  }

  /**
   * Get a strategy by version
   *
   * @param version - Version string (e.g., 'v2.0.0')
   * @returns Strategy instance or undefined if not found
   */
  static getStrategy(version: string): ScoringStrategy | undefined {
    this.initialize();
    return this.strategies.get(version);
  }

  /**
   * Get the default scoring strategy
   *
   * @returns Default strategy instance
   */
  static getDefaultStrategy(): ScoringStrategy {
    this.initialize();
    const strategy = this.strategies.get(this.defaultStrategyVersion);

    if (!strategy) {
      throw new Error(`Default strategy ${this.defaultStrategyVersion} not found`);
    }

    return strategy;
  }

  /**
   * Get strategy for a specific user, considering A/B testing experiments
   *
   * This method:
   * 1. Checks if user has an experiment assignment
   * 2. Returns corresponding strategy if experiment exists
   * 3. Falls back to default strategy if no experiment or strategy not found
   *
   * @param userId - User ID to check for experiments
   * @param supabaseClient - Supabase client for database queries
   * @param experimentName - Name of the experiment (default: 'career_impact_scoring')
   * @returns Strategy instance for the user
   */
  static async getStrategyForUser(
    userId: string,
    supabaseClient: SupabaseClientType,
    experimentName: string = 'career_impact_scoring'
  ): Promise<ScoringStrategy> {
    this.initialize();

    try {
      // Check for experiment assignment
      const { data: experiment, error } = await supabaseClient
        .from('user_experiments')
        .select('variant')
        .eq('user_id', userId)
        .eq('experiment_name', experimentName)
        .maybeSingle();

      if (error) {
        console.warn(`Failed to fetch experiment for user ${userId}:`, error);
        return this.getDefaultStrategy();
      }

      if (experiment?.variant) {
        // User has an experiment assignment
        const strategy = this.getStrategy(experiment.variant);

        if (strategy) {
          console.log(`Using experimental strategy ${experiment.variant} for user ${userId}`);
          return strategy;
        } else {
          console.warn(`Strategy ${experiment.variant} not found, using default`);
          return this.getDefaultStrategy();
        }
      }

      // No experiment assignment, use default
      return this.getDefaultStrategy();

    } catch (error) {
      console.error('Error fetching strategy for user:', error);
      return this.getDefaultStrategy();
    }
  }

  /**
   * Assign a user to an experiment variant
   *
   * @param userId - User ID to assign
   * @param variant - Strategy version to assign (e.g., 'v2.0.0')
   * @param supabaseClient - Supabase client for database queries
   * @param experimentName - Name of the experiment (default: 'career_impact_scoring')
   * @returns True if assignment successful, false otherwise
   */
  static async assignUserToExperiment(
    userId: string,
    variant: string,
    supabaseClient: SupabaseClientType,
    experimentName: string = 'career_impact_scoring'
  ): Promise<boolean> {
    this.initialize();

    // Validate that the variant exists
    if (!this.strategies.has(variant)) {
      console.warn(`Cannot assign user to unknown variant: ${variant}`);
      return false;
    }

    try {
      const { error } = await supabaseClient
        .from('user_experiments')
        .upsert({
          user_id: userId,
          experiment_name: experimentName,
          variant: variant
        }, {
          onConflict: 'user_id,experiment_name'
        });

      if (error) {
        console.error('Failed to assign user to experiment:', error);
        return false;
      }

      console.log(`Assigned user ${userId} to variant ${variant}`);
      return true;

    } catch (error) {
      console.error('Error assigning user to experiment:', error);
      return false;
    }
  }

  /**
   * Get all registered strategy versions
   *
   * @returns Array of available strategy versions
   */
  static getAvailableVersions(): string[] {
    this.initialize();
    return Array.from(this.strategies.keys());
  }

  /**
   * Get all registered strategies
   *
   * @returns Array of strategy instances
   */
  static getAllStrategies(): ScoringStrategy[] {
    this.initialize();
    return Array.from(this.strategies.values());
  }

  /**
   * Get enhanced behavioral strategy for a user
   * 
   * This wraps the base strategy with behavioral boost capabilities
   * 
   * @param userId - User ID for behavioral context
   * @param supabaseClient - Supabase client for data access
   * @returns Enhanced strategy with behavioral boosts
   */
  static getEnhancedBehavioralStrategy(
    _userId: string,
    _supabaseClient: SupabaseClientType
  ): BehavioralScoringEnhancer {
    this.initialize();
    const baseStrategy = this.getDefaultStrategy();
    return new BehavioralScoringEnhancer(baseStrategy);
  }

  /**
   * Set the default strategy version
   *
   * @param version - Version to set as default
   * @returns True if successful, false if version not found
   */
  static setDefaultVersion(version: string): boolean {
    this.initialize();

    if (!this.strategies.has(version)) {
      console.warn(`Cannot set unknown version as default: ${version}`);
      return false;
    }

    this.defaultStrategyVersion = version;
    console.log(`Default strategy version set to: ${version}`);
    return true;
  }

  /**
   * Get the current default strategy version
   *
   * @returns Current default version string
   */
  static getDefaultVersion(): string {
    return this.defaultStrategyVersion;
  }

  /**
   * Clear all registered strategies (useful for testing)
   */
  static clear(): void {
    this.strategies.clear();
    this.initialized = false;
  }
}
