import type {
    ExtractionContext,
    ExtractionProviderResult,
} from '@/types/enrichment';

export interface ExtractionProviderDocument {
    url: string;
    label: string;
    content: string;
}

export interface ExtractionProviderRequest {
    content: string;
    context: ExtractionContext;
    abortSignal?: AbortSignal;
    model?: string;
    // Optional controlled vocabulary of tag names (already canonicalized)
    allowedTags?: string[];
    // Optional supporting documents collected from linked agenda/speaker/session pages
    documents?: ExtractionProviderDocument[];
}

export interface ExtractionProvider {
    name: string;
    extract(request: ExtractionProviderRequest): Promise<ExtractionProviderResult>;
}
