import { describe, expect, it } from '@jest/globals';
import {
  buildAgendaDayGroups,
  formatAgendaDayLabel,
} from '../components/event-detail/eventDetailUtils';

describe('eventDetailUtils', () => {
  it('groups agenda items by the event local day instead of UTC day boundaries', () => {
    const agenda = [
      {
        id: 'agenda-day-1',
        dayNumber: 1,
        startTime: '2026-04-22T08:40:00.000Z',
        endTime: '2026-04-22T09:20:00.000Z',
        title: 'Day 1 keynote',
        description: null,
        location: 'Hall A',
        type: 'keynote',
        track: null,
        topics: [],
        speakers: [],
      },
      {
        id: 'agenda-day-2-early',
        dayNumber: 2,
        startTime: '2026-04-22T23:30:00.000Z',
        endTime: '2026-04-23T00:00:00.000Z',
        title: 'Day 2 breakfast',
        description: null,
        location: 'Hall B',
        type: 'session',
        track: null,
        topics: [],
        speakers: [],
      },
      {
        id: 'agenda-day-2-late',
        dayNumber: 2,
        startTime: '2026-04-23T06:40:00.000Z',
        endTime: '2026-04-23T07:20:00.000Z',
        title: 'Day 2 keynote',
        description: null,
        location: 'Hall C',
        type: 'keynote',
        track: null,
        topics: [],
        speakers: [],
      },
    ];

    const groups = buildAgendaDayGroups(agenda, 'Australia/Sydney');

    expect(groups).toHaveLength(2);
    expect(groups[0]?.items).toHaveLength(1);
    expect(groups[1]?.items).toHaveLength(2);
    expect(formatAgendaDayLabel(groups[0]!, groups.length, 'Australia/Sydney')).toBe(
      'Day 1 · Wed, Apr 22'
    );
    expect(formatAgendaDayLabel(groups[1]!, groups.length, 'Australia/Sydney')).toBe(
      'Day 2 · Thu, Apr 23'
    );
  });
});
