import { describe, expect, it } from 'vitest';
import {
    normalizeExtractedProviderPayload,
    normalizePricingCurrency,
    normalizeInferredProviderPayload,
    normalizePricingType,
} from '../GeminiExtractionProvider';

describe('GeminiExtractionProvider normalization', () => {
    it('normalizes pricing and event format values before validation', () => {
        const normalized = normalizeExtractedProviderPayload({
            pricing: { pricingType: 'fixed' },
            eventFormat: 'In person',
        }) as {
            pricing?: { pricingType?: string };
            eventFormat?: string;
        };

        expect(normalized.pricing?.pricingType).toBe('Paid');
        expect(normalized.eventFormat).toBe('In-person');
    });

    it('caps extracted tags at twenty-five allowed values', () => {
        const allowlist = Array.from({ length: 30 }, (_, index) => `Tag ${index + 1}`);
        const tags = Array.from({ length: 30 }, (_, index) => ` tag ${index + 1} `);

        const normalized = normalizeExtractedProviderPayload({ tags }, allowlist) as { tags?: string[] };

        expect(normalized.tags).toHaveLength(25);
        expect(normalized.tags?.[0]).toBe('Tag 1');
        expect(normalized.tags?.[24]).toBe('Tag 25');
    });

    it('truncates speaker bios before validation', () => {
        const normalized = normalizeExtractedProviderPayload({
            speakers: [
                {
                    name: 'Jane Doe',
                    bio: 'a'.repeat(800),
                },
            ],
        }) as {
            speakers?: Array<{ bio?: string }>;
        };

        expect(normalized.speakers?.[0]?.bio).toHaveLength(500);
    });

    it('caps speakers at fifty before validation', () => {
        const normalized = normalizeExtractedProviderPayload({
            speakers: Array.from({ length: 60 }, (_, index) => ({
                name: `Speaker ${index + 1}`,
            })),
        }) as {
            speakers?: Array<{ name: string }>;
        };

        expect(normalized.speakers).toHaveLength(50);
        expect(normalized.speakers?.[0]?.name).toBe('Speaker 1');
        expect(normalized.speakers?.[49]?.name).toBe('Speaker 50');
    });

    it('caps agenda items at one hundred before validation', () => {
        const normalized = normalizeExtractedProviderPayload({
            agenda: Array.from({ length: 120 }, (_, index) => ({
                title: `Session ${index + 1}`,
            })),
        }) as {
            agenda?: Array<{ title: string }>;
        };

        expect(normalized.agenda).toHaveLength(100);
        expect(normalized.agenda?.[0]?.title).toBe('Session 1');
        expect(normalized.agenda?.[99]?.title).toBe('Session 100');
    });

    it('preserves rich agenda fields and speaker social urls during normalization', () => {
        const normalized = normalizeExtractedProviderPayload({
            speakers: [
                {
                    name: 'Jane Doe',
                    twitterUrl: 'https://x.com/jane',
                    websiteUrl: 'https://janedoe.dev',
                },
            ],
            agenda: [
                {
                    title: 'Scaling Systems',
                    startTime: '09:00',
                    endTime: '10:00',
                    location: 'Room A',
                    track: 'Platform',
                    topics: ['Distributed Systems', '  Platform  ', 'Distributed Systems'],
                    dayNumber: '2',
                    agendaType: 'Keynote Session',
                    difficultyLevel: 'Advanced',
                    capacity: '300 seats',
                    prerequisites: 'Conference badge',
                    isRequired: 'required',
                    durationMinutes: '60',
                    speakers: [' Jane Doe ', 'Jane Doe'],
                },
            ],
        }) as {
            speakers?: Array<{ twitterUrl?: string; websiteUrl?: string }>;
            agenda?: Array<{
                location?: string;
                track?: string;
                topics?: string[];
                dayNumber?: number;
                agendaType?: string;
                difficultyLevel?: string;
                capacity?: number;
                prerequisites?: string;
                isRequired?: boolean;
                durationMinutes?: number;
                speakers?: string[];
            }>;
        };

        expect(normalized.speakers?.[0]).toEqual(
            expect.objectContaining({
                twitterUrl: 'https://x.com/jane',
                websiteUrl: 'https://janedoe.dev/',
            })
        );
        expect(normalized.agenda?.[0]).toEqual(
            expect.objectContaining({
                location: 'Room A',
                track: 'Platform',
                topics: ['Distributed Systems', 'Platform'],
                dayNumber: 2,
                agendaType: 'keynote',
                difficultyLevel: 'advanced',
                capacity: 300,
                prerequisites: 'Conference badge',
                isRequired: true,
                durationMinutes: 60,
                speakers: ['Jane Doe'],
            })
        );
    });

    it('drops invalid url fields before validation', () => {
        const normalized = normalizeExtractedProviderPayload({
            registrationUrl: '/register',
            speakers: [
                {
                    name: 'Jane Doe',
                    linkedinUrl: 'not-a-url',
                    photoUrl: '/images/jane.jpg',
                    twitterUrl: 'https://x.com/jane',
                    websiteUrl: 'https://janedoe.dev',
                },
            ],
        }) as {
            registrationUrl?: string;
            speakers?: Array<{
                linkedinUrl?: string;
                photoUrl?: string;
                twitterUrl?: string;
                websiteUrl?: string;
            }>;
        };

        expect(normalized.registrationUrl).toBeUndefined();
        expect(normalized.speakers?.[0]).toEqual(
            expect.objectContaining({
                twitterUrl: 'https://x.com/jane',
                websiteUrl: 'https://janedoe.dev/',
            })
        );
        expect(normalized.speakers?.[0]?.linkedinUrl).toBeUndefined();
        expect(normalized.speakers?.[0]?.photoUrl).toBeUndefined();
    });

    it('drops malformed speaker and agenda items instead of failing valid siblings', () => {
        const normalized = normalizeExtractedProviderPayload({
            speakers: [
                {
                    title: 'Missing name',
                },
                {
                    name: 'Jane Doe',
                    linkedinUrl: 'https://www.linkedin.com/in/jane-doe',
                },
            ],
            agenda: [
                {
                    startTime: '09:00',
                },
                {
                    title: 'Valid Session',
                    startTime: '09:00',
                },
            ],
        }) as {
            speakers?: Array<{ name: string }>;
            agenda?: Array<{ title: string }>;
        };

        expect(normalized.speakers).toEqual([
            expect.objectContaining({
                name: 'Jane Doe',
            }),
        ]);
        expect(normalized.agenda).toEqual([
            expect.objectContaining({
                title: 'Valid Session',
            }),
        ]);
    });

    it('normalizes inference tags with dedupe and cap', () => {
        const allowlist = Array.from({ length: 40 }, (_, index) => `Topic ${index + 1}`);
        const tags = ['topic 1', 'Topic 1', ...Array.from({ length: 35 }, (_, index) => `topic ${index + 2}`)];

        const normalized = normalizeInferredProviderPayload({ tags }, allowlist) as { tags?: string[] };

        expect(normalized.tags).toHaveLength(25);
        expect(normalized.tags?.[0]).toBe('Topic 1');
        expect(new Set(normalized.tags).size).toBe(normalized.tags?.length);
    });

    it('maps common pricing synonyms to canonical enums', () => {
        expect(normalizePricingType('Ticket')).toBe('Paid');
        expect(normalizePricingType('complimentary access')).toBe('Free');
        expect(normalizePricingType('pricing varies by pass')).toBe('Varies');
        expect(normalizePricingType('')).toBeUndefined();
    });

    it('normalizes loose currency values to ISO-like codes', () => {
        expect(normalizePricingCurrency('$')).toBe('USD');
        expect(normalizePricingCurrency('usd')).toBe('USD');
        expect(normalizePricingCurrency('US Dollars')).toBe('USD');
        expect(normalizePricingCurrency('Euro')).toBe('EUR');
        expect(normalizePricingCurrency('')).toBeUndefined();
    });

    it('drops invalid currency strings from extracted pricing payloads', () => {
        const normalized = normalizeExtractedProviderPayload({
            pricing: {
                pricingType: 'ticket',
                currency: 'US Dollars',
            },
        }) as {
            pricing?: { pricingType?: string; currency?: string };
        };

        expect(normalized.pricing?.pricingType).toBe('Paid');
        expect(normalized.pricing?.currency).toBe('USD');
    });

    it('cleans noisy extracted descriptions before validation', () => {
        const normalized = normalizeExtractedProviderPayload({
            description:
                'IIBA Poland Summit: For Community, From CommunityWhat can you expect from IIBA Poland Summit?Power-Packed 20-Minute TalksPower-Packed 20-Minute TalksPower-Packed 20-Minute TalksGet ready for sharp, inspiring talks that deliver big ideas in a short time. These 20-minute sessions are designed to spark new perspectives, challenge your thinking, and leave you energized to act.Immersive 40-Minute Deep DivesPower-Packed 20-Minute TalksPower-Packed 20-Minute TalksTake a closer look at key topics with focused, in-depth sessions led by industry experts. These 40-minute deep dives offer practical insights, real-world examples, and the space to explore challenges and solutions that truly matter.A Note from OrganizersWe are a non-profit, volunteer-based organization.',
        }) as { description?: string };

        expect(normalized.description).toBe(
            'Get ready for sharp, inspiring talks that deliver big ideas in a short time. These 20-minute sessions are designed to spark new perspectives, challenge your thinking, and leave you energized to act. Take a closer look at key topics with focused, in-depth sessions led by industry experts. These 40-minute deep dives offer practical insights, real-world examples, and the space to explore challenges and solutions that truly matter.'
        );
    });
});
