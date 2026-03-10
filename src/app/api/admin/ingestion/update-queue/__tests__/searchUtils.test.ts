import { describe, expect, it } from 'vitest';
import {
    isUuidSearch,
    matchesUpdateQueueSearch,
    normalizeUpdateQueueSearch,
} from '../searchUtils';

describe('update queue search utils', () => {
    it('normalizes loose search input', () => {
        expect(normalizeUpdateQueueSearch('  DrupalCamp,   NJ%  ')).toBe('DrupalCamp NJ');
    });

    it('matches text searches against event titles and organizers', () => {
        expect(
            matchesUpdateQueueSearch(
                {
                    title: 'DrupalCamp NJ 2026',
                    organizerName: 'Open Source Community',
                },
                'drupalcamp'
            )
        ).toBe(true);

        expect(
            matchesUpdateQueueSearch(
                {
                    title: 'Enterprise Connect',
                    organizerName: 'Open Source Community',
                },
                'source community'
            )
        ).toBe(true);
    });

    it('matches uuid searches only against exact event and source ids', () => {
        const eventId = 'f69eb8ae-66a9-44a3-a706-afea2e130755';
        const sourceEventId = '84bcece9-9986-4a93-8122-61e177facf80';

        expect(isUuidSearch(eventId)).toBe(true);
        expect(
            matchesUpdateQueueSearch(
                {
                    eventId,
                    sourceEventId,
                    title: 'DrupalCamp NJ 2026',
                },
                eventId
            )
        ).toBe(true);
        expect(
            matchesUpdateQueueSearch(
                {
                    eventId,
                    sourceEventId,
                    title: 'DrupalCamp NJ 2026',
                },
                sourceEventId
            )
        ).toBe(true);
        expect(
            matchesUpdateQueueSearch(
                {
                    eventId,
                    sourceEventId,
                    title: 'DrupalCamp NJ 2026',
                },
                'f69eb8ae'
            )
        ).toBe(false);
    });
});
