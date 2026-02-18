import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  checkUsernameAvailability: vi.fn(),
}));

const userScopedSupabase = {
  auth: {
    getUser: (...args: unknown[]) => mocks.authGetUser(...args),
  },
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => userScopedSupabase),
}));

vi.mock('@/services/socialProfileService', () => ({
  SocialProfileService: {
    checkUsernameAvailability: (...args: unknown[]) => mocks.checkUsernameAvailability(...args),
  },
}));

const buildNextRequest = (url: string) => ({
  nextUrl: new URL(url),
}) as unknown as Request;

describe('GET /api/profile/username-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated users', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET(
      buildNextRequest('http://localhost/api/profile/username-check?q=test-user') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(mocks.checkUsernameAvailability).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid query', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: '11111111-1111-4111-8111-111111111111' } },
      error: null,
    });

    const response = await GET(
      buildNextRequest('http://localhost/api/profile/username-check?q=') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(mocks.checkUsernameAvailability).not.toHaveBeenCalled();
  });

  it('returns username availability payload', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mocks.checkUsernameAvailability.mockResolvedValue({
      username: 'new-user',
      available: true,
      message: 'Username is available.',
    });

    const response = await GET(
      buildNextRequest('http://localhost/api/profile/username-check?q=new-user') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({
      username: 'new-user',
      available: true,
    });
    expect(mocks.checkUsernameAvailability).toHaveBeenCalledWith(
      'new-user',
      userId,
      userScopedSupabase
    );
  });
});
