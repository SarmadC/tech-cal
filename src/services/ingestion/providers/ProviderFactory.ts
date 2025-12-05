import { env } from '@/utils/env';
import type { ExtractionProvider } from './ExtractionProvider';
import { GeminiExtractionProvider } from './GeminiExtractionProvider';

type ProviderName = 'gemini';

const providerCache: Partial<Record<ProviderName, ExtractionProvider>> = {};

const getProviderName = (override?: string): ProviderName => {
    const provider = (override || env('LLM_ENRICHMENT_PROVIDER', 'gemini')).toLowerCase();
    if (provider === 'gemini') return 'gemini';
    throw new Error(`Unsupported enrichment provider: ${provider}`);
};

export const getExtractionProvider = (
    providerOverride?: string,
    modelOverride?: string
): ExtractionProvider => {
    const providerName = getProviderName(providerOverride);
    if (providerCache[providerName]) {
        return providerCache[providerName] as ExtractionProvider;
    }

    let provider: ExtractionProvider;
    switch (providerName) {
        case 'gemini':
            provider = new GeminiExtractionProvider({
                model: modelOverride || env('LLM_ENRICHMENT_MODEL', 'gemini-1.5-flash'),
                apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
            });
            break;
        default:
            throw new Error(`Unsupported enrichment provider: ${providerName}`);
    }

    providerCache[providerName] = provider;
    return provider;
};

