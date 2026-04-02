import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PATCH } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  getSocialProfile: vi.fn(),
  updateSocialProfile: vi.fn(),
  evaluateTrustLevel: vi.fn(),
}));

const userScopedSupabase = { kind: 'user-scoped-supabase' };

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/services/socialProfileService', () => ({
  SocialProfileService: {
    getSocialProfile: (...args: unknown[]) => mocks.getSocialProfile(...args),
    updateSocialProfile: (...args: unknown[]) => mocks.updateSocialProfile(...args),
  },
}));

vi.mock('@/services/trustLevelService', () => ({
  TrustLevelService: {
    evaluateAndPersistTrustLevel: (...args: unknown[]) => mocks.evaluateTrustLevel(...args),
  },
}));

describe('profile social route', () => {
  const viewerId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiAuthContext.mockResolvedValue({
      authMode: 'bearer',
      accessToken: 'mobile-access-token',
      supabase: userScopedSupabase,
      user: { id: viewerId },
    });
    mocks.evaluateTrustLevel.mockResolvedValue({ level: 2 });
  });

  it('accepts bearer-authenticated GET requests for the mobile social profile', async () => {
    mocks.getSocialProfile.mockResolvedValue({
      username: 'alex',
      headline: 'Mobile engineer',
      profileVisibility: 'public',
      showAttendance: true,
    });

    const response = await GET(
      new Request('http://localhost/api/profile/social', {
        headers: {
          Authorization: 'Bearer mobile-access-token',
        },
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getSocialProfile).toHaveBeenCalledWith(viewerId, userScopedSupabase);
    expect(mocks.evaluateTrustLevel).toHaveBeenCalledWith(viewerId, userScopedSupabase);
    expect(payload).toMatchObject({
      success: true,
      data: {
        username: 'alex',
        trustLevel: 2,
      },
    });
  });

  it('accepts bearer-authenticated PATCH requests for the mobile social profile', async () => {
    mocks.updateSocialProfile.mockResolvedValue({
      username: 'alex',
      headline: 'Updated headline',
      profileVisibility: 'connections',
      showAttendance: false,
    });

    const response = await PATCH(
      new Request('http://localhost/api/profile/social', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer mobile-access-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headline: 'Updated headline',
          profileVisibility: 'connections',
          showAttendance: false,
        }),
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.updateSocialProfile).toHaveBeenCalledWith(
      viewerId,
      {
        headline: 'Updated headline',
        profileVisibility: 'connections',
        showAttendance: false,
      },
      userScopedSupabase
    );
    expect(payload).toMatchObject({
      success: true,
      data: {
        username: 'alex',
        trustLevel: 2,
      },
    });
  });
});
