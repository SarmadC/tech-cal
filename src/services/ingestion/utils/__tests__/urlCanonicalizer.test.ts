import { describe, expect, it } from 'vitest';
import type { EventSourceRecord } from '@/types/ingestion';
import { applyUrlCanonicalization } from '../urlCanonicalizer';

function buildRecord(): EventSourceRecord {
    return {
        title: 'Permissionless',
        startTime: '2026-09-01T15:00:00.000Z',
        location: 'Brooklyn (USA)',
        sourceUrl: 'https://www.techmeme.com/r2/blockworks.co_event_permissionless-RWjwjofT.htm?cal=1',
        registrationUrl: 'https://www.techmeme.com/r2/www.cisco.com-ABCDEFGH.htm?cal=1',
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
    };
}

describe('applyUrlCanonicalization', () => {
    it('resolves and normalizes Techmeme source and registration URLs', () => {
        const record = buildRecord();

        applyUrlCanonicalization(record);

        expect(record.sourceUrl).toBe('https://blockworks.co/event/permissionless');
        expect(record.registrationUrl).toBe('https://cisco.com');
        expect(record.sourceDomain).toBe('blockworks.co');
        expect(record.normalizedSourceUrl).toBe('https://blockworks.co/event/permissionless');
        expect(record.normalizedRegistrationUrl).toBe('https://cisco.com');
        expect(record.provenance.normalized_url).toBe('https://blockworks.co/event/permissionless');
        expect(record.provenance.registration_normalized_url).toBe('https://cisco.com');
    });
});
