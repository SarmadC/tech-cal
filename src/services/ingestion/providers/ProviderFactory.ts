import { env } from '@/utils/env';
import type { ExtractionProvider } from './ExtractionProvider';
import { DEFAULT_GEMINI_MODEL, GeminiExtractionProvider } from './GeminiExtractionProvider';

type ProviderName = 'gemini';

const providerCache = new Map<string, ExtractionProvider>();

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
    const modelName = modelOverride || env('LLM_ENRICHMENT_MODEL', DEFAULT_GEMINI_MODEL);
    const cacheKey = `${providerName}:${modelName}`;

    const cachedProvider = providerCache.get(cacheKey);
    if (cachedProvider) {
        return cachedProvider;
    }

    let provider: ExtractionProvider;
    switch (providerName) {
        case 'gemini':
            provider = new GeminiExtractionProvider({
                model: modelName,
                apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
            });
            break;
        default:
            throw new Error(`Unsupported enrichment provider: ${providerName}`);
    }

    providerCache.set(cacheKey, provider);
    return provider;
};
