import { describe, expect, it } from 'vitest';
import { cleanEventDescription } from '@/utils/ingestion/DescriptionCleaner';


describe('cleanEventDescription', () => {
    it('removes TechMeme boilerplate and URLs', () => {
        const input =
            "FTT FINTECH FESTIVAL https://www.techmeme.com/r2/www.fintechtalents.com_events\n\nFrom Techmeme's event calendar http://www.techmeme.com/events";

        const result = cleanEventDescription(input);

        expect(result).toBe('FTT Fintech Festival');
    });

    it('strips HTML, marketing copy, and collapses whitespace', () => {
        const input =
            '<div><h1>Register Now</h1><p>Join us in Berlin this September for three days of AI innovation.</p><p>Subscribe for updates.</p></div>';

        const result = cleanEventDescription(input);

        expect(result).toBe('Join us in Berlin this September for three days of AI innovation.');
    });

    it('normalizes all-caps lines while keeping acronyms', () => {
        const input = 'GLOBAL AI SUMMIT WITH NASA AND IBM';

        const result = cleanEventDescription(input);

        expect(result).toBe('Global AI Summit With NASA And IBM');
    });

    it('returns undefined when only boilerplate content remains', () => {
        const input = "From Techmeme's event calendar http://www.techmeme.com/events";

        const result = cleanEventDescription(input);

        expect(result).toBeUndefined();
    });
});



