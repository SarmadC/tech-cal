import { afterEach, describe, expect, it, vi } from 'vitest';

import { SocialProfileService } from './socialProfileService';

const profile = {
  id: 'user-1',
  fullName: 'Ada',
  avatarUrl: null,
  username: 'ada',
  headline: null,
  bio: null,
  profileVisibility: 'private' as const,
  showAttendance: false,
};

function updateClient() {
  const single = vi.fn().mockResolvedValue({
    data: {
      id: 'user-1', full_name: 'Ada', avatar_url: null, username: 'ada', headline: 'Builder', bio: null,
      profile_visibility: 'private', show_attendance: false,
    },
    error: null,
  });
  const select = vi.fn(() => ({ single }));
  const is = vi.fn(() => ({ select }));
  const eq = vi.fn(() => ({ is, select }));
  const update = vi.fn(() => ({ eq }));
  return { client: { from: vi.fn(() => ({ update })) } as any, update, eq, is };
}

afterEach(() => vi.restoreAllMocks());

describe('SocialProfileService username immutability', () => {
  it('treats the same claimed username as a no-op while saving other fields', async () => {
    const getProfile = vi.spyOn(SocialProfileService, 'getSocialProfile').mockResolvedValue(profile);
    const { client, update } = updateClient();

    await SocialProfileService.updateSocialProfile('user-1', { username: 'ada', headline: 'Builder' }, client);

    expect(getProfile).toHaveBeenCalledWith('user-1', client);
    expect(update).toHaveBeenCalledWith(expect.not.objectContaining({ username: expect.anything() }));
  });

  it('rejects replacing or clearing a claimed username', async () => {
    vi.spyOn(SocialProfileService, 'getSocialProfile').mockResolvedValue(profile);
    const { client } = updateClient();

    await expect(SocialProfileService.updateSocialProfile('user-1', { username: 'grace' }, client)).rejects.toThrow('Usernames cannot be changed once claimed.');
    await expect(SocialProfileService.updateSocialProfile('user-1', { username: null }, client)).rejects.toThrow('Usernames cannot be changed once claimed.');
  });

  it('uses a null-username condition for the initial claim', async () => {
    vi.spyOn(SocialProfileService, 'getSocialProfile').mockResolvedValue({ ...profile, username: null });
    const { client, is } = updateClient();

    await SocialProfileService.updateSocialProfile('user-1', { username: 'grace' }, client);

    expect(is).toHaveBeenCalledWith('username', null);
  });
});
