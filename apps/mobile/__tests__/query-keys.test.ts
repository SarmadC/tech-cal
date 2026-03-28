import { describe, expect, it } from '@jest/globals';
import { mobileQueryKeys } from '../lib/queryKeys';

describe('mobile query keys', () => {
  it('builds stable discover and event keys', () => {
    expect(
      mobileQueryKeys.discover.feed({
        rankingMode: 'best-match',
        searchTerm: 'ai',
        categories: ['conference'],
        tags: ['ml'],
        location: 'Remote',
        dateRange: { start: null, end: null },
        format: 'all',
        cost: 'all',
        page: 1,
      })
    ).toEqual([
      'discover-feed',
      {
        rankingMode: 'best-match',
        searchTerm: 'ai',
        categories: ['conference'],
        tags: ['ml'],
        location: 'Remote',
        dateRange: { start: null, end: null },
        format: 'all',
        cost: 'all',
        page: 1,
      },
    ]);

    expect(
      mobileQueryKeys.event.engagement(
        'user-1',
        'event-1'
      )
    ).toEqual(['event-engagement', 'user-1', 'event-1']);
  });

  it('uses prefix-friendly roots for invalidation', () => {
    expect(mobileQueryKeys.discover.root()).toEqual(['discover-feed']);
    expect(mobileQueryKeys.community.feed()).toEqual(['community-feed']);
    expect(mobileQueryKeys.subscription.status()).toEqual(['subscription-status']);
  });
});
