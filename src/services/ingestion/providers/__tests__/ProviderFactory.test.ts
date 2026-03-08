import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getExtractionProvider } from '../ProviderFactory';

const originalEnv = process.env;

describe('ProviderFactory', () => {
    beforeEach(() => {
        process.env = {
            ...originalEnv,
            GOOGLE_GENERATIVE_AI_API_KEY: 'test-key',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns gemini provider by default', () => {
        const provider = getExtractionProvider();
        expect(provider.name).toBe('gemini');
    });

    it('throws for unsupported provider', () => {
        expect(() => getExtractionProvider('unknown-provider')).toThrow();
    });

    it('caches providers by provider and model', () => {
        const defaultProvider = getExtractionProvider('gemini', 'gemini-1.5-flash');
        const sameModelProvider = getExtractionProvider('gemini', 'gemini-1.5-flash');
        const otherModelProvider = getExtractionProvider('gemini', 'gemini-2.0-flash');

        expect(defaultProvider).toBe(sameModelProvider);
        expect(otherModelProvider).not.toBe(defaultProvider);
    });
});
