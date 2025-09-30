/**
 * Career Impact Scoring - Strategy Pattern
 *
 * This module implements the Strategy pattern for career impact scoring algorithms.
 *
 * Key Components:
 * - ScoringStrategy: Interface defining the contract for all scoring algorithms
 * - BaseScoringStrategy: Abstract base class with common utilities
 * - ScoringStrategyFactory: Factory for creating and managing strategies
 * - DeterministicV2Strategy: Current production algorithm (v2.0.0)
 *
 * Usage:
 * ```typescript
 * import { ScoringStrategyFactory } from '@/services/scoring';
 *
 * // Get default strategy
 * const strategy = ScoringStrategyFactory.getDefaultStrategy();
 * const score = strategy.calculate({ event, careerProfile });
 *
 * // Get strategy for user (with A/B testing)
 * const userStrategy = await ScoringStrategyFactory.getStrategyForUser(userId, supabase);
 * const score = userStrategy.calculate({ event, careerProfile });
 * ```
 *
 * Adding New Strategies:
 * 1. Create new class extending BaseScoringStrategy
 * 2. Implement calculate() and getConfig() methods
 * 3. Register in ScoringStrategyFactory.initialize()
 * 4. Add to user_experiments table for A/B testing
 */

// Core interfaces and base classes
export type { ScoringStrategy } from './ScoringStrategy';
export { BaseScoringStrategy } from './ScoringStrategy';

// Factory for strategy management
export { ScoringStrategyFactory } from './ScoringStrategyFactory';

// Available strategies
export { DeterministicV2Strategy } from './strategies/DeterministicV2Strategy';
