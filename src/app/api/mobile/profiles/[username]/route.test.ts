import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mobilePublicProfileSchema } from '@kurecal/domain';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  createServiceClient: vi.fn(),
  getPublicProfileByUsername: vi.fn(),
  getFollowStatus: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
}));

vi.mock('@/services/publicProfileService', () => ({
  PublicProfileService: {
    getPublicProfileByUsername: (...args: unknown[]) =>
      mocks.getPublicProfileByUsername(...args),
  },
}));

vi.mock('@/services/followService', () => ({
  FollowService: {
    getFollowStatus: (...args: unknown[]) => mocks.getFollowStatus(...args),
  },
}));

describe('GET /api/mobile/profiles/[username]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mocks.createServiceClient.mockReturnValue({ kind: 'read-supabase' });
  });

  it('returns the mobile public profile payload', async () => {
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: { kind: 'viewer-supabase' },
      user: { id: '11111111-1111-4111-8111-111111111111' },
    });
    mocks.getPublicProfileByUsername.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'Ada Lovelace',
      avatarUrl: null,
      username: 'ada',
      headline: 'Staff engineer',
      showAttendance: true,
      isViewerOwner: false,
      followerCount: 12,
      followingCount: 8,
      recentAttendingEvents: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          slug: 'design-review-week',
          title: 'Design Review Week',
          startTime: '2026-04-02T18:00:00.000Z',
          location: 'Remote',
        },
      ],
      careerProfile: {
        currentRole: 'Engineer',
        seniority: 'staff',
        industry: 'Developer tools',
        companySize: null,
        primarySkills: [],
        skillsToLearn: [],
        interests: [],
        careerGoals: [],
        timeframe: null,
        targetPath: null,
        learningStyle: [],
        networkingGoals: [],
        preferredEventTypes: [],
        lastUpdated: '2026-03-20T18:00:00.000Z',
      },
      mutualConnections: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          fullName: 'Grace Hopper',
          username: 'grace',
          avatarUrl: null,
          headline: 'Platform lead',
        },
      ],
      mutualConnectionsCount: 1,
    });
    mocks.getFollowStatus.mockResolvedValue({
      isFollowing: true,
      isFollowedBy: false,
      isBlockedByUser: false,
      hasBlockedUser: false,
    });

    const response = await GET(new Request('http://localhost/api/mobile/profiles/ada'), {
      params: Promise.resolve({ username: 'ada' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobilePublicProfileSchema.parse(payload.data).username).toBe('ada');
  });

  it('returns 401 when the mobile user is not authenticated', async () => {
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: null,
    });

    const response = await GET(new Request('http://localhost/api/mobile/profiles/ada'), {
      params: Promise.resolve({ username: 'ada' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
  });
});
