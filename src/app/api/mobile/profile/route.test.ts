import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileProfileStateSchema } from '@kurecal/domain';

import { GET, PATCH } from './route';

const mocks = vi.hoisted(() => ({
  buildMobileProfileState: vi.fn(),
  ensureMobileProfile: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  updateProfile: vi.fn(),
  updateSocialProfile: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/app/api/mobile/profileState', () => ({
  buildMobileProfileState: (...args: unknown[]) =>
    mocks.buildMobileProfileState(...args),
  ensureMobileProfile: (...args: unknown[]) => mocks.ensureMobileProfile(...args),
}));

vi.mock('@/services/profileService', () => ({
  ProfileService: {
    updateProfile: (...args: unknown[]) => mocks.updateProfile(...args),
  },
}));

vi.mock('@/services/socialProfileService', () => ({
  SocialProfileService: {
    updateSocialProfile: (...args: unknown[]) => mocks.updateSocialProfile(...args),
  },
}));

const mobileProfileState = {
  profile: {
    id: 'user-1',
    email: 'user@example.com',
    fullName: 'Ada Lovelace',
    avatarUrl: null,
    timezone: 'America/Edmonton',
  },
  socialProfile: {
    id: 'user-1',
    fullName: 'Ada Lovelace',
    avatarUrl: null,
    username: 'ada',
    headline: 'Builder',
    profileVisibility: 'connections',
    showAttendance: true,
  },
  onboarding: {
    onboarded: true,
    source: 'career_profiles',
  },
  careerProfile: null,
};

describe('/api/mobile/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mocks.buildMobileProfileState.mockResolvedValue(mobileProfileState);
    mocks.ensureMobileProfile.mockResolvedValue(mobileProfileState.profile);
    mocks.updateProfile.mockResolvedValue({});
    mocks.updateSocialProfile.mockResolvedValue(mobileProfileState.socialProfile);
  });

  it('returns the combined mobile profile state', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/profile', {
        headers: { Authorization: 'Bearer token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mobileProfileStateSchema.parse(payload.data).profile.fullName).toBe(
      'Ada Lovelace'
    );
  });

  it('updates both basic and social profile fields', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/mobile/profile', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: 'Ada Lovelace',
          timezone: 'America/Edmonton',
          username: 'ada',
          headline: 'Builder',
          profileVisibility: 'public',
          showAttendance: false,
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.updateProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        fullName: 'Ada Lovelace',
        timezone: 'America/Edmonton',
      }),
      {}
    );
    expect(mocks.updateSocialProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        username: 'ada',
        profileVisibility: 'public',
        showAttendance: false,
      }),
      {}
    );
    expect(payload.success).toBe(true);
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/profile')
    );

    expect(response.status).toBe(401);
  });
});
