import { describe, it, expect } from 'vitest';
import { BehavioralBoostService } from '../behavioralBoostService';
import { buildEvent } from '@/tests/factories/eventFactories';
import type { Event, SupabaseClientType } from '@/types';

type BehavioralBoostServicePrivate = {
  calculateEventSimilarities: (
    targetEvent: Event,
    interactedEvents: Event[]
  ) => Array<{ eventId: string; similarity: number; reason: string }>;
  calculateTimeSimilarity: (time1: string, time2: string) => number;
};

const serviceWithInternals = BehavioralBoostService as unknown as BehavioralBoostServicePrivate;

const mockSupabaseClient = {} as SupabaseClientType;

describe('BehavioralBoostService', () => {
  const baseEvent = buildEvent({
    id: 'event-a',
    title: 'React Workshop',
    eventTypeId: 'frontend',
    startTime: '2024-01-01T10:00:00.000Z',
    difficulty: 'beginner',
  });

  const similarEvent = buildEvent({
    id: 'event-b',
    title: 'Next.js Deep Dive',
    eventTypeId: 'frontend',
    startTime: '2024-01-02T11:00:00.000Z',
    difficulty: 'beginner',
  });

  const differentEvent = buildEvent({
    id: 'event-c',
    title: 'Finance Summit',
    eventTypeId: 'finance',
    startTime: '2024-01-10T08:00:00.000Z',
    difficulty: 'advanced',
  });

  describe('calculateBehavioralBoost', () => {
    it('returns zero boost when history is too small', async () => {
      const result = await BehavioralBoostService.calculateBehavioralBoost(
        'user-1',
        baseEvent,
        [similarEvent],
        mockSupabaseClient,
      );

      expect(result.boost).toBe(0);
      expect(result.similarities).toHaveLength(0);
    });

    it('returns capped boost when multiple similar events exist', async () => {
      const interactionHistory = Array.from({ length: 4 }, (_, index) =>
        buildEvent({
          id: `history-${index}`,
          eventTypeId: index % 2 === 0 ? 'frontend' : 'backend',
          startTime: `2024-01-0${index + 2}T10:00:00.000Z`,
          difficulty: 'beginner',
        }),
      );

      const result = await BehavioralBoostService.calculateBehavioralBoost(
        'user-2',
        baseEvent,
        interactionHistory,
        mockSupabaseClient,
      );

      expect(result.boost).toBeGreaterThanOrEqual(0);
      expect(result.boost).toBeLessThanOrEqual(15);
      expect(result.similarities.length).toBeLessThanOrEqual(3);
    });
  });

  describe('calculateEventSimilarities (private)', () => {
    it('scores similar events higher and provides reasons', () => {
      const similarities = serviceWithInternals.calculateEventSimilarities(baseEvent, [
        similarEvent,
        differentEvent,
      ]);

      expect(similarities[0].eventId).toBe(similarEvent.id);
      expect(similarities[0].similarity).toBeGreaterThan(similarities[1]?.similarity ?? 0);
      expect(similarities[0].reason).toContain('Same category');
    });
  });

  describe('calculateTimeSimilarity (private)', () => {
    it('detects similar start times', () => {
      const highSimilarity = serviceWithInternals.calculateTimeSimilarity(
        '2024-01-01T10:00:00.000Z',
        '2024-01-01T11:00:00.000Z',
      );
      const lowSimilarity = serviceWithInternals.calculateTimeSimilarity(
        '2024-01-01T10:00:00.000Z',
        '2024-01-01T18:00:00.000Z',
      );

      expect(highSimilarity).toBeGreaterThan(lowSimilarity);
    });
  });
});