import { describe, expect, it } from 'vitest';

import {
    compareUpdateQueueItems,
    deriveUpdateQueueSignals,
    matchesSignalFilter,
    sortChangedFieldNames,
    sortQueueFields,
} from './updateQueueTriage';

describe('updateQueueTriage', () => {
    it('derives queue signals from review reason, schedule fields, and event timing', () => {
        const signals = deriveUpdateQueueSignals({
            requiresReviewReason: 'Protected field changed',
            eventStartTime: '2026-04-01T16:00:00.000Z',
            fieldNames: ['timezone', 'venue_name'],
            now: new Date('2026-03-22T12:00:00.000Z'),
        });

        expect(signals).toEqual({
            needsReview: true,
            hasScheduleChange: true,
            startsSoon: true,
            isPastEvent: false,
        });
    });

    it('matches signal filters against derived signal state', () => {
        const signals = {
            needsReview: false,
            hasScheduleChange: true,
            startsSoon: false,
            isPastEvent: true,
        };

        expect(matchesSignalFilter(signals, 'schedule_change')).toBe(true);
        expect(matchesSignalFilter(signals, 'past_event')).toBe(true);
        expect(matchesSignalFilter(signals, 'needs_review')).toBe(false);
    });

    it('sorts changed field names with schedule-critical items first', () => {
        expect(
            sortChangedFieldNames(['description', 'venue_name', 'timezone', 'start_time', 'source_url'])
        ).toEqual(['start_time', 'timezone', 'venue_name', 'source_url', 'description']);
    });

    it('sorts field records by status first and then review priority', () => {
        const ordered = sortQueueFields([
            { field_name: 'description', field_status: 'pending' },
            { field_name: 'venue_name', field_status: 'pending' },
            { field_name: 'start_time', field_status: 'approved' },
            { field_name: 'timezone', field_status: 'pending' },
        ]);

        expect(ordered.map((field) => `${field.field_status}:${field.field_name}`)).toEqual([
            'pending:timezone',
            'pending:venue_name',
            'pending:description',
            'approved:start_time',
        ]);
    });

    it('sorts queue items by urgency for event_start_time', () => {
        const now = new Date('2026-03-22T12:00:00.000Z');
        const items = [
            {
                created_at: '2026-03-21T12:00:00.000Z',
                status: 'pending',
                event: { start_time: null },
                fieldCounts: { total: 1, pending: 1, approved: 0, rejected: 0 },
            },
            {
                created_at: '2026-03-22T10:00:00.000Z',
                status: 'pending',
                event: { start_time: '2026-03-25T09:00:00.000Z' },
                fieldCounts: { total: 1, pending: 1, approved: 0, rejected: 0 },
            },
            {
                created_at: '2026-03-20T09:00:00.000Z',
                status: 'pending',
                event: { start_time: '2026-03-20T09:00:00.000Z' },
                fieldCounts: { total: 1, pending: 1, approved: 0, rejected: 0 },
            },
        ];

        const sorted = [...items].sort((left, right) =>
            compareUpdateQueueItems(left, right, 'event_start_time', 'asc', now)
        );

        expect(sorted.map((item) => item.event?.start_time)).toEqual([
            '2026-03-25T09:00:00.000Z',
            null,
            '2026-03-20T09:00:00.000Z',
        ]);
    });
});
