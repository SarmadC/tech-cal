import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, POST } from './route';

const mocks = vi.hoisted(() => ({
  buildMobileProfileState: vi.fn(),
  ensureMobileProfile: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  removeAvatar: vi.fn(),
  sharp: vi.fn(),
  sharpToBuffer: vi.fn(),
  captureException: vi.fn(),
  updateAvatar: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mocks.captureException(...args),
}));

vi.mock('sharp', () => ({
  default: (...args: unknown[]) => mocks.sharp(...args),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/app/api/mobile/profileState', () => ({
  buildMobileProfileState: (...args: unknown[]) =>
    mocks.buildMobileProfileState(...args),
  ensureMobileProfile: (...args: unknown[]) =>
    mocks.ensureMobileProfile(...args),
}));

vi.mock('@/services/mobileAvatarService', () => ({
  MobileAvatarService: {
    removeAvatar: (...args: unknown[]) => mocks.removeAvatar(...args),
    replaceAvatar: (...args: unknown[]) => mocks.updateAvatar(...args),
  },
}));

const profileState = {
  profile: {
    id: 'user-1',
    email: 'user@example.com',
    fullName: 'Ada Lovelace',
    avatarUrl:
      'https://project.supabase.co/storage/v1/object/public/avatars/avatars/user-1-avatar.webp',
    timezone: 'America/Edmonton',
  },
  socialProfile: {
    id: 'user-1',
    fullName: 'Ada Lovelace',
    avatarUrl:
      'https://project.supabase.co/storage/v1/object/public/avatars/avatars/user-1-avatar.webp',
    username: 'ada',
    headline: 'Builder',
    bio: null,
    profileVisibility: 'public',
    showAttendance: true,
  },
  onboarding: { onboarded: true, source: 'career_profiles' },
  careerProfile: null,
};

function avatarFile({
  bytes = new Uint8Array([1, 2, 3]),
  name = 'portrait.png',
  size = bytes.byteLength,
  type = 'image/png',
}: {
  bytes?: Uint8Array;
  name?: string;
  size?: number;
  type?: string;
} = {}) {
  return {
    async arrayBuffer() {
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
    },
    name,
    size,
    type,
  };
}

function avatarRequest(file?: ReturnType<typeof avatarFile>) {
  return {
    async formData() {
      return {
        get(key: string) {
          return key === 'avatar' ? (file ?? null) : null;
        },
      };
    },
  } as unknown as Request;
}

describe('/api/mobile/profile/avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const pipeline = {
      resize: vi.fn(),
      rotate: vi.fn(),
      toBuffer: (...args: unknown[]) => mocks.sharpToBuffer(...args),
      webp: vi.fn(),
    };
    pipeline.rotate.mockReturnValue(pipeline);
    pipeline.resize.mockReturnValue(pipeline);
    pipeline.webp.mockReturnValue(pipeline);
    mocks.sharp.mockReturnValue(pipeline);
    mocks.sharpToBuffer.mockResolvedValue(Buffer.from('normalized-avatar'));
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mocks.ensureMobileProfile.mockResolvedValue(profileState.profile);
    mocks.updateAvatar.mockResolvedValue({
      avatarUrl: profileState.profile.avatarUrl,
    });
    mocks.removeAvatar.mockResolvedValue(undefined);
    mocks.buildMobileProfileState.mockResolvedValue(profileState);
  });

  it('normalizes and saves an authenticated avatar upload', async () => {
    const response = await POST(avatarRequest(avatarFile()));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.updateAvatar).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ name: 'avatar.webp', type: 'image/webp' }),
      {},
    );
    expect(payload.data.profile.avatarUrl).toContain('avatar.webp');
  });

  it('rejects missing, oversized, unsupported, and malformed uploads', async () => {
    const missing = await POST(avatarRequest());
    const oversized = await POST(
      avatarRequest(
        avatarFile({
          name: 'large.jpg',
          size: 8 * 1024 * 1024 + 1,
          type: 'image/jpeg',
        }),
      ),
    );
    const unsupported = await POST(
      avatarRequest(avatarFile({ name: 'avatar.svg', type: 'image/svg+xml' })),
    );
    mocks.sharpToBuffer.mockRejectedValueOnce(new Error('Invalid image'));
    const malformed = await POST(avatarRequest(avatarFile()));

    expect(missing.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(unsupported.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(mocks.updateAvatar).not.toHaveBeenCalled();
  });

  it('removes the current avatar and returns refreshed profile state', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/mobile/profile/avatar', {
        method: 'DELETE',
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.removeAvatar).toHaveBeenCalledWith('user-1', {});
    expect(mocks.buildMobileProfileState).toHaveBeenCalled();
  });

  it('builds the response state before committing an avatar change', async () => {
    mocks.buildMobileProfileState.mockRejectedValueOnce(
      new Error('Profile state unavailable'),
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(avatarRequest(avatarFile()));

    expect(response.status).toBe(500);
    expect(mocks.updateAvatar).not.toHaveBeenCalled();
    expect(mocks.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { route: 'mobile-profile-avatar', stage: 'build-profile-state' },
      }),
    );
    consoleError.mockRestore();
  });

  it('requires authentication for upload and removal', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue(null);

    const upload = await POST(avatarRequest(avatarFile()));
    const removal = await DELETE(
      new Request('http://localhost/api/mobile/profile/avatar', {
        method: 'DELETE',
      }),
    );

    expect(upload.status).toBe(401);
    expect(removal.status).toBe(401);
  });

  it('logs unexpected failures with their stage without exposing details', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const storageError = Object.assign(
      new Error('mime type image/webp is not supported'),
      {
        code: 'InvalidMimeType',
        statusCode: 400,
      },
    );
    mocks.updateAvatar.mockRejectedValueOnce(storageError);

    const response = await POST(avatarRequest(avatarFile()));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe(
      'Unable to update profile photo. Please try again.',
    );
    expect(consoleError).toHaveBeenCalledWith(
      '[mobile/profile/avatar] Unexpected failure',
      expect.objectContaining({
        code: 'InvalidMimeType',
        stage: 'persist-avatar',
        statusCode: 400,
      }),
    );
    expect(mocks.captureException).toHaveBeenCalledWith(
      storageError,
      expect.objectContaining({
        tags: { route: 'mobile-profile-avatar', stage: 'persist-avatar' },
      }),
    );
    consoleError.mockRestore();
  });
});
