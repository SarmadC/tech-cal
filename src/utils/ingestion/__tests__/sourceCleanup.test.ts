import { describe, expect, it } from 'vitest';
import {
    humanizeOrganizerNameFromDomain,
    isPlaceholderOrganizerName,
    normalizeLocationValue,
    resolveTechmemeUrl,
} from '../sourceCleanup';

describe('sourceCleanup', () => {
    it('resolves Techmeme redirect URLs for shared display and cleanup', () => {
        const input =
            'https://www.techmeme.com/r2/blockworks.co_event_permissionless-RWjwjofT.htm?cal=1';

        expect(resolveTechmemeUrl(input)).toBe('https://blockworks.co/event/permissionless');
    });

    it('normalizes parenthetical city-country locations', () => {
        expect(normalizeLocationValue('Toronto (Canada)')).toBe('Toronto, Canada');
        expect(normalizeLocationValue('San Francisco, CA, USA')).toBe('San Francisco, CA, USA');
        expect(normalizeLocationValue('Online')).toBe('Online');
    });

    it('does not rewrite virtual platform locations that use parentheses', () => {
        expect(normalizeLocationValue('Online (Zoom)')).toBe('Online (Zoom)');
    });

    it('humanizes organizer names from canonical domains', () => {
        expect(humanizeOrganizerNameFromDomain('events.linuxfoundation.org')).toBe('Linuxfoundation');
        expect(humanizeOrganizerNameFromDomain('blockworks.co')).toBe('Blockworks');
    });

    it('treats missing and placeholder organizers as unresolved', () => {
        expect(isPlaceholderOrganizerName(undefined)).toBe(true);
        expect(isPlaceholderOrganizerName('Unknown Organizer')).toBe(true);
        expect(isPlaceholderOrganizerName('Blockworks')).toBe(false);
    });
});
