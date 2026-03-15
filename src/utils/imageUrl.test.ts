import { describe, expect, it } from 'vitest';
import { appendImageVersion, getSafeImageSrc, getVersionedImageSrc } from './imageUrl';

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
});
