import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobilePublicProfileSchema } from '@kurecal/domain';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  getContactForTarget: vi.fn(),
  getFollowStatus: vi.fn(),
  getPublicProfileByUsername: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
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

vi.mock('@/services/userNetworkingContactService', () => ({
  UserNetworkingContactService: {
    getContactForTarget: (...args: unknown[]) => mocks.getContactForTarget(...args),
    toNetworkingState: (contact: {
      linkedinRequestedAt?: string | null;
      confirmedConnectedAt?: string | null;
    } | null) => ({
      status: contact?.confirmedConnectedAt
        ? 'connected'
        : contact?.linkedinRequestedAt
          ? 'requested'
          : 'none',
      linkedinRequestedAt: contact?.linkedinRequestedAt ?? null,
      confirmedConnectedAt: contact?.confirmedConnectedAt ?? null,
    }),
  },
}));

describe('GET /api/mobile/profiles/[username]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mocks.createServiceClient.mockReturnValue({ kind: 'read-supabase' });
    mocks.getContactForTarget.mockResolvedValue(null);
  });

  it('returns the mobile public profile payload', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      supabase: { kind: 'viewer-supabase' },
      user: { id: '11111111-1111-4111-8111-111111111111' },
    });
    mocks.getPublicProfileByUsername.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'Ada Lovelace',
      avatarUrl: null,
      username: 'ada',
      headline: 'Staff engineer',
      bio: 'Leads applied AI research.',
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
          endTime: null,
          location: 'Remote',
          activityType: 'attending',
          role: null,
          mutualAttendeeCount: null,
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
      location: 'Edmonton, CA',
      linkedinUrl: null,
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
      sharedEventsCount: 0,
      sharedTopics: [],
      sharedCircles: [],
      sharedCirclesCount: 0,
      recommendedBy: [],
      sharedCareerGoals: [],
    });
    mocks.getFollowStatus.mockResolvedValue({
      isFollowing: true,
      isFollowedBy: false,
      isBlockedByUser: false,
      hasBlockedUser: false,
    });
    mocks.getContactForTarget.mockResolvedValue({
      id: 'contact-1',
      viewerUserId: '11111111-1111-4111-8111-111111111111',
      targetKind: 'profile',
      targetUserId: '22222222-2222-4222-8222-222222222222',
      targetSpeakerId: null,
      sourceEventId: null,
      linkedinRequestedAt: '2026-04-10T12:00:00.000Z',
      confirmedConnectedAt: null,
      createdAt: '2026-04-10T12:00:00.000Z',
      updatedAt: '2026-04-10T12:00:00.000Z',
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/profiles/ada') as never,
      {
        params: Promise.resolve({ username: 'ada' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    const parsed = mobilePublicProfileSchema.parse(payload.data);
    expect(parsed.username).toBe('ada');
    expect(parsed.bio).toBe('Leads applied AI research.');
    expect(parsed.networkingState?.status).toBe('requested');
  });

  it('returns 401 when the mobile user is not authenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/profiles/ada') as never,
      {
        params: Promise.resolve({ username: 'ada' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
  });
});
