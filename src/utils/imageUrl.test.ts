import { describe, expect, it } from 'vitest';
import { appendImageVersion, getBrowserSafeImageSrc, getSafeImageSrc, getVersionedImageSrc } from './imageUrl';

describe('imageUrl utilities', () => {
  it('normalizes remote http URLs to https', () => {
    expect(getSafeImageSrc('http://example.com/logo.png')).toBe('https://example.com/logo.png');
  });

  it('appends a version parameter when one is provided', () => {
    expect(appendImageVersion('https://example.com/logo.png', '2026-03-15T00:45:30.645976+00:00')).toBe(
      'https://example.com/logo.png?v=2026-03-15T00%3A45%3A30.645976%2B00%3A00'
    );
  });

  it('returns a safe, versioned image src', () => {
    expect(getVersionedImageSrc('http://example.com/logo.png', 'abc123')).toBe(
      'https://example.com/logo.png?v=abc123'
    );
  });

  it('rewrites remote avatar urls through the Next image optimizer', () => {
    expect(getBrowserSafeImageSrc('https://example.com/avatar.png', { width: 80, quality: 70 })).toBe(
      '/_next/image?url=https%3A%2F%2Fexample.com%2Favatar.png&w=96&q=70'
    );
  });

  it('leaves root-relative image urls untouched', () => {
    expect(getBrowserSafeImageSrc('/avatars/local.png')).toBe('/avatars/local.png');
  });
});
