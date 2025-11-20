import { describe, expect, it } from 'vitest';
import { isDescriptionThin } from '@/utils/ingestion/DescriptionHeuristics';

describe('isDescriptionThin', () => {
    it('returns true for empty descriptions', () => {
        expect(isDescriptionThin(undefined)).toBe(true);
        expect(isDescriptionThin(null)).toBe(true);
        expect(isDescriptionThin('   ')).toBe(true);
    });

    it('flags TechMeme boilerplate as thin', () => {
        const desc =
            "SLUSH https://www.techmeme.com/r2/slush.org_-K6CpWG7I.htm?cal=1\n\nFrom Techmeme's event calendar http://www.techmeme.com/events";
        expect(isDescriptionThin(desc, 'SLUSH')).toBe(true);
    });

    it('flags descriptions shorter than threshold', () => {
        expect(isDescriptionThin('Short blurb only', 'Short blurb only')).toBe(true);
        expect(isDescriptionThin('Just a few words', 'Different title')).toBe(true);
    });

    it('flags descriptions that match the title', () => {
        expect(isDescriptionThin('Global AI Summit', 'Global AI Summit')).toBe(true);
        expect(isDescriptionThin('global ai summit', 'Global AI Summit')).toBe(true);
    });

    it('returns false for substantive descriptions', () => {
        const fullDesc =
            'Join us in Lisbon for Web Summit 2025, a four-day technology conference featuring 1,200+ speakers, 2,000 startups, and curated networking sessions.';
        expect(isDescriptionThin(fullDesc, 'Web Summit')).toBe(false);
    });
});








