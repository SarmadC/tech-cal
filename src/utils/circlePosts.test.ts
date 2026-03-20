import { describe, expect, it } from 'vitest';
import {
  buildCirclePostPath,
  buildCirclePostSlug,
  extractCirclePostId,
  getCirclePostMetaDescription,
  getCirclePostMetaTitle,
} from '@/utils/circlePosts';

describe('circlePosts', () => {
  it('extracts the raw post id from canonical thread keys', () => {
    expect(
      extractCirclePostId('i-tossed-our-lightweight-eval-template--5f03b238-9e4e-57f2-b96f-85dc82b99f11')
    ).toBe('5f03b238-9e4e-57f2-b96f-85dc82b99f11');
  });

  it('keeps plain post ids unchanged for legacy urls', () => {
    expect(extractCirclePostId('post-1')).toBe('post-1');
  });

  it('builds reddit-style canonical paths from post content', () => {
    expect(
      buildCirclePostPath(
        'ai-builders',
        'post-1',
        'I tossed our lightweight eval template\nIt catches the ugly stuff faster.'
      )
    ).toBe('/circle/ai-builders/posts/i-tossed-our-lightweight-eval-template--post-1');
  });

  it('falls back to a generic slug when the post content is empty', () => {
    expect(buildCirclePostSlug('', 'post-1')).toBe('discussion--post-1');
  });

  it('builds metadata from the post content hierarchy', () => {
    expect(
      getCirclePostMetaTitle(
        'Shipping the next community layer\nWe finally have enough signal to make this useful.',
        'AI Builders'
      )
    ).toContain('Shipping the next community layer');
    expect(
      getCirclePostMetaDescription(
        'Shipping the next community layer\nWe finally have enough signal to make this useful.'
      )
    ).toContain('We finally have enough signal');
  });
});
