import { describe, expect, it } from 'vitest';
import { getLogoUrlFromInput } from './logoUtils';

describe('logoUtils', () => {
  it('normalizes remote http logo URLs to https', () => {
    expect(
      getLogoUrlFromInput('http://static1.squarespace.com/static/logo.png?format=1500w')
    ).toBe('https://static1.squarespace.com/static/logo.png?format=1500w');
  });

  it('returns the primary generated logo source for domain inputs', () => {
    expect(getLogoUrlFromInput('example.com')).toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=128'
    );
  });
});
