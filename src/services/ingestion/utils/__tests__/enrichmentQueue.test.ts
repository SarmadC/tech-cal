import { describe, expect, it } from 'vitest';
import {
    buildReviewQueueSignature,
    extractRelationIds,
    isLlmEnrichmentReviewReason,
    isRetryDue,
    selectPendingInferenceCandidates,
    selectPendingScrapeCandidates,
} from '../enrichmentQueue';

describe('enrichmentQueue utilities', () => {
    it('builds stable signatures for tag review payloads regardless of order', () => {
        const signatureA = buildReviewQueueSignature([
            {
                fieldName: 'tags',
                oldValue: { ids: ['b', 'a'], labels: ['Beta', 'Alpha'] },
                newValue: { ids: ['d', 'c'], labels: ['Delta', 'Charlie'] },
                confidence: null,
            },
        ]);

        const signatureB = buildReviewQueueSignature([
            {
                fieldName: 'tags',
                oldValue: { ids: ['a', 'b'], labels: ['Alpha', 'Beta'] },
                newValue: { ids: ['c', 'd'], labels: ['Charlie', 'Delta'] },
                confidence: null,
            },
        ]);

        expect(signatureA).toBe(signatureB);
    });

    it('treats retry metadata as due when next_retry_after is missing or elapsed', () => {
        const now = new Date('2026-03-08T12:00:00.000Z');

        expect(isRetryDue(undefined, now)).toBe(true);
        expect(isRetryDue({ enrichment_source: 'llm', retry_count: 1 }, now)).toBe(true);
        expect(
            isRetryDue(
                {
                    enrichment_source: 'llm',
                    retry_count: 1,
                    next_retry_after: '2026-03-08T11:59:59.000Z',
                },
                now
            )
        ).toBe(true);
        expect(
            isRetryDue(
                {
                    enrichment_source: 'llm',
                    retry_count: 1,
                    next_retry_after: '2026-03-08T12:05:00.000Z',
                },
                now
            )
        ).toBe(false);
    });

    it('prioritizes future scrape candidates and skips rows without source URLs', () => {
        const now = new Date('2026-03-08T12:00:00.000Z');
        const candidates = selectPendingScrapeCandidates(
            [
                {
                    id: 'past',
                    source_url: 'https://example.com/past',
                    start_time: '2026-03-01T12:00:00.000Z',
                    created_at: '2026-03-01T12:00:00.000Z',
                    enrichment_metadata: { enrichment_source: 'llm', retry_count: 0 },
                },
                {
                    id: 'future-late',
                    source_url: 'https://example.com/future-late',
                    start_time: '2026-03-12T12:00:00.000Z',
                    created_at: '2026-03-08T08:00:00.000Z',
                    enrichment_metadata: { enrichment_source: 'llm', retry_count: 0 },
                },
                {
                    id: 'missing-url',
                    source_url: '',
                    start_time: '2026-03-09T12:00:00.000Z',
                    created_at: '2026-03-08T07:00:00.000Z',
                    enrichment_metadata: { enrichment_source: 'llm', retry_count: 0 },
                },
                {
                    id: 'future-soon',
                    source_url: 'https://example.com/future-soon',
                    start_time: '2026-03-09T12:00:00.000Z',
                    created_at: '2026-03-08T06:00:00.000Z',
                    enrichment_metadata: { enrichment_source: 'llm', retry_count: 0 },
                },
            ],
            3,
            now
        );

        expect(candidates.map((candidate) => candidate.id)).toEqual(['future-soon', 'future-late', 'past']);
    });

    it('prioritizes future inference candidates and respects retry backoff', () => {
        const now = new Date('2026-03-08T12:00:00.000Z');
        const candidates = selectPendingInferenceCandidates(
            [
                {
                    id: 'blocked',
                    start_time: '2026-03-09T12:00:00.000Z',
                    created_at: '2026-03-08T06:00:00.000Z',
                    enrichment_metadata: {
                        enrichment_source: 'llm',
                        retry_count: 1,
                        next_retry_after: '2026-03-08T12:30:00.000Z',
                    },
                },
                {
                    id: 'future',
                    start_time: '2026-03-10T12:00:00.000Z',
                    created_at: '2026-03-08T07:00:00.000Z',
                    enrichment_metadata: { enrichment_source: 'llm', retry_count: 0 },
                },
                {
                    id: 'unscheduled',
                    created_at: '2026-03-08T05:00:00.000Z',
                    enrichment_metadata: { enrichment_source: 'llm', retry_count: 0 },
                },
            ],
            5,
            now
        );

        expect(candidates.map((candidate) => candidate.id)).toEqual(['future', 'unscheduled']);
    });

    it('extracts relation ids from array and object queue payloads', () => {
        expect(extractRelationIds(['a', 'b'])).toEqual(['a', 'b']);
        expect(extractRelationIds({ ids: ['a', 'b'], labels: ['Alpha', 'Beta'] })).toEqual(['a', 'b']);
        expect(extractRelationIds({ labels: ['Alpha'] })).toBeUndefined();
    });

    it('recognizes both primary and merged llm review queue reasons', () => {
        expect(isLlmEnrichmentReviewReason('llm_enrichment')).toBe(true);
        expect(isLlmEnrichmentReviewReason('llm_enrichment_merged')).toBe(true);
        expect(isLlmEnrichmentReviewReason('Fields require review: tags')).toBe(false);
    });
});
