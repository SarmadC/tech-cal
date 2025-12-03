import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DevelopersEventsCollector } from '../DevelopersEventsCollector';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DevelopersEventsCollector', () => {
    let collector: DevelopersEventsCollector;
    const mockSourceId = 'test-source-id';
    const mockSourceUrl = 'https://developers.events/all-events.json';

    beforeEach(() => {
        collector = new DevelopersEventsCollector({
            sourceId: mockSourceId,
            sourceUrl: mockSourceUrl,
            metadata: { provider: 'developers.events' },
        });
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should collect only events in 2026', async () => {
        const mockEvents = [
            {
                name: 'Event 2025',
                date: [new Date('2025-12-31').getTime()],
                hyperlink: 'https://event2025.com',
                location: 'City A',
                status: 'open',
                tags: ['tag1'],
            },
            {
                name: 'Event 2026',
                date: [new Date('2026-01-01').getTime()],
                hyperlink: 'https://event2026.com',
                location: 'City B',
                status: 'open',
                tags: ['tag2'],
            },
            {
                name: 'Event 2027',
                date: [new Date('2027-01-01').getTime()],
                hyperlink: 'https://event2027.com',
                location: 'City C',
                status: 'open',
                tags: ['tag3'],
            },
        ];

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockEvents,
        });

        const result = await collector.collect();

        expect(result.errors).toHaveLength(0);
        expect(result.records).toHaveLength(1);
        expect(result.records[0].record.title).toBe('Event 2026');
        expect(result.records[0].record.startTime).toBe(new Date('2026-01-01').toISOString());
    });

    it('should handle fetch errors gracefully', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const result = await collector.collect();

        expect(result.records).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('fetch_error');
    });

    it('should skip events with missing required fields', async () => {
        const mockEvents = [
            {
                name: 'Invalid Event',
                // Missing date
                hyperlink: 'https://invalid.com',
                location: 'City',
                status: 'open',
                tags: [],
            },
        ];

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockEvents,
        });

        const result = await collector.collect();

        expect(result.records).toHaveLength(0);
        expect(result.errors).toHaveLength(0); // Should just skip, not error (or error if validation fails?)
        // In our implementation, normalizeEvent returns null for missing fields, so it skips without error.
    });
});
