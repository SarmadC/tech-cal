import type {
    ExtractionContext,
    ExtractionProviderResult,
} from '@/types/enrichment';

export interface ExtractionProviderRequest {
    content: string;
    context: ExtractionContext;
    abortSignal?: AbortSignal;
    model?: string;
}

export interface ExtractionProvider {
    name: string;
    extract(request: ExtractionProviderRequest): Promise<ExtractionProviderResult>;
}

