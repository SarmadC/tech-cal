import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, PATCH } from './route';

const mocks = vi.hoisted(() => ({
  evaluateAndPersistTrustLevel: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  getSocialProfile: vi.fn(),
  updateSocialProfile: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/socialProfileService', () => ({
  SocialProfileService: {
    getSocialProfile: (...args: unknown[]) => mocks.getSocialProfile(...args),
    updateSocialProfile: (...args: unknown[]) => mocks.updateSocialProfile(...args),
  },
}));

vi.mock('@/services/trustLevelService', () => ({
  TrustLevelService: {
    evaluateAndPersistTrustLevel: (...args: unknown[]) =>
      mocks.evaluateAndPersistTrustLevel(...args),
  },
}));

describe('/api/profile/social', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: { from: vi.fn() },
      user: { id: 'user-1' },
    });
    mocks.getSocialProfile.mockResolvedValue({
      id: 'user-1',
      fullName: 'Demo User',
      avatarUrl: null,
      username: 'demo-user',
      headline: 'Builder',
      profileVisibility: 'connections',
      showAttendance: true,
    });
    mocks.updateSocialProfile.mockResolvedValue({
      id: 'user-1',
      fullName: 'Demo User',
      avatarUrl: null,
      username: 'demo-user',
      headline: 'Updated builder',
      profileVisibility: 'public',
      showAttendance: false,
    });
    mocks.evaluateAndPersistTrustLevel.mockResolvedValue({
      level: 2,
    });
  });

  it('returns 401 when auth cannot be resolved', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET({
      headers: new Headers(),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(mocks.getSocialProfile).not.toHaveBeenCalled();
  });

  it('returns the current social profile and trust level', async () => {
    const response = await GET({
      headers: new Headers({ authorization: 'Bearer mobile-token' }),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({
      username: 'demo-user',
      trustLevel: 2,
    });
    expect(mocks.getSocialProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ from: expect.any(Function) })
    );
  });

  it('validates shared update payloads before calling the service', async () => {
    const response = await PATCH({
      headers: new Headers(),
      json: async () => ({
        username: 'x'.repeat(31),
      }),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(mocks.updateSocialProfile).not.toHaveBeenCalled();
  });

  it('updates the social profile with the shared contract', async () => {
    const response = await PATCH({
      headers: new Headers({ authorization: 'Bearer mobile-token' }),
      json: async () => ({
        headline: 'Updated builder',
        profileVisibility: 'public',
        showAttendance: false,
      }),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({
      headline: 'Updated builder',
      profileVisibility: 'public',
      trustLevel: 2,
    });
    expect(mocks.updateSocialProfile).toHaveBeenCalledWith(
      'user-1',
      {
        headline: 'Updated builder',
        profileVisibility: 'public',
        showAttendance: false,
      },
      expect.objectContaining({ from: expect.any(Function) })
    );
  });
});
