import { describe, expect, it } from 'vitest';

import {
    buildEventIdentityKeys,
    getEventIdentityYear,
    normalizeEventIdentityUrl,
} from '../eventIdentity';

describe('eventIdentity', () => {
    it('normalizes canonical urls before hashing identity keys', () => {
        const keys = buildEventIdentityKeys({
            startTime: '2026-03-26T18:00:00.000Z',
            sourceUrl: 'https://www.example.com/events/launch/?utm_source=test',
            registrationUrl: 'https://tickets.example.com/register/',
        });

        expect(keys).toEqual([
            expect.objectContaining({
                keyType: 'source_url',
                eventYear: 2026,
                rawValue: 'https://example.com/events/launch',
            }),
            expect.objectContaining({
                keyType: 'registration_url',
                eventYear: 2026,
                rawValue: 'https://tickets.example.com/register',
            }),
        ]);
    });

    it('includes exact external ids in the same event-year key space', () => {
        const keys = buildEventIdentityKeys({
            startTime: '2026-03-26T18:00:00.000Z',
            externalId: 'evt_12345',
        });

        expect(keys).toEqual([
            expect.objectContaining({
                keyType: 'external_id',
                eventYear: 2026,
                rawValue: 'evt_12345',
            }),
        ]);
    });

    it('returns null for invalid timestamps and empty urls', () => {
        expect(getEventIdentityYear('not-a-date')).toBeNull();
        expect(normalizeEventIdentityUrl('')).toBeNull();
        expect(buildEventIdentityKeys({
            startTime: 'not-a-date',
            sourceUrl: 'https://example.com/event',
        })).toEqual([]);
    });
});
