import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  getProfile: vi.fn(),
  createProfile: vi.fn(),
  updatePreferences: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/services/profileService', () => ({
  ProfileService: {
    getProfile: (...args: unknown[]) => mocks.getProfile(...args),
    createProfile: (...args: unknown[]) => mocks.createProfile(...args),
    updatePreferences: (...args: unknown[]) => mocks.updatePreferences(...args),
  },
}));

describe('POST /api/mobile/onboarding/career/skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'ada@example.com',
        user_metadata: { full_name: 'Ada Lovelace' },
      },
    });
    mocks.getProfile.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      preferences: {
        careerOptionalSections: {
          learningPreferences: false,
          networkingPreferences: false,
          teamPreferences: false,
        },
      },
    });
    mocks.updatePreferences.mockResolvedValue(undefined);
  });

  it('marks onboarding skipped while preserving optional state', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/onboarding/career/skip', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optionalSectionsCompleted: {
            learningPreferences: true,
            networkingPreferences: false,
            teamPreferences: false,
          },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.updatePreferences).toHaveBeenCalled();
    expect(mocks.createProfile).not.toHaveBeenCalled();
  });
});
