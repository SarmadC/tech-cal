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
    expect(mobileQueryKeys.community.root()).toEqual(['community']);
    expect(mobileQueryKeys.community.home()).toEqual(['community', 'home']);
    expect(mobileQueryKeys.community.circle('design-systems')).toEqual([
      'community',
      'circle',
      'design-systems',
    ]);
    expect(mobileQueryKeys.community.post('post-1')).toEqual([
      'community',
      'post',
      'post-1',
    ]);
    expect(mobileQueryKeys.community.feed()).toEqual(['community-feed']);
    expect(mobileQueryKeys.profile.root()).toEqual(['profile']);
    expect(mobileQueryKeys.profile.public('ada')).toEqual(['profile', 'public', 'ada']);
    expect(mobileQueryKeys.profile.followStatus('user-1')).toEqual([
      'profile',
      'follow-status',
      'user-1',
    ]);
    expect(mobileQueryKeys.subscription.status()).toEqual(['subscription-status']);
  });
});
