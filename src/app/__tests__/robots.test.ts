import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import { SITE_URL } from '@/config/site';

describe('robots', () => {
  it('disallows protected route prefixes in production', () => {
    const originalEnv = process.env.VERCEL_ENV;
    try {
      process.env.VERCEL_ENV = 'production';

      const config = robots();
      const rootRule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
      const disallow = Array.isArray(rootRule.disallow) ? rootRule.disallow : [];

      expect(config.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
      expect(disallow).toEqual(
        expect.arrayContaining([
          '/api/',
          '/onboarding/',
          '/dashboard/',
          '/calendar/',
          '/discover/',
          '/hackathons/',
          '/settings/',
        ])
      );
    } finally {
      process.env.VERCEL_ENV = originalEnv;
    }
  });

  it('blocks all crawlers outside production', () => {
    const originalEnv = process.env.VERCEL_ENV;
    try {
      process.env.VERCEL_ENV = 'preview';

      const config = robots();
      const rootRule = Array.isArray(config.rules) ? config.rules[0] : config.rules;

      expect(rootRule.disallow).toEqual(['/']);
    } finally {
      process.env.VERCEL_ENV = originalEnv;
    }
  });
});
