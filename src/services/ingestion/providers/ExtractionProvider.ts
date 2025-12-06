import type {
    ExtractionContext,
    ExtractionProviderResult,
} from '@/types/enrichment';

export interface ExtractionProviderRequest {
    content: string;
    context: ExtractionContext;
    abortSignal?: AbortSignal;
    model?: string;
    // Optional controlled vocabulary of tag names (already canonicalized)
    allowedTags?: string[];
}

export interface ExtractionProvider {
    name: string;
    extract(request: ExtractionProviderRequest): Promise<ExtractionProviderResult>;
}

