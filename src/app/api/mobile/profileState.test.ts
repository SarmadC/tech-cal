import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProfile: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('@/services/profileService', () => ({
  ProfileService: {
    createProfile: (...args: unknown[]) => mocks.createProfile(...args),
    getProfile: (...args: unknown[]) => mocks.getProfile(...args),
    updateProfile: (...args: unknown[]) => mocks.updateProfile(...args),
  },
}));

import { ensureMobileProfile } from './profileState';

const authContext = {
  supabase: {},
  user: {
    id: 'user-1',
    email: 'user@example.com',
    user_metadata: {
      full_name: 'Ada Lovelace',
    },
  },
} as never;

describe('mobile profile state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs existing profiles to the device timezone header', async () => {
    const storedProfile = {
      id: 'user-1',
      fullName: 'Ada Lovelace',
      avatarUrl: null,
      timezone: 'America/Edmonton',
    };
    const updatedProfile = {
      ...storedProfile,
      timezone: 'America/Vancouver',
    };

    mocks.getProfile.mockResolvedValue(storedProfile);
    mocks.updateProfile.mockResolvedValue(updatedProfile);

    const result = await ensureMobileProfile(
      authContext,
      new Request('http://localhost/api/mobile/profile', {
        headers: {
          'x-timezone': 'America/Vancouver',
        },
      })
    );

    expect(result.timezone).toBe('America/Vancouver');
    expect(mocks.updateProfile).toHaveBeenCalledWith(
      'user-1',
      { timezone: 'America/Vancouver' },
      {}
    );
  });

  it('does not rewrite timezone when the device header matches', async () => {
    const storedProfile = {
      id: 'user-1',
      fullName: 'Ada Lovelace',
      avatarUrl: null,
      timezone: 'America/Edmonton',
    };

    mocks.getProfile.mockResolvedValue(storedProfile);

    const result = await ensureMobileProfile(
      authContext,
      new Request('http://localhost/api/mobile/profile', {
        headers: {
          'x-timezone': 'America/Edmonton',
        },
      })
    );

    expect(result.timezone).toBe('America/Edmonton');
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });
});
