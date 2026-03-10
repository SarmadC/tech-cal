import { describe, expect, it } from 'vitest';
import { normalizeAgendaTimeRangeForEvent } from '../agendaTimeNormalization';

describe('agendaTimeNormalization', () => {
    it('anchors local agenda times to the parent event date and timezone', () => {
        const normalized = normalizeAgendaTimeRangeForEvent(
            {
                startTime: '4:30pm',
                endTime: '5:15pm',
                dayNumber: 2,
                durationMinutes: null,
            },
            {
                eventStartTime: '2026-03-10T15:00:00.000Z',
                eventTimezone: 'America/New_York',
            }
        );

        expect(normalized).toEqual({
            startTime: '2026-03-11T20:30:00.000Z',
            endTime: '2026-03-11T21:15:00.000Z',
            durationMinutes: 45,
        });
    });

    it('rolls time-only end values to the next day when they cross midnight', () => {
        const normalized = normalizeAgendaTimeRangeForEvent(
            {
                startTime: '11:30pm',
                endTime: '12:15am',
                dayNumber: 1,
                durationMinutes: null,
            },
            {
                eventStartTime: '2026-03-10T15:00:00.000Z',
                eventTimezone: 'America/New_York',
            }
        );

        expect(normalized).toEqual({
            startTime: '2026-03-11T03:30:00.000Z',
            endTime: '2026-03-11T04:15:00.000Z',
            durationMinutes: 45,
        });
    });

    it('preserves absolute timestamps without needing an event anchor', () => {
        const normalized = normalizeAgendaTimeRangeForEvent(
            {
                startTime: '2026-03-10T16:30:00-04:00',
                endTime: '2026-03-10T17:15:00-04:00',
                durationMinutes: null,
            },
            {}
        );

        expect(normalized).toEqual({
            startTime: '2026-03-10T20:30:00.000Z',
            endTime: '2026-03-10T21:15:00.000Z',
            durationMinutes: 45,
        });
    });
});
