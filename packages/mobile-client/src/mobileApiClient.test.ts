import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileApiClient } from './mobileApiClient';

describe('MobileApiClient social profile requests', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('uses the shared bearer-auth client path for /api/profile/social', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: '11111111-1111-4111-8111-111111111111',
            fullName: 'Alex',
            avatarUrl: null,
            username: 'alex',
            headline: 'Mobile engineer',
            profileVisibility: 'public',
            showAttendance: true,
            trustLevel: 2,
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    );

    const client = new MobileApiClient({
      baseUrl: 'https://api.example.com',
      getAccessToken: async () => 'mobile-access-token',
    });

    const result = await client.getSocialProfile();

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('/api/profile/social', 'https://api.example.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mobile-access-token',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result).toMatchObject({
      success: true,
      data: {
        username: 'alex',
      },
    });
  });
});
