import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CareerProfile, Event } from '@/types';

import {
  extractRecommendationScore,
  getEventDisplayScore,
  normalizeDisplayScore,
} from '../displayScore';

const mocks = vi.hoisted(() => ({
  calculateBaseScore: vi.fn(),
}));

vi.mock('@/lib/recommendation/baseScorer', () => ({
  calculateBaseScore: (...args: unknown[]) => mocks.calculateBaseScore(...args),
}));

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    title: 'Event',
    startTime: '2026-07-01T00:00:00.000Z',
    ...overrides,
  } as Event;
}

const careerProfile = { currentRole: 'Engineer' } as CareerProfile;

describe('normalizeDisplayScore', () => {
  it('returns null for absent or non-finite values', () => {
    expect(normalizeDisplayScore(null)).toBeNull();
    expect(normalizeDisplayScore(undefined)).toBeNull();
    expect(normalizeDisplayScore(Number.NaN)).toBeNull();
    expect(normalizeDisplayScore('82')).toBeNull();
  });

  it('scales 0-1 ratios to 0-100', () => {
    expect(normalizeDisplayScore(0.73)).toBe(73);
    expect(normalizeDisplayScore(1)).toBe(100);
  });

  it('clamps and rounds out-of-range values', () => {
    expect(normalizeDisplayScore(140)).toBe(100);
    expect(normalizeDisplayScore(-5)).toBe(0);
    expect(normalizeDisplayScore(86.6)).toBe(87);
  });
});

describe('extractRecommendationScore', () => {
  it('prefers alignmentScore over matchScore', () => {
    const event = buildEvent({
      recommendationMetadata: { alignmentScore: 73, matchScore: 87 },
    } as Partial<Event>);
    expect(extractRecommendationScore(event)).toBe(73);
  });

  it('falls back through matchScore, careerImpactLite, then careerImpact', () => {
    expect(
      extractRecommendationScore(
        buildEvent({ recommendationMetadata: { matchScore: 87 } } as Partial<Event>)
      )
    ).toBe(87);
    expect(
      extractRecommendationScore(
        buildEvent({ careerImpactLite: { overall: 64 } } as Partial<Event>)
      )
    ).toBe(64);
    expect(
      extractRecommendationScore(
        buildEvent({ careerImpact: { overall: 55 } } as Partial<Event>)
      )
    ).toBe(55);
  });

  it('returns null when no score is present', () => {
    expect(extractRecommendationScore(buildEvent())).toBeNull();
  });
});

describe('getEventDisplayScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calculateBaseScore.mockReturnValue({ overall: 42 });
  });

  it('returns the extracted score without consulting the base scorer', () => {
    const event = buildEvent({
      recommendationMetadata: { alignmentScore: 73 },
    } as Partial<Event>);
    expect(getEventDisplayScore(event, careerProfile)).toBe(73);
    expect(mocks.calculateBaseScore).not.toHaveBeenCalled();
  });

  it('falls back to calculateBaseScore when the chain yields nothing', () => {
    expect(getEventDisplayScore(buildEvent(), careerProfile)).toBe(42);
    expect(mocks.calculateBaseScore).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'event-1' }),
      careerProfile
    );
  });

  it('falls back to calculateBaseScore when the extracted score is 0', () => {
    const event = buildEvent({
      recommendationMetadata: { matchScore: 0 },
    } as Partial<Event>);
    expect(getEventDisplayScore(event, careerProfile)).toBe(42);
  });

  it('retries the base scorer with a null profile when it throws', () => {
    mocks.calculateBaseScore
      .mockImplementationOnce(() => {
        throw new Error('bad profile');
      })
      .mockReturnValueOnce({ overall: 31 });
    expect(getEventDisplayScore(buildEvent(), careerProfile)).toBe(31);
    expect(mocks.calculateBaseScore).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'event-1' }),
      null
    );
  });
});
