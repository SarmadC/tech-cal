import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { MobileCalendarFeed } from '@kurecal/domain';
import CalendarScreen from '../app/(tabs)/calendar';
import { renderWithProviders } from './renderWithProviders';

const mockRouterPush: any = jest.fn();
const mockUseMobileAuth: any = jest.fn();
const mockMobileApi: any = {
  getCalendarFeed: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    back: jest.fn(),
  },
}));

jest.mock('@/lib/mobileApi', () => ({
  getMobileApiClient: () => mockMobileApi,
}));

jest.mock('@/hooks/useMobileAuth', () => ({
  useMobileAuth: () => mockUseMobileAuth(),
}));

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

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 3, 5, 9, 0, 0));

    mockUseMobileAuth.mockReturnValue({
      profile: { fullName: 'Ada Lovelace', timezone: 'America/Edmonton' },
      user: { id: '22222222-2222-4222-8222-222222222222', email: 'ada@example.com' },
    });
    mockMobileApi.getCalendarFeed.mockResolvedValue({
      success: true,
      data: createCalendarFeed(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('toggles the month grid from the month button', async () => {
    renderWithProviders(<CalendarScreen />);

    expect(await screen.findByText('Saved Event')).toBeTruthy();
    expect(await screen.findByText('Attending Event')).toBeTruthy();
    expect(screen.queryByText('Show more dates')).toBeNull();
    expect(screen.queryByText('April 2026')).toBeNull();

    fireEvent.press(screen.getByLabelText('Expand calendar'));

    expect(screen.getByText('April 2026')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Collapse calendar'));

    await waitFor(() => expect(screen.queryByText('April 2026')).toBeNull());
  });

  it('opens the month picker on long press and jumps months on apply', async () => {
    mockMobileApi.getCalendarFeed.mockImplementation(async (request?: { monthStart?: string }) => ({
      success: true,
      data: createCalendarFeed({
        month: {
          monthStart: request?.monthStart ?? '2026-04-01',
          monthEnd: request?.monthStart === '2026-03-01' ? '2026-03-31' : '2026-04-30',
          label: request?.monthStart === '2026-03-01' ? 'March 2026' : 'April 2026',
        },
      }),
    }));

    renderWithProviders(<CalendarScreen />);

    expect(await screen.findByText('Saved Event')).toBeTruthy();
    expect(screen.getByText('Attending Event')).toBeTruthy();

    fireEvent(screen.getByLabelText('Expand calendar'), 'longPress');
    expect(screen.getByText('Jump to date')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Previous month'));
    fireEvent.press(screen.getByLabelText('Choose March 14, 2026'));
    fireEvent.press(screen.getByText('Go to date'));

    await waitFor(() =>
      expect(mockMobileApi.getCalendarFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({ monthStart: '2026-03-01' })
      )
    );
  });

  it('opens the filter sheet and reapplies the feed with simplified filters', async () => {
    renderWithProviders(<CalendarScreen />);

    expect(await screen.findByText('Saved Event')).toBeTruthy();
    expect(screen.getByText('Attending Event')).toBeTruthy();
    expect(screen.queryByText('Show more dates')).toBeNull();

    fireEvent.press(screen.getByLabelText('Open calendar filters'));
    expect(screen.getByText('Calendar filters')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Location filter'), 'Calgary');
    await waitFor(() => expect(screen.getByText('Show 2')).toBeTruthy());
    fireEvent.press(screen.getByText('Show 2'));

    await waitFor(() =>
      expect(mockMobileApi.getCalendarFeed).toHaveBeenLastCalledWith(
        expect.objectContaining({ location: 'Calgary', monthStart: '2026-04-01' })
      )
    );
  });

  it('routes to native event detail from the month agenda', async () => {
    renderWithProviders(<CalendarScreen />);

    fireEvent.press(await screen.findByText('Saved Event'));

    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith('/event/11111111-1111-4111-8111-111111111111')
    );
  });
});
