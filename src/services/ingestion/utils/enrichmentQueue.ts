import type { EnrichmentMetadata } from '@/types/enrichment';
import type { FieldDiff } from '../EventUpdateService';

export const LLM_ENRICHMENT_REVIEW_REASON = 'llm_enrichment';
export const LLM_ENRICHMENT_MERGED_REVIEW_REASON = 'llm_enrichment_merged';
export const LLM_ENRICHMENT_REVIEW_REASONS = [
    LLM_ENRICHMENT_REVIEW_REASON,
    LLM_ENRICHMENT_MERGED_REVIEW_REASON,
] as const;

export interface QueueFieldSnapshot {
    field_name: string;
    old_value: unknown;
    new_value: unknown;
    confidence?: number | null;
}

export interface PendingEnrichmentCandidate {
    id: string;
    source_url?: string | null;
    start_time?: string | null;
    created_at?: string | null;
    enrichment_metadata?: EnrichmentMetadata | null;
}

export interface RelationReviewValue {
    ids: string[];
    labels: string[];
}

type SignatureField = Pick<FieldDiff, 'fieldName' | 'oldValue' | 'newValue' | 'confidence'> | QueueFieldSnapshot;

const hasFieldDiffShape = (field: SignatureField): field is Pick<FieldDiff, 'fieldName' | 'oldValue' | 'newValue' | 'confidence'> =>
    'fieldName' in field;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isRelationReviewValue = (value: unknown): value is RelationReviewValue =>
    isPlainObject(value)
    && Array.isArray(value.ids)
    && value.ids.every((id) => typeof id === 'string')
    && Array.isArray(value.labels)
    && value.labels.every((label) => typeof label === 'string');

const normalizeValue = (fieldName: string, value: unknown): unknown => {
    if (value === null || value === undefined) {
        return null;
    }

    if (isRelationReviewValue(value)) {
        return {
            ids: [...value.ids].sort(),
            labels: [...value.labels].sort((left, right) => left.localeCompare(right)),
        };
    }

    if (Array.isArray(value)) {
        const normalizedItems = value.map((item) => normalizeValue(fieldName, item));
        if (normalizedItems.every((item) => ['string', 'number', 'boolean'].includes(typeof item) || item === null)) {
            return [...normalizedItems].sort((left, right) =>
                JSON.stringify(left).localeCompare(JSON.stringify(right))
            );
        }
        return normalizedItems;
    }

    if (isPlainObject(value)) {
        return Object.keys(value)
            .sort()
            .reduce<Record<string, unknown>>((result, key) => {
                result[key] = normalizeValue(fieldName, value[key]);
                return result;
            }, {});
    }

    if (fieldName === 'tags' && typeof value === 'string') {
        return value.trim().toLowerCase();
    }

    return value;
};

export const buildReviewQueueSignature = (fields: SignatureField[]): string => {
    const normalized = fields
        .map((field) => {
            const fieldName = hasFieldDiffShape(field) ? field.fieldName : field.field_name;
            const oldValue = hasFieldDiffShape(field) ? field.oldValue : field.old_value;
            const newValue = hasFieldDiffShape(field) ? field.newValue : field.new_value;
            const confidence = hasFieldDiffShape(field) ? field.confidence ?? null : field.confidence ?? null;

            return {
                fieldName,
                oldValue: normalizeValue(fieldName, oldValue),
                newValue: normalizeValue(fieldName, newValue),
                confidence,
            };
        })
        .sort((left, right) => left.fieldName.localeCompare(right.fieldName));

    return JSON.stringify(normalized);
};

export const isRetryDue = (
    metadata: EnrichmentMetadata | null | undefined,
    now = new Date()
): boolean => {
    const nextRetryAfter = metadata?.next_retry_after;
    if (!nextRetryAfter) {
        return true;
    }

    const parsed = new Date(nextRetryAfter);
    if (Number.isNaN(parsed.getTime())) {
        return true;
    }

    return parsed.getTime() <= now.getTime();
};

const compareIso = (left?: string | null, right?: string | null): number => {
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;

    const leftTime = new Date(left).getTime();
    const rightTime = new Date(right).getTime();

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return leftTime - rightTime;
};

const prioritizeCandidates = <T extends PendingEnrichmentCandidate>(
    events: T[],
    limit: number,
    requireSourceUrl: boolean,
    now = new Date()
): T[] => {
    const dueCandidates = events.filter((event) => {
        if (requireSourceUrl && !event.source_url?.trim()) {
            return false;
        }

        return isRetryDue(event.enrichment_metadata, now);
    });

    const futureEvents = dueCandidates
        .filter((event) => {
            if (!event.start_time) return false;
            const startTime = new Date(event.start_time);
            return !Number.isNaN(startTime.getTime()) && startTime.getTime() >= now.getTime();
        })
        .sort((left, right) => compareIso(left.start_time, right.start_time) || compareIso(left.created_at, right.created_at));

    const unscheduledEvents = dueCandidates
        .filter((event) => !event.start_time)
        .sort((left, right) => compareIso(left.created_at, right.created_at));

    const pastEvents = dueCandidates
        .filter((event) => {
            if (!event.start_time) return false;
            const startTime = new Date(event.start_time);
            return !Number.isNaN(startTime.getTime()) && startTime.getTime() < now.getTime();
        })
        .sort((left, right) => compareIso(right.start_time, left.start_time) || compareIso(left.created_at, right.created_at));

    return [...futureEvents, ...unscheduledEvents, ...pastEvents].slice(0, limit);
};

export const selectPendingScrapeCandidates = <T extends PendingEnrichmentCandidate>(
    events: T[],
    limit: number,
    now = new Date()
): T[] => prioritizeCandidates(events, limit, true, now);

export const selectPendingInferenceCandidates = <T extends PendingEnrichmentCandidate>(
    events: T[],
    limit: number,
    now = new Date()
): T[] => prioritizeCandidates(events, limit, false, now);

export const extractRelationIds = (value: unknown): string[] | undefined => {
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
        return value;
    }

    if (isRelationReviewValue(value)) {
        return value.ids;
    }

    return undefined;
};

export const formatRelationLabels = (value: unknown): string[] | null => {
    if (isRelationReviewValue(value)) {
        return value.labels;
    }

    return null;
};

export const isLlmEnrichmentReviewReason = (reason: string | null | undefined): boolean =>
    typeof reason === 'string' && LLM_ENRICHMENT_REVIEW_REASONS.includes(
        reason as (typeof LLM_ENRICHMENT_REVIEW_REASONS)[number]
    );
