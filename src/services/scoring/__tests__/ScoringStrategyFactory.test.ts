// src/services/scoring/__tests__/ScoringStrategyFactory.test.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringStrategyFactory } from '../ScoringStrategyFactory';
import { DeterministicV2Strategy } from '../strategies/DeterministicV2Strategy';

describe('ScoringStrategyFactory', () => {
  beforeEach(() => {
    // Reset factory registry
    (ScoringStrategyFactory as any).clear();
  });

  it('returns default strategy when requested variant is missing', () => {
    const defaultStrategy = ScoringStrategyFactory.getDefaultStrategy();
    expect(defaultStrategy).toBeInstanceOf(DeterministicV2Strategy);

    const missing = ScoringStrategyFactory.getStrategy('v9.9.9');
    expect(missing).toBeUndefined();
  });

  it('can set a new default when version is registered', () => {
    // Register a fake variant by reusing DeterministicV2 and overriding version
    const variant = new DeterministicV2Strategy();
    (variant as any).version = 'v2.1.0';
    ScoringStrategyFactory.register(variant);

    const set = ScoringStrategyFactory.setDefaultVersion('v2.1.0');
    expect(set).toBe(true);
    expect(ScoringStrategyFactory.getDefaultVersion()).toBe('v2.1.0');

    const strategy = ScoringStrategyFactory.getDefaultStrategy();
    expect(strategy.version).toBe('v2.1.0');
  });

  it('refuses to set default to unknown version', () => {
    const set = ScoringStrategyFactory.setDefaultVersion('v8.8.8');
    expect(set).toBe(false);
    expect(ScoringStrategyFactory.getDefaultVersion()).toBe('v2.0.0');
  });
});


