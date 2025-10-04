// src/services/scoring/strategies/__tests__/DeterministicV2Strategy.logging.test.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DeterministicV2Strategy } from '../DeterministicV2Strategy';

// Minimal stubs to satisfy calculate()
const event = {
  id: 'evt_1',
  title: 'Intro to React Workshop',
  description: 'A beginner friendly hands-on workshop',
  category: { name: 'workshop' },
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
};

const careerProfile = {
  userId: 'u1',
  profileId: 'p1',
  lastUpdated: new Date().toISOString(),
  currentRole: 'Frontend Engineer',
  seniority: 'junior',
  industry: 'technology',
  companySize: 'startup',
  primarySkills: ['JavaScript', 'HTML', 'CSS'],
  skillsToLearn: ['React'],
  interests: ['Web Development'],
  careerGoals: ['skill-development'],
  timeframe: 'short-term',
  learningStyle: ['hands-on'],
  availableTime: 'limited',
  budget: 'low',
  networkingGoals: [],
  preferredEventTypes: ['workshop']
};

describe('DeterministicV2Strategy logging (dev-only)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLogFlag = process.env.NEXT_PUBLIC_LOG_SCORING;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_LOG_SCORING = 'true';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXT_PUBLIC_LOG_SCORING = originalLogFlag;
    vi.restoreAllMocks();
  });

  it('emits console.debug with version and component keys when enabled', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const strategy = new DeterministicV2Strategy();
    const result = strategy.calculate({ event: event as any, careerProfile: careerProfile as any });

    // Two debug calls expected: ScoringStrategy + ScoringComponents
    expect(debugSpy).toHaveBeenCalled();
    const calls = debugSpy.mock.calls.map(args => args[1]).filter(Boolean);
    const payload = calls.find((p: any) => p && p.components);

    expect(payload).toBeDefined();
    expect(payload.version).toBe(strategy.version);
    expect(payload.components).toBeDefined();
    expect(typeof result.overall).toBe('number');
  });

  it('does not throw if logging disabled', () => {
    process.env.NEXT_PUBLIC_LOG_SCORING = 'false';
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const strategy = new DeterministicV2Strategy();
    const result = strategy.calculate({ event: event as any, careerProfile: careerProfile as any });

    expect(result).toBeDefined();
    // still calls the version debug, but not the components payload
    const calls = debugSpy.mock.calls.map(args => args[1]).filter(Boolean);
    const payload = calls.find((p: any) => p && p.components);
    expect(payload).toBeUndefined();
  });
});
