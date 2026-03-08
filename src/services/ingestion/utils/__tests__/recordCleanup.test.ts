import { describe, expect, it } from 'vitest';
import type { EventSourceRecord } from '@/types/ingestion';
import { applyIngestionRecordCleanup } from '../recordCleanup';

function buildRecord(overrides: Partial<EventSourceRecord> = {}): EventSourceRecord {
    return {
        title: 'Permissionless',
        startTime: '2026-09-01T15:00:00.000Z',
        location: 'Toronto (Canada)',
        organizer: 'Unknown',
        organizerDomain: 'techmeme.com',
        sourceUrl: 'https://www.techmeme.com/r2/blockworks.co_event_permissionless-RWjwjofT.htm?cal=1',
        provenance: {
            source_id: 'source-1',
            fetch_job_id: 'job-1',
            collector: 'rss',
            raw_hash: 'hash-1',
            quality_components: {
                source_trust: 1,
                metadata_completeness: 1,
                speaker_verification: 1,
                historical_performance: 1,
            },
            fetched_at: '2026-03-01T00:00:00.000Z',
        },
        confidence: 80,
        ...overrides,
    };
}

describe('applyIngestionRecordCleanup', () => {
    it('normalizes location and infers organizer from the canonical domain', () => {
        const record = buildRecord();

        applyIngestionRecordCleanup(record);

        expect(record.location).toBe('Toronto, Canada');
        expect(record.sourceUrl).toBe('https://blockworks.co/event/permissionless');
        expect(record.organizer).toBe('Blockworks');
        expect(record.organizerDomain).toBe('blockworks.co');
    });

    it('preserves a real organizer and only repairs the organizer domain', () => {
        const record = buildRecord({
            organizer: 'AWS Summit',
            organizerDomain: 'techmeme.com',
            sourceUrl: 'https://www.techmeme.com/r2/aws.amazon.com_summits_new-york-ABCDEFGH.htm?cal=1',
        });

        applyIngestionRecordCleanup(record);

        expect(record.organizer).toBe('AWS Summit');
        expect(record.organizerDomain).toBe('aws.amazon.com');
    });
});
