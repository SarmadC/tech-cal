import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { MobileCalendarFeed, MobileDashboardHome, MobileDiscoverFeed, MobileEventCard } from '@kurecal/domain';
import CalendarScreen from '../app/(tabs)/calendar';
import DashboardScreen from '../app/(tabs)/dashboard';
import DiscoverScreen from '../app/(tabs)/discover';
import SettingsScreen from '../app/settings';
import { buildDiscoverDateOptions } from '../components/discover/discoverDateUtils';
import { renderWithProviders } from './renderWithProviders';

const mockRouterPush: any = jest.fn();
const mockRouterBack: any = jest.fn();
const mockUseMobileAuth: any = jest.fn();
const mockUseLocalSearchParams: any = jest.fn();
const mockMobileApi: any = {
  getDiscoverFeed: jest.fn(),
  getCalendarFeed: jest.fn(),
  getDashboardHome: jest.fn(),
  getSubscriptionStatus: jest.fn(),
  getBlockedUsers: jest.fn(),
  getSocialProfile: jest.fn(),
  updateSocialProfile: jest.fn(),
  unblockUser: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    back: (...args: unknown[]) => mockRouterBack(...args),
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('@/lib/mobileApi', () => ({
  getMobileApiClient: () => mockMobileApi,
}));

jest.mock('@/hooks/useMobileAuth', () => ({
  useMobileAuth: () => mockUseMobileAuth(),
}));

function createEvent(overrides: Partial<MobileEventCard> = {}): MobileEventCard {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Signal Event',
    slug: 'signal-event',
    description: 'A strong event for testing.',
    location: 'Remote',
    startTime: '2026-04-02T18:00:00.000Z',
    endTime: '2026-04-02T19:00:00.000Z',
    imageUrl: null,
    organizerLogoUrl: null,
    organizerName: 'KureCal',
    score: 91,
    engagement: {
      isBookmarked: false,
      status: null,
    },
    badges: [],
    insight: 'Fresh recommendation',
    timeLabel: 'Apr 2 • 6:00 PM',
    format: 'virtual',
    formatLabel: 'Remote',
    priceLabel: 'Free',
    ...overrides,
  };
}

function createDiscoverFeed(
  overrides: Partial<MobileDiscoverFeed> = {}
): MobileDiscoverFeed {
  return {
    header: {
      eyebrow: 'KureCal mobile',
      title: 'Discover',
      subtitle: 'Web-parity discovery',
    },
    controls: {
      rankingModes: [
        { id: 'best-match', label: 'Best match', description: 'Ranked by fit' },
        { id: 'trending', label: 'Trending', description: 'Ranked by momentum' },
        { id: 'soonest', label: 'Soonest', description: 'Ordered by time' },
      ],
      activeRankingMode: 'best-match',
    },
    activeState: {
      resultLabel: '1 ranked pick',
      supportingText: 'Server-ranked recommendations.',
    },
    results: {
      returnedCount: 1,
      totalCount: 1,
      hasMore: false,
    },
    filters: {
      searchTerm: '',
      categories: [],
      tags: [],
      location: null,
      dateRange: {
        start: null,
        end: null,
      },
      format: 'all',
      cost: 'all',
      activeCount: 0,
    },
    availableFilters: {
      categories: [{ id: 'conference', name: 'Conference', count: 1 }],
      tags: [{ value: 'ai', label: 'AI', count: 1 }],
    },
    counts: {
      format: {
        virtual: 1,
        'in-person': 0,
        hybrid: 0,
      },
      cost: {
        free: 1,
        paid: 0,
      },
      categories: {
        conference: 1,
      },
      tags: {
        ai: 1,
      },
    },
    topPicks: null,
    events: [createEvent({ title: 'Best Match Event' })],
    ...overrides,
  };
}

function createCalendarFeed(
  overrides: Partial<MobileCalendarFeed> = {}
): MobileCalendarFeed {
  return {
    month: {
      monthStart: '2026-04-01',
      monthEnd: '2026-04-30',
      label: 'April 2026',
    },
    results: {
      returnedCount: 2,
      totalCount: 2,
    },
    filters: {
      tags: [],
      location: null,
      dateRange: {
        start: null,
        end: null,
      },
      cost: 'all',
      activeCount: 0,
    },
    availableFilters: {
      tags: [{ value: 'ai', label: 'AI', count: 2 }],
      eventTypes: [
        {
          id: 'conference',
          name: 'Conference',
          color: '#2563EB',
          description: 'Large format events',
        },
      ],
    },
    counts: {
      cost: {
        free: 2,
        paid: 0,
      },
      tags: {
        ai: 2,
      },
    },
    emptyState: {
      title: 'No events this month',
      body: 'Adjust a filter or move to another month.',
    },
    events: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Saved Event',
        location: 'Remote',
        startTime: '2026-04-02T18:00:00.000Z',
        endTime: '2026-04-02T19:00:00.000Z',
        timezone: 'America/Edmonton',
        eventTypeId: 'conference',
        organizerName: 'KureCal',
        engagement: { isBookmarked: true, status: null },
        timeLabel: '6:00 PM - 7:00 PM',
        priceLabel: 'Free',
        isFree: true,
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        title: 'Attending Event',
        location: 'Calgary',
        startTime: '2026-04-10T18:00:00.000Z',
        endTime: '2026-04-10T19:00:00.000Z',
        timezone: 'America/Edmonton',
        eventTypeId: 'conference',
        organizerName: 'KureCal',
        engagement: { isBookmarked: false, status: 'attending' },
        timeLabel: '6:00 PM - 7:00 PM',
        priceLabel: 'Free',
        isFree: true,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({});
  mockUseMobileAuth.mockReturnValue({
    profile: { fullName: 'Ada Lovelace', timezone: 'America/Edmonton' },
    user: { id: '22222222-2222-4222-8222-222222222222', email: 'ada@example.com' },
    signOut: async () => undefined,
  });
  mockMobileApi.getSubscriptionStatus.mockResolvedValue({
    success: true,
    data: { tier: 'pro', provider: 'revenuecat' },
  });
  mockMobileApi.getBlockedUsers.mockResolvedValue({ success: true, data: [] });
  mockMobileApi.getSocialProfile.mockResolvedValue({
    success: true,
    data: {
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'Ada Lovelace',
      avatarUrl: null,
      username: 'ada',
      headline: 'Staff engineer',
      profileVisibility: 'public',
      showAttendance: true,
      trustLevel: 'trusted',
    },
  });
  mockMobileApi.updateSocialProfile.mockImplementation(async (payload: Record<string, unknown>) => ({
    success: true,
    data: {
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'Ada Lovelace',
      avatarUrl: null,
      username: 'ada',
      headline: 'Staff engineer',
      profileVisibility: (payload.profileVisibility as string) ?? 'public',
      showAttendance: (payload.showAttendance as boolean | undefined) ?? true,
      trustLevel: 'trusted',
    },
  }));
  mockMobileApi.unblockUser.mockResolvedValue({ success: true });
});

describe('signed-in mobile screens', () => {
  it('updates discover state when the ranking control changes', async () => {
    const bestMatchFeed = createDiscoverFeed({
      activeState: {
        resultLabel: '2 ranked picks',
        supportingText: 'Server-ranked recommendations.',
      },
      results: {
        returnedCount: 1,
        totalCount: 2,
        hasMore: false,
      },
      topPicks: {
        title: 'Your Top Picks',
        cards: [
          createEvent({
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            title: 'Top Pick Event',
            insight: 'Fits your goals',
          }),
        ],
      },
      events: [
        createEvent({
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          title: 'Best Match Event',
        }),
      ],
    });
    const trendingFeed = createDiscoverFeed({
      controls: {
        ...createDiscoverFeed().controls,
        activeRankingMode: 'trending',
      },
      activeState: {
        resultLabel: '1 trending event',
        supportingText: 'A momentum-first view.',
      },
      topPicks: null,
      events: [createEvent({ id: '33333333-3333-4333-8333-333333333333', title: 'Trending Event' })],
    });

    mockMobileApi.getDiscoverFeed.mockImplementation(async (params?: { rankingMode?: string; page?: number }) => ({
      success: true,
      data: params?.rankingMode === 'trending' ? trendingFeed : bestMatchFeed,
    }));

    renderWithProviders(<DiscoverScreen />);

    expect(await screen.findByText('Your Top Picks')).toBeTruthy();
    expect(screen.getByText('Recommended events')).toBeTruthy();
    expect(await screen.findByText('Best Match Event')).toBeTruthy();

    fireEvent.press(screen.getByText('Trending'));

    await waitFor(() =>
      expect(mockMobileApi.getDiscoverFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({ rankingMode: 'trending', page: 1 })
      )
    );
    expect(await screen.findByText('Trending Event')).toBeTruthy();
    expect(screen.queryByText('Your Top Picks')).toBeNull();
    expect(screen.queryByText('Recommended events')).toBeNull();
  });

  it('renders a single top-pick hero card and routes from it', async () => {
    mockMobileApi.getDiscoverFeed.mockResolvedValue({
      success: true,
      data: createDiscoverFeed({
        activeState: {
          resultLabel: '1 ranked pick',
          supportingText: 'Server-ranked recommendations.',
        },
        results: {
          returnedCount: 0,
          totalCount: 1,
          hasMore: false,
        },
        topPicks: {
          title: 'Your Top Picks',
          cards: [
            createEvent({
              id: '12121212-1212-4212-8212-121212121212',
              title: 'Hero Event',
              insight: 'Fits your goals',
            }),
          ],
        },
        events: [],
      }),
    });

    renderWithProviders(<DiscoverScreen />);

    expect(await screen.findByText('Your Top Picks')).toBeTruthy();
    expect(await screen.findByText('Hero Event')).toBeTruthy();
    expect(screen.queryByText('Adjust the feed and try again')).toBeNull();

    fireEvent.press(screen.getByLabelText('Open top pick Hero Event'));

    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/event/12121212-1212-4212-8212-121212121212')
    );
  });

  it('renders multiple top picks as a carousel and keeps them out of the feed', async () => {
    mockMobileApi.getDiscoverFeed.mockResolvedValue({
      success: true,
      data: createDiscoverFeed({
        activeState: {
          resultLabel: '3 ranked picks',
          supportingText: 'Server-ranked recommendations.',
        },
        results: {
          returnedCount: 1,
          totalCount: 3,
          hasMore: false,
        },
        topPicks: {
          title: 'Your Top Picks',
          cards: [
            createEvent({
              id: '56565656-5656-4565-8565-565656565656',
              title: 'Hero Event One',
              insight: 'Fits your goals',
            }),
            createEvent({
              id: '78787878-7878-4787-8787-787878787878',
              title: 'Hero Event Two',
              insight: 'Builds your skills',
            }),
          ],
        },
        events: [
          createEvent({
            id: '90909090-9090-4909-8909-909090909090',
            title: 'Feed Event',
          }),
        ],
      }),
    });

    renderWithProviders(<DiscoverScreen />);

    expect(await screen.findByText('Hero Event One')).toBeTruthy();
    expect(screen.getByText('Hero Event Two')).toBeTruthy();
    expect(screen.getByText('Recommended events')).toBeTruthy();
    expect(screen.getByText('Feed Event')).toBeTruthy();
    expect(screen.getAllByLabelText(/Top pick page/)).toHaveLength(2);
    expect(screen.queryAllByText('Hero Event One')).toHaveLength(1);
  });

  it('keeps the active ranking mode when filters are reset', async () => {
    mockMobileApi.getDiscoverFeed.mockImplementation(
      async (params?: {
        categories?: string[];
        cost?: string;
        format?: string;
        rankingMode?: string;
        page?: number;
      }) => {
        const rankingMode = params?.rankingMode ?? 'best-match';
        const isPaid = params?.cost === 'paid';

        return {
          success: true,
          data: createDiscoverFeed({
            controls: {
              ...createDiscoverFeed().controls,
              activeRankingMode: rankingMode as MobileDiscoverFeed['controls']['activeRankingMode'],
            },
            activeState: {
              resultLabel: rankingMode === 'trending'
                ? isPaid ? '1 trending paid event' : '2 trending events'
                : isPaid ? '1 paid event' : '2 ranked picks',
              supportingText: rankingMode === 'trending'
                ? isPaid ? 'Paid momentum results.' : 'A momentum-first view.'
                : isPaid ? 'Paid-only results.' : 'Server-ranked recommendations.',
            },
            filters: {
              searchTerm: '',
              categories: [],
              tags: [],
              location: null,
              dateRange: {
                start: null,
                end: null,
              },
              format: 'all',
              cost: isPaid ? 'paid' : 'all',
              activeCount: isPaid ? 1 : 0,
            },
            results: {
              returnedCount: 1,
              totalCount: isPaid ? 1 : 2,
              hasMore: false,
            },
            events: [
              createEvent({
                id: isPaid
                  ? '66666666-6666-4666-8666-666666666666'
                  : '77777777-7777-4777-8777-777777777777',
                title: rankingMode === 'trending'
                  ? isPaid ? 'Trending Paid Event' : 'Trending Event'
                  : isPaid ? 'Paid Event' : 'Best Match Event',
                priceLabel: isPaid ? 'Paid' : 'Free',
              }),
            ],
          }),
        };
      }
    );

    renderWithProviders(<DiscoverScreen />);

    expect(await screen.findByText('Best Match Event')).toBeTruthy();

    fireEvent.press(screen.getByText('Trending'));

    await waitFor(() =>
      expect(mockMobileApi.getDiscoverFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({ rankingMode: 'trending', page: 1 })
      )
    );
    expect(await screen.findByText('Trending Event')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Open filters'));
    expect(await screen.findByText('Calendar filters')).toBeTruthy();

    fireEvent.press(screen.getByText('Paid'));
    expect(await screen.findByText('Show 1')).toBeTruthy();
    fireEvent.press(screen.getByText('Show 1'));

    await waitFor(() =>
      expect(mockMobileApi.getDiscoverFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({
          rankingMode: 'trending',
          cost: 'paid',
          categories: [],
          format: 'all',
          page: 1,
        })
      )
    );
    expect(await screen.findByText('Trending Paid Event')).toBeTruthy();

    fireEvent.press(screen.getByText('Clear all filters'));

    await waitFor(() =>
      expect(mockMobileApi.getDiscoverFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          rankingMode: 'trending',
          cost: 'all',
          categories: [],
          format: 'all',
          page: 1,
        })
      )
    );
    expect(await screen.findByText('Trending Event')).toBeTruthy();
  });

  it('previews discover filter counts, applies filters, and removes active chips', async () => {
    mockMobileApi.getDiscoverFeed.mockImplementation(
      async (params?: { tags?: string[]; categories?: string[]; format?: string; page?: number }) => {
        const hasAiTag = params?.tags?.includes('ai');

        return {
          success: true,
          data: createDiscoverFeed({
            activeState: {
              resultLabel: hasAiTag ? '1 AI event' : '2 ranked picks',
              supportingText: hasAiTag ? 'AI-only results.' : 'Server-ranked recommendations.',
            },
            filters: {
              searchTerm: '',
              categories: [],
              tags: hasAiTag ? ['ai'] : [],
              location: null,
              dateRange: {
                start: null,
                end: null,
              },
              format: 'all',
              cost: 'all',
              activeCount: hasAiTag ? 1 : 0,
            },
            results: {
              returnedCount: 1,
              totalCount: hasAiTag ? 1 : 2,
              hasMore: false,
            },
            topPicks: hasAiTag
              ? null
              : {
                  title: 'Your Top Picks',
                  cards: [
                    createEvent({
                      id: '98989898-9898-4989-8989-989898989898',
                      title: 'Top Pick Event',
                      insight: 'Fits your goals',
                    }),
                  ],
                },
            events: [createEvent({ title: hasAiTag ? 'AI Event' : 'Best Match Event' })],
          }),
        };
      }
    );

    renderWithProviders(<DiscoverScreen />);

    expect(await screen.findByText('Best Match Event')).toBeTruthy();
    expect(screen.getByText('Your Top Picks')).toBeTruthy();
    expect(screen.getByText('Recommended events')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Open filters'));
    expect(await screen.findByText('Calendar filters')).toBeTruthy();
    expect(await screen.findByText('Show 2')).toBeTruthy();

    fireEvent.press(screen.getByText('AI 1'));

    expect(await screen.findByText('Show 1')).toBeTruthy();
    fireEvent.press(screen.getByText('Show 1'));

    await waitFor(() =>
      expect(mockMobileApi.getDiscoverFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({
          tags: ['ai'],
          categories: [],
          format: 'all',
          page: 1,
        })
      )
    );
    expect(await screen.findByText('AI Event')).toBeTruthy();
    expect(screen.getByText('Tag: AI ×')).toBeTruthy();
    expect(screen.queryByText('Your Top Picks')).toBeNull();
    expect(screen.queryByText('Recommended events')).toBeNull();

    fireEvent.press(screen.getByLabelText('Remove Tag: AI filter'));

    await waitFor(() =>
      expect(mockMobileApi.getDiscoverFeed).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [], categories: [], format: 'all' })
      )
    );
    expect(screen.queryByText('Tag: AI ×')).toBeNull();
  });

  it('builds discover date options using local calendar dates', () => {
    jest.useFakeTimers();

    try {
      jest.setSystemTime(new Date(2026, 2, 25, 9, 30, 0));
      expect(buildDiscoverDateOptions(3)).toEqual(['2026-03-25', '2026-03-26', '2026-03-27']);
    } finally {
      jest.useRealTimers();
    }
  });

  it('loads the next page of the discover feed', async () => {
    mockMobileApi.getDiscoverFeed.mockImplementation(async (params?: { page?: number }) => {
      if (params?.page === 2) {
        return {
          success: true,
          data: createDiscoverFeed({
            activeState: {
              resultLabel: '2 ranked picks',
              supportingText: 'Server-ranked recommendations.',
            },
            results: {
              returnedCount: 1,
              totalCount: 2,
              hasMore: false,
            },
            events: [
              createEvent({
                id: '55555555-5555-4555-8555-555555555555',
                title: 'Second Page Event',
              }),
            ],
          }),
        };
      }

      return {
        success: true,
        data: createDiscoverFeed({
          activeState: {
            resultLabel: '2 ranked picks',
            supportingText: 'Server-ranked recommendations.',
          },
          results: {
            returnedCount: 1,
            totalCount: 2,
            hasMore: true,
          },
          events: [createEvent({ title: 'First Page Event' })],
        }),
      };
    });

    renderWithProviders(<DiscoverScreen />);

    expect(await screen.findByText('First Page Event')).toBeTruthy();

    fireEvent.press(screen.getByText('Show more'));

    await waitFor(() =>
      expect(mockMobileApi.getDiscoverFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      )
    );
    expect(await screen.findByText('Second Page Event')).toBeTruthy();
  });

  it('renders the native month-first calendar feed and routes from agenda rows', async () => {
    const feed = createCalendarFeed();

    mockMobileApi.getCalendarFeed.mockResolvedValue({ success: true, data: feed });

    renderWithProviders(<CalendarScreen />);

    expect(await screen.findByText('Saved Event')).toBeTruthy();
    expect(screen.getByText('Attending Event')).toBeTruthy();
    expect(screen.queryByText('Tracked')).toBeNull();
    expect(screen.queryByText('All')).toBeNull();

    fireEvent.press(screen.getByText('Saved Event'));

    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/event/11111111-1111-4111-8111-111111111111'));
  });

  it('renders the sectioned dashboard home payload', async () => {
    const dashboard: MobileDashboardHome = {
      hero: {
        eyebrow: 'Dashboard',
        title: 'Your momentum, in one pass.',
        subtitle: 'A mobile-first overview of recommendations and plans.',
        highlight: 'Top Career Move',
      },
      metrics: [
        { id: 'tracked', label: 'Tracked', value: '8', detail: 'Tracked events' },
        { id: 'saved', label: 'Saved', value: '3', detail: 'Bookmarked events' },
        { id: 'attending', label: 'Attending', value: '2', detail: 'Confirmed events' },
        { id: 'recommended', label: 'Recommended', value: '5', detail: 'Fresh recommendations' },
      ],
      recommendationsLabel: 'Recommended next',
      recommendations: [createEvent({ title: 'Recommendation Event' })],
      upcomingLabel: 'Planned next',
      upcoming: [createEvent({ id: '55555555-5555-4555-8555-555555555555', title: 'Upcoming Event' })],
      onboardingState: {
        hasCompleted: true,
        title: 'Profile calibrated',
        body: 'Your ranking model is using the richer career profile.',
        ctaLabel: null,
      },
    };

    mockMobileApi.getDashboardHome.mockResolvedValue({ success: true, data: dashboard });

    renderWithProviders(<DashboardScreen />);

    expect(await screen.findByText('Top Career Move')).toBeTruthy();
    expect(screen.getByText('Recommendation Event')).toBeTruthy();
    expect(screen.getByText('Upcoming Event')).toBeTruthy();
    expect(screen.getByText('Profile calibrated')).toBeTruthy();
  });

  it('navigates back from settings through the shared header action', async () => {
    renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Open career onboarding')).toBeTruthy();

    fireEvent.press(screen.getByText('Done'));

    await waitFor(() => expect(mockRouterBack).toHaveBeenCalled());
  });

  it('renders networking visibility controls in settings', async () => {
    renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText('Networking visibility')).toBeTruthy();
    await waitFor(() => expect(mockMobileApi.getSocialProfile).toHaveBeenCalled());
    expect(screen.getByText('Show my attendance')).toBeTruthy();
    expect(screen.getByLabelText('Toggle attendance visibility')).toBeTruthy();
  });
});
