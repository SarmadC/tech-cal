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
});

