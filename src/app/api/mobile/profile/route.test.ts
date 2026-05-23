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
    bio: 'Unlocking stories through data.',
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
          username: 'ada',
          headline: 'Builder',
          bio: 'Unlocking stories through data.',
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
      }),
      {}
    );
    expect(mocks.updateProfile.mock.calls[0]?.[1]).not.toHaveProperty(
      'timezone'
    );
    expect(mocks.updateSocialProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        username: 'ada',
        bio: 'Unlocking stories through data.',
        profileVisibility: 'public',
        showAttendance: false,
      }),
      {}
    );
    expect(payload.success).toBe(true);
  });

  it('does not manually patch timezone from mobile profile updates', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/mobile/profile', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timezone: 'America/Vancouver',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(mocks.updateSocialProfile).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/profile')
    );

    expect(response.status).toBe(401);
  });
});
