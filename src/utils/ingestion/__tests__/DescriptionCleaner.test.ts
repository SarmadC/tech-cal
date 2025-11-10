import { describe, expect, it } from 'vitest';
import { cleanEventDescription } from '@/utils/ingestion/DescriptionCleaner';
import { normalizeDescription } from '@/services/ingestion/FirecrawlDataNormalizer';

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

describe('normalizeDescription', () => {
    it('prefers cleaned Firecrawl description over noisy existing content', () => {
        const raw =
            'FTT FINTECH FESTIVAL https://www.techmeme.com/r2/www.fintechtalents.com_events\nFrom Techmeme\'s event calendar http://www.techmeme.com/events';

        const existing =
            'FTT Fintech Festival https://www.techmeme.com/r2/www.fintechtalents.com_events\n\nFrom Techmeme\'s event calendar http://www.techmeme.com/events';

        const result = normalizeDescription(raw, existing);

        expect(result).toBe('FTT Fintech Festival');
    });

    it('falls back to existing cleaned description when new content missing', () => {
        const existing =
            'Join us in Barcelona for a two-day deep dive into serverless infrastructure and AI-assisted DevOps workflows.';

        const result = normalizeDescription(undefined, existing);

        expect(result).toBe(existing);
    });
});

