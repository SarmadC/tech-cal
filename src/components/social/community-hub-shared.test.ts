import { describe, expect, it } from 'vitest';
import {
  formatCommunityCircleName,
  getCommunityCircleColor,
  getCommunityCircleTextColor,
  partitionCommunityCirclesForDisplay,
} from '@/components/social/community-hub-shared';

describe('community-hub-shared', () => {
  it('returns stable accent classes for equivalent circle labels', () => {
    expect(getCommunityCircleColor('AI Builders')).toBe(getCommunityCircleColor('AI Builders'));
    expect(getCommunityCircleTextColor('AI Builders')).toBe(
      getCommunityCircleTextColor('AI Builders')
    );
    expect(getCommunityCircleColor('AI Builders')).toBe(getCommunityCircleColor('AI Circle'));
    expect(getCommunityCircleTextColor('AI Builders')).toBe(
      getCommunityCircleTextColor('AI Circle')
    );
  });

  it('returns a text accent class for circle labels', () => {
    expect(getCommunityCircleTextColor('AI Builders')).toMatch(/^text-/);
    expect(getCommunityCircleTextColor('Product Systems')).toContain('dark:text-');
  });

  it('assigns distinct semantic accent colors for common circle topics', () => {
    expect(getCommunityCircleColor('Community Led Growth')).not.toBe(
      getCommunityCircleColor('Product Systems')
    );
    expect(getCommunityCircleColor('Product Systems')).not.toBe(
      getCommunityCircleColor('Platform Ops')
    );
    expect(getCommunityCircleColor('Community Led Growth')).not.toBe(
      getCommunityCircleColor('Platform Ops')
    );
  });

  it('normalizes equivalent community suffixes for display', () => {
    expect(formatCommunityCircleName('AI Circle')).toBe('AI');
    expect(formatCommunityCircleName('Product Circle')).toBe('Product');
    expect(formatCommunityCircleName('AI Builders')).toBe('AI');
    expect(formatCommunityCircleName('Design Systems Guild')).toBe('Design Systems');
  });

  it('dedupes circles by canonical display name and prefers joined entries', () => {
    const { joinedCircles, discoverCircles } = partitionCommunityCirclesForDisplay([
      { id: 'joined-ai', name: 'AI Circle', isJoined: true },
      { id: 'discover-ai', name: 'AI Builders', isJoined: false },
      { id: 'discover-product', name: 'Product Circle', isJoined: false },
    ]);

    expect(joinedCircles).toEqual([{ id: 'joined-ai', name: 'AI Circle', isJoined: true }]);
    expect(discoverCircles).toEqual([
      { id: 'discover-product', name: 'Product Circle', isJoined: false },
    ]);
  });

  it('merges product circle variants into one inline community concept', () => {
    const { joinedCircles, discoverCircles } = partitionCommunityCirclesForDisplay([
      { id: 'discover-product-systems', name: 'Product Systems', isJoined: false },
      { id: 'discover-product', name: 'Product Circle', isJoined: false },
    ]);

    expect(joinedCircles).toEqual([]);
    expect(discoverCircles).toEqual([
      { id: 'discover-product-systems', name: 'Product Systems', isJoined: false },
    ]);
  });
});
