import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking, Share, StyleSheet } from 'react-native';
import type { MobileEventDetail } from '@kurecal/domain';
import EventDetailScreen from '../app/event/[id]';
import {
  buildAgendaDayGroups,
  formatAgendaDayMeta,
  formatAgendaStartTime,
  formatAgendaTimeRange,
  formatEventDateTime,
  formatEventStartDateTime,
} from '../components/event-detail/eventDetailUtils';
import { getThemeTokens } from '../theme/tokens';
import { renderWithProviders } from './renderWithProviders';

const mockRouterBack: any = jest.fn();
const mockUseLocalSearchParams: any = jest.fn();
const mockUseMobileAuth: any = jest.fn();
const mockMobileApi: any = {
  getEvent: jest.fn(),
};
const mockGetEventEngagement: any = jest.fn();
const mockToggleEventBookmark: any = jest.fn();
const mockUpdateEventAttendance: any = jest.fn();

jest.mock('expo-router', () => ({
  router: {
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

jest.mock('@/lib/eventEngagement', () => ({
  getEventEngagement: (...args: unknown[]) => mockGetEventEngagement(...args),
  toggleEventBookmark: (...args: unknown[]) => mockToggleEventBookmark(...args),
  updateEventAttendance: (...args: unknown[]) => mockUpdateEventAttendance(...args),
}));

jest.mock('expo-calendar', () => ({
  EntityTypes: {
    EVENT: 'event',
  },
  requestCalendarPermissionsAsync: jest.fn(async () => ({ status: 'granted' as const })),
  getCalendarsAsync: jest.fn(async () => [{ id: 'calendar-1', allowsModifications: true }]),
  createEventAsync: jest.fn(async () => 'device-event-id'),
}));

function createDetail(overrides: Partial<MobileEventDetail> = {}): MobileEventDetail {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Expo Event Detail',
    metaLabel: 'Conference',
    description:
      'A long event description that matches the web mobile panel structure and gives enough copy to validate the overview section in tests.'.repeat(
        2
      ),
    location: 'Calgary',
    startTime: '2026-04-10T18:00:00.000Z',
    endTime: '2026-04-10T19:00:00.000Z',
    timezone: 'America/Edmonton',
    sourceUrl: 'https://example.com/events/expo-event-detail',
    registrationUrl: 'https://tickets.example.com/expo-event-detail',
    imageUrl: 'https://example.com/event.png',
    host: {
      name: 'KureCal',
      logoUrl: null,
    },
    tags: [
      { id: 'tag-1', name: 'AI', color: '#3B82F6', category: 'technology' },
      { id: 'tag-2', name: 'Leadership', color: '#22C55E', category: 'career' },
    ],
    agenda: [
      {
        id: 'agenda-1',
        dayNumber: 1,
        startTime: '2026-04-10T18:00:00.000Z',
        endTime: '2026-04-10T18:45:00.000Z',
        title: 'Opening keynote',
        description: 'Start here.',
        location: 'Main stage',
        type: 'keynote',
        track: 'General',
        topics: ['AI'],
        speakers: [
          {
            id: 'speaker-1',
            name: 'Ada Lovelace',
            title: 'Founder',
            company: 'Analytical Engines',
            photoUrl: null,
          },
        ],
      },
    ],
    speakerLineup: [
      {
        id: 'speaker-1',
        name: 'Ada Lovelace',
        title: 'Founder',
        company: 'Analytical Engines',
        photoUrl: null,
      },
      {
        id: 'speaker-2',
        name: 'Grace Hopper',
        title: 'Engineer',
        company: 'Compilers Inc.',
        photoUrl: null,
      },
      {
        id: 'speaker-3',
        name: 'Margaret Hamilton',
        title: 'Lead',
        company: 'Apollo',
        photoUrl: null,
      },
      {
        id: 'speaker-4',
        name: 'Katherine Johnson',
        title: 'Scientist',
        company: 'NASA',
        photoUrl: null,
      },
      {
        id: 'speaker-5',
        name: 'Joan Clarke',
        title: 'Analyst',
        company: 'Bletchley',
        photoUrl: null,
      },
    ],
    engagement: {
      isBookmarked: false,
      status: null,
    },
    ...overrides,
  };
}

describe('EventDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({
      id: '11111111-1111-4111-8111-111111111111',
    });
    mockUseMobileAuth.mockReturnValue({
      user: { id: '22222222-2222-4222-8222-222222222222', email: 'ada@example.com' },
    });
    mockMobileApi.getEvent.mockResolvedValue({
      success: true,
      data: createDetail(),
    });
    mockGetEventEngagement.mockResolvedValue({
      isBookmarked: false,
      status: null,
    });
    mockToggleEventBookmark.mockResolvedValue({
      isBookmarked: true,
      status: null,
    });
    mockUpdateEventAttendance.mockResolvedValue({
      isBookmarked: false,
      status: 'attending',
    });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  });

  it('renders the web-parity detail sections and expands agenda groups', async () => {
    const detail = createDetail();
    renderWithProviders(<EventDetailScreen />);

    expect(await screen.findByTestId('event-detail-title')).toBeTruthy();
    expect(screen.getByText('When')).toBeTruthy();
    expect(screen.getByText('Where')).toBeTruthy();
    expect(screen.getByText('Hosted by')).toBeTruthy();
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Agenda')).toBeTruthy();
    expect(screen.getByText('Speakers')).toBeTruthy();
    expect(
      screen.getByText(formatEventStartDateTime(detail.startTime, detail.timezone))
    ).toBeTruthy();
    expect(
      screen.queryByText(formatEventDateTime(detail.startTime, detail.endTime, detail.timezone))
    ).toBeNull();

    const firstAgendaGroup = buildAgendaDayGroups(detail.agenda, detail.timezone)[0];
    fireEvent.press(screen.getByTestId(`event-detail-agenda-${firstAgendaGroup?.key}`));

    expect(await screen.findByText('Opening keynote')).toBeTruthy();
    expect(screen.getByText(formatAgendaDayMeta(detail.agenda, detail.timezone))).toBeTruthy();
    expect(screen.getByText(formatAgendaStartTime(detail.agenda[0]!, detail.timezone))).toBeTruthy();
    expect(screen.queryByText(formatAgendaTimeRange(detail.agenda[0]!, detail.timezone))).toBeNull();
    expect(screen.getByTestId('event-detail-speakers-toggle')).toBeTruthy();
  });

  it('uses the primary CTA to open registration without changing attendance', async () => {
    renderWithProviders(<EventDetailScreen />);

    fireEvent.press(await screen.findByTestId('event-detail-primary-action'));

    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith('https://tickets.example.com/expo-event-detail')
    );
    expect(mockUpdateEventAttendance).not.toHaveBeenCalled();
  });

  it('falls back to device calendar when no external registration exists', async () => {
    const Calendar = require('expo-calendar');
    mockMobileApi.getEvent.mockResolvedValueOnce({
      success: true,
      data: createDetail({
        registrationUrl: null,
        sourceUrl: null,
      }),
    });

    renderWithProviders(<EventDetailScreen />);

    fireEvent.press(await screen.findByTestId('event-detail-primary-action'));

    await waitFor(() => expect(Calendar.requestCalendarPermissionsAsync).toHaveBeenCalled());
    await waitFor(() => expect(Calendar.createEventAsync).toHaveBeenCalled());
  });

  it('updates bookmark state from the footer action', async () => {
    renderWithProviders(<EventDetailScreen />);

    fireEvent.press(await screen.findByTestId('event-detail-bookmark-action'));

    await waitFor(() =>
      expect(mockToggleEventBookmark).toHaveBeenCalledWith(
        '22222222-2222-4222-8222-222222222222',
        '11111111-1111-4111-8111-111111111111',
        true
      )
    );
  });

  it('updates attendance state from the footer action', async () => {
    renderWithProviders(<EventDetailScreen />);

    fireEvent.press(await screen.findByTestId('event-detail-attendance-action'));

    await waitFor(() =>
      expect(mockUpdateEventAttendance).toHaveBeenCalledWith(
        '22222222-2222-4222-8222-222222222222',
        '11111111-1111-4111-8111-111111111111',
        'attending'
      )
    );
  });

  it('renders a yellow saved bookmark state when the event is already bookmarked', async () => {
    mockGetEventEngagement.mockResolvedValueOnce({
      isBookmarked: true,
      status: null,
    });

    renderWithProviders(<EventDetailScreen />);

    const bookmarkButton = await screen.findByTestId('event-detail-bookmark-action');
    const bookmarkStyles = StyleSheet.flatten(
      typeof bookmarkButton.props.style === 'function'
        ? bookmarkButton.props.style({ pressed: false })
        : bookmarkButton.props.style
    );

    expect(bookmarkButton.props.accessibilityLabel).toBe('Remove saved event');
    expect(bookmarkStyles.backgroundColor).toBe(getThemeTokens('light').colors.warning);
    expect(bookmarkStyles.borderColor).toBe(getThemeTokens('light').colors.warning);
  });

  it('opens overflow actions for share and event page links', async () => {
    renderWithProviders(<EventDetailScreen />);

    fireEvent.press(await screen.findByTestId('event-detail-overflow-trigger'));
    fireEvent.press(screen.getByText('Share event'));

    await waitFor(() => expect(Share.share).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('event-detail-overflow-trigger'));
    fireEvent.press(screen.getByText('Visit event page'));

    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/events/expo-event-detail')
    );
  });
});
