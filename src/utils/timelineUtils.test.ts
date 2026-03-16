import { describe, expect, it } from 'vitest';

import { getSpeakerAvatarUrls } from './timelineUtils';

describe('getSpeakerAvatarUrls', () => {
    it('encodes LinkedIn profile URLs for unavatar lookups', () => {
        const urls = getSpeakerAvatarUrls({
            name: 'Jane Doe',
            linkedinUrl: 'https://www.linkedin.com/in/jane-doe',
        });

        expect(urls.primary).toBe(
            'https://unavatar.io/https%3A%2F%2Fwww.linkedin.com%2Fin%2Fjane-doe'
        );
    });

    it('normalizes protocol-relative photo urls', () => {
        const urls = getSpeakerAvatarUrls({
            name: 'Jane Doe',
            photoUrl: '//cdn.example.com/jane.jpg',
        });

        expect(urls.primary).toBe('https://cdn.example.com/jane.jpg');
    });

    it('falls back to generated initials avatar for invalid external urls', () => {
        const urls = getSpeakerAvatarUrls({
            name: 'Jane Doe',
            photoUrl: '/images/jane.jpg',
            linkedinUrl: 'jane-doe',
        });

        expect(urls.primary).toBe(urls.fallback);
        expect(urls.fallback).toContain('ui-avatars.com/api/');
        expect(urls.fallback).toContain('format=png');
    });

    it('uses a png fallback for unicode speaker names', () => {
        const urls = getSpeakerAvatarUrls({
            name: 'Łukasz Langa',
        });

        expect(urls.primary).toBe(
            'https://ui-avatars.com/api/?name=%C5%81ukasz%20Langa&size=40&background=random&format=png'
        );
    });
});
