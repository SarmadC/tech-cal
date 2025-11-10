import { describe, expect, it } from 'vitest';

import { resolveTechMemeRedirect } from '../urlResolver';

describe('resolveTechMemeRedirect', () => {
    it('resolves deep Techmeme redirect URLs', () => {
        const input =
            'https://www.techmeme.com/r2/www.gartner.com_en_conferences_na_infrastructure-operations-cloud-us-OV2bEoTc.htm?cal=1';

        const result = resolveTechMemeRedirect(input);

        expect(result).toContain(
            'https://www.gartner.com/en/conferences/na/infrastructure-operations-cloud-us'
        );
        expect(result).toHaveLength(1);
    });

    it('handles domain-only Techmeme redirects', () => {
        const input =
            'https://www.techmeme.com/r2/www.cisco.com-ABCDEFGH.htm?cal=1';

        const result = resolveTechMemeRedirect(input);

        expect(result).toEqual(['https://www.cisco.com']);
    });

    it('keeps legitimate hyphenated slugs', () => {
        const input =
            'https://www.techmeme.com/r2/www.example.com_events_future-of-ai-2024.htm?cal=1';

        const result = resolveTechMemeRedirect(input);

        expect(result).toContain(
            'https://www.example.com/events/future-of-ai-2024'
        );
    });

    it('provides bare and www variants for non-www domains', () => {
        const input =
            'https://www.techmeme.com/r2/mashable.com_events_future-of-ai-ABCDEFGH.htm?cal=1';

        const result = resolveTechMemeRedirect(input);

        expect(result).toEqual([
            'https://mashable.com/events/future-of-ai',
            'https://www.mashable.com/events/future-of-ai',
        ]);
    });
});


