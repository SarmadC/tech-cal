import { describe, expect, it } from 'vitest';

import { getRecommendationScoreForTopPicks, selectSharedTopPickEvents } from './topPicks';

function buildEvent(
  id: string,
  options: Partial<{
    alignmentScore: number;
    matchScore: number;
    organizer: string;
    eventTypeId: string;
    startTime: string;
    title: string;
  }> = {}
) {
  return {
    id,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    title: options.title ?? `Event ${id}`,
    description: `Description for ${id}`,
    organizer: options.organizer ?? 'KureCal',
    location: 'Edmonton',
    status: 'confirmed',
    startTime: options.startTime ?? '2099-04-12T18:00:00.000Z',
    endTime: options.startTime ?? '2099-04-12T20:00:00.000Z',
    sourceUrl: 'https://example.com',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/register',
    eventTypeId: options.eventTypeId ?? 'meetup',
    eventFormat: 'Hybrid',
    priceMin: 0,
    priceRange: 'Free',
    eventImageUrl: null,
    organization: {
      id: `org-${options.organizer ?? 'KureCal'}`,
      name: options.organizer ?? 'KureCal',
      logo: null,
    },
    category: {
      id: options.eventTypeId ?? 'meetup',
      name: 'Category',
      color: '#0ea5e9',
      description: null,
    },
    tags: [],
    recommendationMetadata: {
      alignmentScore: options.alignmentScore,
      matchScore: options.matchScore,
    },
  };
}

describe('shared mobile top picks', () => {
  it('normalizes fractional recommendation scores to percent', () => {
    const event = buildEvent('event-fractional', { matchScore: 0.87 });

    expect(getRecommendationScoreForTopPicks(event as never)).toBe(87);
  });

  it('filters low-score events and preserves stable ordering by score, date, and id', () => {
    const selected = selectSharedTopPickEvents([
      buildEvent('event-b', {
        alignmentScore: 80,
        startTime: '2099-04-12T18:00:00.000Z',
      }) as never,
      buildEvent('event-a', {
        alignmentScore: 80,
        startTime: '2099-04-12T18:00:00.000Z',
      }) as never,
      buildEvent('event-c', {
        alignmentScore: 55,
      }) as never,
      buildEvent('event-d', {
        alignmentScore: 92,
        startTime: '2099-04-15T18:00:00.000Z',
      }) as never,
    ]);

    expect(selected.map((event) => event.id)).toEqual(['event-d', 'event-a', 'event-b']);
  });

  it('diversifies the first viewport by organizer and category and caps the result at three', () => {
    const selected = selectSharedTopPickEvents([
      buildEvent('event-1', {
        alignmentScore: 95,
        organizer: 'Org A',
        eventTypeId: 'meetup',
      }) as never,
      buildEvent('event-2', {
        alignmentScore: 93,
        organizer: 'Org A',
        eventTypeId: 'meetup',
      }) as never,
      buildEvent('event-3', {
        alignmentScore: 91,
        organizer: 'Org B',
        eventTypeId: 'conference',
      }) as never,
      buildEvent('event-4', {
        alignmentScore: 89,
        organizer: 'Org C',
        eventTypeId: 'workshop',
      }) as never,
    ]);

    expect(selected.map((event) => event.id)).toEqual(['event-1', 'event-3', 'event-4']);
  });
});
