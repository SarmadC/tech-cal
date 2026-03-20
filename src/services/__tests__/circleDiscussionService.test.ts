import { describe, expect, it } from 'vitest';
import {
  buildCircleEventFilterTags,
  scoreCircleEventRelevance,
  type CircleSummary,
} from '@/services/circleDiscussionService';

function createCircle(overrides: Partial<CircleSummary> = {}): CircleSummary {
  return {
    id: 'circle-1',
    slug: 'ai-builders',
    name: 'AI Builders',
    description: '',
    memberCount: 0,
    ...overrides,
  };
}

describe('CircleDiscussionService event matching', () => {
  it('expands compound circle slugs into relevant event filter tags', () => {
    const filterTags = buildCircleEventFilterTags(createCircle());

    expect(filterTags).toContain('ai');
    expect(filterTags).toContain('artificial intelligence');
    expect(filterTags).toContain('machine learning');
    expect(filterTags).not.toContain('builders');
  });

  it('ranks topic-matched events above generic keyword overlap', () => {
    const circle = createCircle();
    const filterTags = buildCircleEventFilterTags(circle);

    const aiEventScore = scoreCircleEventRelevance(
      circle,
      {
        title: 'AI Demo Night',
        description: 'Hands-on machine learning workshop for local founders.',
        tags: ['ai', 'machine learning'],
      },
      filterTags
    );

    const genericBuilderEventScore = scoreCircleEventRelevance(
      circle,
      {
        title: 'Community Builders Meetup',
        description: 'A meetup for local organizers and volunteer leaders.',
        tags: ['community'],
      },
      filterTags
    );

    expect(aiEventScore).toBeGreaterThan(0);
    expect(genericBuilderEventScore).toBe(0);
    expect(aiEventScore).toBeGreaterThan(genericBuilderEventScore);
  });
});
