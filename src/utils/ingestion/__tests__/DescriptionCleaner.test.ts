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

    it('condenses repeated feature-grid copy into a shorter usable description', () => {
        const input =
            'IIBA Poland Summit: For Community, From CommunityWhat can you expect from IIBA Poland Summit?Power-Packed 20-Minute TalksPower-Packed 20-Minute TalksPower-Packed 20-Minute TalksGet ready for sharp, inspiring talks that deliver big ideas in a short time. These 20-minute sessions are designed to spark new perspectives, challenge your thinking, and leave you energized to act.Immersive 40-Minute Deep DivesPower-Packed 20-Minute TalksPower-Packed 20-Minute TalksTake a closer look at key topics with focused, in-depth sessions led by industry experts. These 40-minute deep dives offer practical insights, real-world examples, and the space to explore challenges and solutions that truly matter.A Note from OrganizersWe are a non-profit, volunteer-based organization. We aim to provide a valuable experience while keeping costs low through free and self-made tools.';

        const result = cleanEventDescription(input);

        expect(result).toBe(
            'Get ready for sharp, inspiring talks that deliver big ideas in a short time. These 20-minute sessions are designed to spark new perspectives, challenge your thinking, and leave you energized to act. Take a closer look at key topics with focused, in-depth sessions led by industry experts. These 40-minute deep dives offer practical insights, real-world examples, and the space to explore challenges and solutions that truly matter.'
        );
    });
});


