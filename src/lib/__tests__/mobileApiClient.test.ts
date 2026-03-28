import { afterEach, describe, expect, it, vi } from 'vitest';
import { MobileApiClient } from '@kurecal/mobile-client';

describe('MobileApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a structured error when the server responds with HTML', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<!DOCTYPE html><html><body>Page Not Found</body></html>', {
          status: 404,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        })
      )
    );

    const client = new MobileApiClient({
      baseUrl: 'http://localhost:3000',
      getAccessToken: async () => null,
    });

    const result = await client.getDiscoverFeed();

    expect(result).toMatchObject({
      success: false,
      error: 'Expected JSON response but received text/html; charset=utf-8 (404)',
    });
    expect(result.message).toContain('<!DOCTYPE html>');
  });
});
