import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
  updateProfile: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('./profileService', () => ({
  ProfileService: {
    updateProfile: (...args: unknown[]) => mocks.updateProfile(...args),
  },
}));

import {
  getOwnedAvatarStoragePath,
  MobileAvatarService,
} from './mobileAvatarService';

function createSupabase(currentAvatarUrl: string | null) {
  return {
    from(table: string) {
      expect(table).toBe('profiles');
      return {
        select(field: string) {
          expect(field).toBe('avatar_url');
          return {
            eq(_key: string, _value: string) {
              return {
                single: async () => ({
                  data: { avatar_url: currentAvatarUrl },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
    storage: {
      from(bucket: string) {
        expect(bucket).toBe('avatars');
        return {
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: `https://project.supabase.co/storage/v1/object/public/avatars/${path}`,
              },
            };
          },
          remove: (...args: unknown[]) => mocks.remove(...args),
          upload: (...args: unknown[]) => mocks.upload(...args),
        };
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.remove.mockResolvedValue({ error: null });
  mocks.updateProfile.mockResolvedValue({});
  mocks.upload.mockResolvedValue({ error: null });
});

describe('getOwnedAvatarStoragePath', () => {
  it('returns only avatar objects owned by the requested user', () => {
    expect(
      getOwnedAvatarStoragePath(
        'https://project.supabase.co/storage/v1/object/public/avatars/avatars/user-1-123.webp',
        'user-1',
      ),
    ).toBe('avatars/user-1-123.webp');

    expect(
      getOwnedAvatarStoragePath(
        'https://project.supabase.co/storage/v1/object/public/avatars/avatars/user-2-123.webp',
        'user-1',
      ),
    ).toBeNull();
  });

  it('ignores external, malformed, and non-avatar URLs', () => {
    expect(
      getOwnedAvatarStoragePath(
        'https://images.example.com/user-1.jpg',
        'user-1',
      ),
    ).toBeNull();
    expect(getOwnedAvatarStoragePath('not a url', 'user-1')).toBeNull();
    expect(getOwnedAvatarStoragePath(null, 'user-1')).toBeNull();
  });
});

describe('MobileAvatarService', () => {
  it('persists a replacement before deleting the previous owned object', async () => {
    const supabase = createSupabase(
      'https://project.supabase.co/storage/v1/object/public/avatars/avatars/user-1-old.webp',
    );

    const result = await MobileAvatarService.replaceAvatar(
      'user-1',
      new File(['image'], 'avatar.webp', { type: 'image/webp' }),
      supabase as never,
    );

    expect(mocks.updateProfile).toHaveBeenCalledWith(
      'user-1',
      { avatarUrl: result.avatarUrl },
      supabase,
    );
    expect(mocks.remove).toHaveBeenCalledWith(['avatars/user-1-old.webp']);
  });

  it('clears the profile without deleting an external avatar', async () => {
    const supabase = createSupabase(
      'https://images.example.com/oauth-user.jpg',
    );

    await MobileAvatarService.removeAvatar('user-1', supabase as never);

    expect(mocks.updateProfile).toHaveBeenCalledWith(
      'user-1',
      { avatarUrl: null },
      supabase,
    );
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('cleans up a new object when profile persistence fails', async () => {
    const supabase = createSupabase(null);
    mocks.updateProfile.mockRejectedValueOnce(new Error('Database failed'));

    await expect(
      MobileAvatarService.replaceAvatar(
        'user-1',
        new File(['image'], 'avatar.webp', { type: 'image/webp' }),
        supabase as never,
      ),
    ).rejects.toThrow('Database failed');

    expect(mocks.remove).toHaveBeenCalledWith([
      expect.stringMatching(/^avatars\/user-1-\d+\.webp$/),
    ]);
  });
});
