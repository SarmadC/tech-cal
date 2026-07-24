import { afterEach, describe, expect, it } from 'vitest';

import { GET, isAllowedSupabaseOAuthUrl } from './route';

const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

describe('GET /api/mobile/auth/google/start', () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_SUPABASE_URL;
  });

  it('redirects only to the configured Supabase authorize endpoint', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    const target =
      'https://project.supabase.co/auth/v1/authorize?provider=google&redirect_to=kurecal%3A%2F%2Fauth%2Fcallback';
    const response = await GET(
      new Request(
        `https://api.kurecal.test/api/mobile/auth/google/start?url=${encodeURIComponent(target)}`
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(target);
  });

  it('rejects lookalike hosts and unrelated same-origin paths', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';

    for (const target of [
      'https://project.supabase.co.evil.test/auth/v1/authorize',
      'https://project.supabase.co/storage/v1/object/public/file',
      'https://evil.test/auth/v1/authorize',
    ]) {
      const response = await GET(
        new Request(
          `https://api.kurecal.test/api/mobile/auth/google/start?url=${encodeURIComponent(target)}`
        )
      );
      expect(response.status).toBe(400);
    }
  });

  it('handles malformed target and Supabase URLs safely', () => {
    expect(
      isAllowedSupabaseOAuthUrl(
        'not-a-url',
        'https://project.supabase.co'
      )
    ).toBe(false);
    expect(
      isAllowedSupabaseOAuthUrl(
        'https://project.supabase.co/auth/v1/authorize',
        'not-a-url'
      )
    ).toBe(false);
  });
});
