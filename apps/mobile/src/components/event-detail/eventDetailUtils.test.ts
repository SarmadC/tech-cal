import { describe, expect, it } from 'vitest';

import {
  buildAgendaSecondaryText,
  formatAgendaDayLabel,
  formatAgendaSessionCount,
  formatEventDateTime,
  getAttendanceCtaState,
  type AgendaDayGroup,
} from './eventDetailUtils';

const EVENT = {
  startTime: '2026-05-24T16:00:00.000Z',
  endTime: '2026-05-24T18:00:00.000Z',
};

describe('getAttendanceCtaState', () => {
  it('uses RSVP controls until the event ends', () => {
    const now = new Date('2026-05-24T17:00:00.000Z').getTime();

    expect(getAttendanceCtaState(EVENT, undefined, now).label).toBe('Attend');
    expect(
      getAttendanceCtaState(EVENT, { isBookmarked: true, status: 'attending' }, now)
        .label
    ).toBe('Attending');
  });

  it('prompts any past-event visitor to confirm actual attendance', () => {
    const now = new Date('2026-05-24T19:00:00.000Z').getTime();

    expect(getAttendanceCtaState(EVENT, undefined, now).label).toBe('I attended');
    expect(
      getAttendanceCtaState(EVENT, { isBookmarked: true, status: 'attending' }, now)
        .label
    ).toBe('Confirm attendance');
  });

  it('opens review for an already attended event', () => {
    const state = getAttendanceCtaState(
      EVENT,
      { isBookmarked: true, status: 'attended' },
      new Date('2026-05-24T19:00:00.000Z').getTime()
    );

    expect(state.action).toBe('review');
    expect(state.label).toBe('Attended');
  });

  it('falls back to start time when no end time is present', () => {
    const state = getAttendanceCtaState(
      { startTime: EVENT.startTime, endTime: null },
      undefined,
      new Date('2026-05-24T16:01:00.000Z').getTime()
    );

    expect(state.label).toBe('I attended');
  });
});

describe('event date presentation', () => {
  it('shows only the date for a single-day event', () => {
    expect(
      formatEventDateTime(
        '2026-05-24T16:00:00.000Z',
        '2026-05-24T18:00:00.000Z',
        'UTC'
      )
    ).toBe('May 24');
  });

  it('shows a date range for a multi-day event', () => {
    expect(
      formatEventDateTime(
        '2026-05-24T16:00:00.000Z',
        '2026-05-25T18:00:00.000Z',
        'UTC'
      )
    ).toBe('May 24 to May 25');
  });

  it('uses the event timezone to determine whether dates span multiple days', () => {
    expect(
      formatEventDateTime(
        '2026-05-24T23:00:00.000Z',
        '2026-05-25T01:00:00.000Z',
        'America/Edmonton'
      )
    ).toBe('May 24');
  });

  it('falls back to the start date when the end timestamp is invalid', () => {
    expect(formatEventDateTime('2026-05-24T16:00:00.000Z', 'invalid', 'UTC')).toBe(
      'May 24'
    );
  });
});

describe('agenda presentation helpers', () => {
  const group: AgendaDayGroup = {
    key: 'date:2026-08-26',
    displayDayNumber: 1,
    items: [
      {
        id: 'agenda-1',
        dayNumber: 1,
        startTime: '2026-08-26T09:00:00.000Z',
        endTime: '2026-08-26T10:00:00.000Z',
        title: 'Opening session',
        track: 'Main track',
        location: 'Hall A',
        speakers: [
          {
            id: 'speaker-1',
            name: 'Jay Stein',
          },
        ],
      },
      {
        id: 'agenda-2',
        dayNumber: 1,
        startTime: '2026-08-26T10:00:00.000Z',
        endTime: '2026-08-26T11:00:00.000Z',
        title: 'Second session',
        speakers: [],
      },
    ],
  };

  it('formats agenda day headers without weekday names', () => {
    expect(formatAgendaDayLabel(group, 'UTC')).toBe('Day 1 · Aug 26');
  });

  it('formats session counts without start times', () => {
    expect(formatAgendaSessionCount(group.items)).toBe('2 sessions');
  });

  it('omits speaker names from agenda secondary text', () => {
    expect(buildAgendaSecondaryText(group.items[0]!)).toBe('Main track · Hall A');
  });
});
