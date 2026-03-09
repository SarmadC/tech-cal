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
});
