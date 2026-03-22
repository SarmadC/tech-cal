import { describe, expect, it } from 'vitest';

import {
    buildQueueContinuationLookupUrl,
    buildQueueReturnTo,
    isQueueReturnTo,
    readQueueReturnPage,
} from './updateQueueContinuation';

describe('updateQueueContinuation', () => {
    it('recognizes update queue return targets', () => {
        expect(isQueueReturnTo('/admin/ingestion/update-queue?page=2')).toBe(true);
        expect(isQueueReturnTo('/admin/ingestion/enrichment?page=2')).toBe(false);
    });

    it('reads the current queue page from returnTo', () => {
        expect(readQueueReturnPage('/admin/ingestion/update-queue?page=4&pageSize=25')).toBe(4);
        expect(readQueueReturnPage('/admin/ingestion/update-queue')).toBe(1);
        expect(readQueueReturnPage('/admin/ingestion/update-queue?page=0')).toBe(1);
    });

    it('builds a queue continuation lookup URL that preserves queue context', () => {
        const lookupUrl = buildQueueContinuationLookupUrl(
            '/admin/ingestion/update-queue?page=2&pageSize=1&q=launch&signal=starts_soon&sort=created_at&direction=desc'
        );

        expect(lookupUrl).not.toBeNull();

        const parsed = new URL(lookupUrl ?? '', 'http://localhost');
        expect(parsed.pathname).toBe('/api/admin/ingestion/update-queue');
        expect(parsed.searchParams.get('page')).toBe('2');
        expect(parsed.searchParams.get('pageSize')).toBe('2');
        expect(parsed.searchParams.get('q')).toBe('launch');
        expect(parsed.searchParams.get('signal')).toBe('starts_soon');
        expect(parsed.searchParams.get('sort')).toBe('created_at');
        expect(parsed.searchParams.get('direction')).toBe('desc');
        expect(parsed.searchParams.get('status')).toBe('pending');
    });

    it('fills in default sort and direction when they are missing', () => {
        const lookupUrl = buildQueueContinuationLookupUrl('/admin/ingestion/update-queue?page=3');
        const parsed = new URL(lookupUrl ?? '', 'http://localhost');

        expect(parsed.searchParams.get('sort')).toBe('event_start_time');
        expect(parsed.searchParams.get('direction')).toBe('asc');
        expect(parsed.searchParams.get('pageSize')).toBe('20');
    });

    it('rewrites queue return targets to a different page', () => {
        expect(
            buildQueueReturnTo(
                '/admin/ingestion/update-queue?page=2&pageSize=20&sort=event_start_time',
                1
            )
        ).toBe('/admin/ingestion/update-queue?page=1&pageSize=20&sort=event_start_time');
    });
});
