import { describe, expect, it, jest } from '@jest/globals';
import { screen } from '@testing-library/react-native';
import { SectionList, StyleSheet } from 'react-native';
import type { MobileCalendarEvent } from '@kurecal/domain';
import {
  buildAgendaSections,
  CalendarAgendaList,
  resolveInitialAgendaSectionIndex,
} from '@/components/calendar/CalendarAgendaList';
import { getThemeTokens } from '@/theme/tokens';
import { renderWithProviders } from './renderWithProviders';

function createEvent(overrides: Partial<MobileCalendarEvent>): MobileCalendarEvent {
  return {
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
    ...overrides,
  };
}

describe('CalendarAgendaList', () => {
  it('renders grouped day rails on a sticky SectionList without truncating the month agenda', () => {
    const view = renderWithProviders(
      <CalendarAgendaList
        events={[
          createEvent({}),
          createEvent({
            id: '44444444-4444-4444-8444-444444444444',
            title: 'Attending Event',
            location: 'Calgary',
            startTime: '2026-04-10T18:00:00.000Z',
            endTime: '2026-04-10T19:00:00.000Z',
          }),
        ]}
        monthStart="2026-04-01"
        selectedDate="2026-04-02"
        onPressEvent={jest.fn()}
      />
    );

    expect(view.UNSAFE_getByType(SectionList).props.stickySectionHeadersEnabled).toBe(true);
    expect(typeof view.UNSAFE_getByType(SectionList).props.onScrollToIndexFailed).toBe('function');
    expect(screen.getByText('Saved Event')).toBeTruthy();
    expect(screen.getByText('Attending Event')).toBeTruthy();
    expect(screen.getByText('Thu')).toBeTruthy();
    expect(screen.getByText('Fri')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('calendar-agenda-weekday-2026-04-02').props.style).color
    ).toBe(getThemeTokens('light').colors.danger);
    expect(screen.getAllByText('12:00 PM')).toHaveLength(2);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('calendar-agenda-time-11111111-1111-4111-8111-111111111111').props.style
      )
    ).toMatchObject({
      fontSize: 10,
      fontWeight: '600',
      color: getThemeTokens('light').colors.discoverTextMuted,
    });
    expect(screen.queryByText('Show more dates')).toBeNull();
  });

  it('treats midnight UTC date anchors without a timezone as all-day events on their stored day', () => {
    renderWithProviders(
      <CalendarAgendaList
        events={[
          createEvent({
            id: '55555555-5555-4555-8555-555555555555',
            title: 'Date Only Event',
            startTime: '2026-06-02T00:00:00.000Z',
            endTime: '2026-06-05T00:00:00.000Z',
            timezone: null,
            timeLabel: '5:00 PM - 5:00 PM',
          }),
        ]}
        monthStart="2026-06-01"
        selectedDate="2026-06-02"
        onPressEvent={jest.fn()}
      />
    );

    expect(screen.getByTestId('calendar-agenda-weekday-2026-06-02')).toBeTruthy();
    expect(screen.getByText('All day')).toBeTruthy();
    expect(screen.queryByText('5:00 PM')).toBeNull();
  });

  it('omits paid metadata while keeping free rows readable', () => {
    renderWithProviders(
      <CalendarAgendaList
        events={[
          createEvent({
            id: '66666666-6666-4666-8666-666666666666',
            title: 'Paid Event',
            location: 'Frankfurt, Germany',
            startTime: '2026-04-14T18:00:00.000Z',
            endTime: '2026-04-14T19:00:00.000Z',
            isFree: false,
            priceLabel: 'Paid',
          }),
          createEvent({
            id: '77777777-7777-4777-8777-777777777777',
            title: 'Free Event',
            location: 'Online',
            startTime: '2026-04-15T18:00:00.000Z',
            endTime: '2026-04-15T19:00:00.000Z',
            isFree: true,
            priceLabel: 'Free',
          }),
        ]}
        monthStart="2026-04-01"
        selectedDate="2026-04-14"
        onPressEvent={jest.fn()}
      />
    );

    expect(screen.getByText('Frankfurt, Germany')).toBeTruthy();
    expect(screen.getByText('Free')).toBeTruthy();
    expect(screen.queryByText('Paid')).toBeNull();
  });

  it('prefers today when it still has upcoming events, otherwise the next future section', () => {
    const sections = buildAgendaSections([
      createEvent({
        id: 'past-today',
        startTime: '2026-04-05T14:00:00.000Z',
        endTime: '2026-04-05T15:00:00.000Z',
      }),
      createEvent({
        id: 'future-today',
        startTime: '2026-04-05T18:00:00.000Z',
        endTime: '2026-04-05T19:00:00.000Z',
      }),
      createEvent({
        id: 'future-later',
        startTime: '2026-04-10T18:00:00.000Z',
        endTime: '2026-04-10T19:00:00.000Z',
      }),
    ]);

    expect(resolveInitialAgendaSectionIndex(sections, new Date('2026-04-05T15:30:00.000Z'))).toBe(0);

    const noFutureTodaySections = buildAgendaSections([
      createEvent({
        id: 'past-today-only',
        startTime: '2026-04-05T12:00:00.000Z',
        endTime: '2026-04-05T13:00:00.000Z',
      }),
      createEvent({
        id: 'future-next-day',
        startTime: '2026-04-10T18:00:00.000Z',
        endTime: '2026-04-10T19:00:00.000Z',
      }),
    ]);

    expect(
      resolveInitialAgendaSectionIndex(noFutureTodaySections, new Date('2026-04-05T15:30:00.000Z'))
    ).toBe(1);
  });
});
