import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  checkUsernameAvailability: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/socialProfileService', () => ({
  SocialProfileService: {
    checkUsernameAvailability: (...args: unknown[]) =>
      mocks.checkUsernameAvailability(...args),
  },
}));

describe('/api/mobile/profile/username-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.checkUsernameAvailability.mockResolvedValue({
      username: 'ada',
      available: true,
      message: 'Username is available.',
    });
  });

  it('checks availability with bearer-authenticated user context', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/profile/username-check?q=ada', {
        headers: { Authorization: 'Bearer token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.checkUsernameAvailability).toHaveBeenCalledWith(
      'ada',
      'user-1',
      {}
    );
    expect(payload.data.available).toBe(true);
  });

  it('rejects missing username queries', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/profile/username-check')
    );

    expect(response.status).toBe(400);
  });

  it('requires authentication', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/profile/username-check?q=ada')
    );

    expect(response.status).toBe(401);
  });
});
