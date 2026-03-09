import { describe, expect, it } from 'vitest';
import {
    normalizeExtractedProviderPayload,
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
});
