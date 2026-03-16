import { describe, expect, it, vi, beforeEach } from 'vitest';

import DiscoverPage from './page';

const {
  mockDiscoverClientView,
  mockGetUser,
  mockProfileSingle,
  mockGetEventTypes,
  mockGetProfile,
  mockGetCareerProfile,
  mockLoadFilteredEventsData,
  mockBuildUserLocationFromProfileContext,
} = vi.hoisted(() => ({
  mockDiscoverClientView: vi.fn(() => null),
  mockGetUser: vi.fn(),
  mockProfileSingle: vi.fn(),
  mockGetEventTypes: vi.fn(),
  mockGetProfile: vi.fn(),
  mockGetCareerProfile: vi.fn(),
  mockLoadFilteredEventsData: vi.fn(),
  mockBuildUserLocationFromProfileContext: vi.fn(() => ({
    country: 'Canada',
    timezone: 'America/Edmonton',
  })),
}));

vi.mock('../../discover/DiscoverClientView', () => ({
  default: (props: unknown) => {
    mockDiscoverClientView(props);
    return null;
  },
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockProfileSingle,
            })),
          })),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null }),
          })),
        })),
      };
    }),
  })),
}));

vi.mock('@/services/eventTypeService', () => ({
  EventTypeService: {
    getEventTypes: mockGetEventTypes,
  },
}));

vi.mock('@/services/profileService', () => ({
  ProfileService: {
    getProfile: mockGetProfile,
  },
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    getCareerProfile: mockGetCareerProfile,
  },
}));

vi.mock('@/services/filteredEventsService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/filteredEventsService')>();
  return {
    ...actual,
    loadFilteredEventsData: mockLoadFilteredEventsData,
    buildUserLocationFromProfileContext: mockBuildUserLocationFromProfileContext,
  };
});

describe('DiscoverPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockProfileSingle.mockResolvedValue({
      data: {
        preferences: { location: { country: 'Canada' } },
        timezone: 'America/Edmonton',
        location: null,
      },
    });
    mockGetEventTypes.mockResolvedValue([]);
    mockGetProfile.mockResolvedValue({
      id: 'user-1',
      fullName: 'Test User',
      avatarUrl: null,
      timezone: 'America/Edmonton',
      preferences: {
        careerProfile: {
          currentRole: 'Designer',
          primarySkills: ['Figma'],
          careerGoals: ['networking'],
        },
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mockGetCareerProfile.mockResolvedValue({
      currentRole: 'Designer',
      primarySkills: ['Figma'],
      skillsToLearn: [],
      interests: [],
      careerGoals: ['networking'],
      learningStyle: [],
      networkingGoals: [],
      preferredEventTypes: [],
    });
    mockLoadFilteredEventsData.mockResolvedValue({
      events: [],
      pagination: { page: 1, pageSize: 50, total: 0, hasMore: false },
      filters: { applied: {}, available: { categories: [], difficulties: [], formats: [], locations: [] } },
      stats: { processingTimeMs: 1, filteredCount: 0, totalCount: 0 },
    });
  });

  it('uses the shared filtered-events loader for SSR initialQueryData', async () => {
    const element = await DiscoverPage();

    expect(mockLoadFilteredEventsData).toHaveBeenCalledTimes(1);
    const loaderArg = mockLoadFilteredEventsData.mock.calls[0][0];
    expect(loaderArg.request.surface).toBe('discover');
    expect(loaderArg.request.page).toBe(1);
    expect(loaderArg.request.pageSize).toBe(50);
    expect(loaderArg.request.sortBy).toBe('career-impact');

    const props = (element as unknown as { props: {
      initialQueryData?: { success: true; data: { pagination: { page: number } } };
    } }).props;
    expect(props.initialQueryData?.success).toBe(true);
    expect(props.initialQueryData?.data.pagination.page).toBe(1);
  });
});
