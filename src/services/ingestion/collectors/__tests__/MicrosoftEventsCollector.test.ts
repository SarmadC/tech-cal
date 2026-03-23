import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MicrosoftEventsCollector } from '../MicrosoftEventsCollector';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeCard(overrides: Record<string, unknown> = {}) {
    return {
        content: {
            id: crypto.randomUUID(),
            name: 'Test Event',
            title: 'Test Event',
            format: 'In person',
            formatEnglishName: 'In Person',
            description: 'A test event',
            action: {
                href: 'https://msevents.microsoft.com/event?id=123',
                text: 'Registration and details',
            },
            location: {
                city: 'London',
                state: null,
                country: 'United Kingdom',
            },
            eventDates: {
                startDate: '2026-06-15T09:00:00.0000000Z',
                endDate: '2026-06-15T17:00:00.0000000Z',
            },
            ...overrides,
        },
    };
}

function mockPageResponse(cards: unknown[], hasMorePages = false, totalCount?: number) {
    return {
        ok: true,
        json: async () => ({
            cards,
            totalCount: totalCount ?? cards.length,
            top: 50,
            skip: 0,
            hasMorePages,
        }),
    };
}

describe('MicrosoftEventsCollector', () => {
    let collector: MicrosoftEventsCollector;

    beforeEach(() => {
        collector = new MicrosoftEventsCollector({
            sourceId: 'test-source',
            sourceUrl: 'https://www.microsoft.com/msonecloudapi/events/cards',
            metadata: { provider: 'microsoft.events' },
        });
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should collect events from a single page', async () => {
        const card = makeCard({ name: 'Microsoft AI Tour - London', title: 'Microsoft AI Tour - London' });
        mockFetch.mockResolvedValue(mockPageResponse([card]));

        const result = await collector.collect();

        expect(result.errors).toHaveLength(0);
        expect(result.records).toHaveLength(1);
        expect(result.records[0].record.title).toBe('Microsoft AI Tour - London');
        expect(result.records[0].record.organizer).toBe('Microsoft');
        expect(result.records[0].record.eventFormat).toBe('in-person');
    });

    it('should paginate across multiple pages', async () => {
        const page1Cards = [makeCard({ id: '1', name: 'Event A' })];
        const page2Cards = [makeCard({ id: '2', name: 'Event B' })];

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ cards: page1Cards, totalCount: 2, top: 50, skip: 0, hasMorePages: true }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ cards: page2Cards, totalCount: 2, top: 50, skip: 50, hasMorePages: false }),
            });

        const result = await collector.collect();

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.records).toHaveLength(2);
    });

    it('should handle fetch errors gracefully', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const result = await collector.collect();

        expect(result.records).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('fetch_error');
    });

    it('should skip events with missing dates', async () => {
        const card = makeCard({ eventDates: { startDate: null, endDate: null } });
        mockFetch.mockResolvedValue(mockPageResponse([card]));

        const result = await collector.collect();

        expect(result.records).toHaveLength(0);
    });

    it('should skip events with missing action href', async () => {
        const card = makeCard({ action: { href: '', text: '' } });
        mockFetch.mockResolvedValue(mockPageResponse([card]));

        const result = await collector.collect();

        expect(result.records).toHaveLength(0);
    });

    it('should filter out past events', async () => {
        const card = makeCard({
            eventDates: {
                startDate: '2024-01-01T09:00:00.0000000Z',
                endDate: '2024-01-01T17:00:00.0000000Z',
            },
        });
        mockFetch.mockResolvedValue(mockPageResponse([card]));

        const result = await collector.collect();

        expect(result.records).toHaveLength(0);
    });

    it('should skip description when it is "NA"', async () => {
        const card = makeCard({ description: 'NA' });
        mockFetch.mockResolvedValue(mockPageResponse([card]));

        const result = await collector.collect();

        expect(result.records).toHaveLength(1);
        expect(result.records[0].record.description).toBeUndefined();
    });

    it('should map format strings correctly', async () => {
        const inPerson = makeCard({ id: '1', format: 'In person', formatEnglishName: 'In Person' });
        const digital = makeCard({ id: '2', format: 'Digital', formatEnglishName: 'Digital' });
        const hybrid = makeCard({ id: '3', format: 'Hybrid', formatEnglishName: 'Hybrid' });

        mockFetch.mockResolvedValue(mockPageResponse([inPerson, digital, hybrid]));

        const result = await collector.collect();

        expect(result.records[0].record.eventFormat).toBe('in-person');
        expect(result.records[1].record.eventFormat).toBe('virtual');
        expect(result.records[2].record.eventFormat).toBe('hybrid');
    });

    it('should build location from city, state, and country', async () => {
        const card = makeCard({
            location: { city: 'Sydney', state: 'New South Wales', country: 'Australia' },
        });
        mockFetch.mockResolvedValue(mockPageResponse([card]));

        const result = await collector.collect();

        expect(result.records[0].record.location).toBe('Sydney, New South Wales, Australia');
    });

    it('should handle null location parts gracefully', async () => {
        const card = makeCard({
            location: { city: 'Berlin', state: null, country: 'Germany' },
        });
        mockFetch.mockResolvedValue(mockPageResponse([card]));

        const result = await collector.collect();

        expect(result.records[0].record.location).toBe('Berlin, Germany');
    });

    it('should deduplicate events by content.id within a run', async () => {
        const sharedId = 'duplicate-id';
        const card1 = makeCard({ id: sharedId, name: 'Event Dupe' });
        const card2 = makeCard({ id: sharedId, name: 'Event Dupe' });

        mockFetch.mockResolvedValue(mockPageResponse([card1, card2]));

        const result = await collector.collect();

        expect(result.records).toHaveLength(1);
    });

    describe('series detection', () => {
        it('should detect series when 2+ events share a base name with city suffix', async () => {
            const london = makeCard({
                id: '1',
                name: 'Microsoft AI Tour - London',
                title: 'Microsoft AI Tour - London',
                location: { city: 'London', state: null, country: 'United Kingdom' },
            });
            const sydney = makeCard({
                id: '2',
                name: 'Microsoft AI Tour - Sydney',
                title: 'Microsoft AI Tour - Sydney',
                location: { city: 'Sydney', state: 'New South Wales', country: 'Australia' },
            });

            mockFetch.mockResolvedValue(mockPageResponse([london, sydney]));

            const result = await collector.collect();

            expect(result.records).toHaveLength(2);
            expect(result.records[0].record.seriesName).toBe('Microsoft AI Tour');
            expect(result.records[1].record.seriesName).toBe('Microsoft AI Tour');
        });

        it('should detect series when title ends with city name (no dash)', async () => {
            const sydney = makeCard({
                id: '1',
                name: 'Oracle AI World Tour Sydney',
                title: 'Oracle AI World Tour Sydney',
                location: { city: 'Sydney', state: null, country: 'Australia' },
            });
            const london = makeCard({
                id: '2',
                name: 'Oracle AI World Tour London',
                title: 'Oracle AI World Tour London',
                location: { city: 'London', state: null, country: 'United Kingdom' },
            });

            mockFetch.mockResolvedValue(mockPageResponse([sydney, london]));

            const result = await collector.collect();

            expect(result.records[0].record.seriesName).toBe('Oracle AI World Tour');
            expect(result.records[1].record.seriesName).toBe('Oracle AI World Tour');
        });

        it('should NOT assign seriesName for single-occurrence titles', async () => {
            const card = makeCard({
                name: 'Microsoft Build 2026',
                title: 'Microsoft Build 2026',
                location: { city: 'Seattle', state: 'Washington', country: 'United States' },
            });

            mockFetch.mockResolvedValue(mockPageResponse([card]));

            const result = await collector.collect();

            expect(result.records).toHaveLength(1);
            expect(result.records[0].record.seriesName).toBeUndefined();
        });

        it('should NOT assign seriesName when city does not match title suffix', async () => {
            const card1 = makeCard({
                id: '1',
                name: 'Azure Summit - Enterprise Edition',
                location: { city: 'London', state: null, country: 'United Kingdom' },
            });
            const card2 = makeCard({
                id: '2',
                name: 'Azure Summit - Developer Edition',
                location: { city: 'Paris', state: null, country: 'France' },
            });

            mockFetch.mockResolvedValue(mockPageResponse([card1, card2]));

            const result = await collector.collect();

            expect(result.records[0].record.seriesName).toBeUndefined();
            expect(result.records[1].record.seriesName).toBeUndefined();
        });
    });

    describe('extractSeriesBaseName', () => {
        it('extracts base from dash-separated city suffix', () => {
            expect(MicrosoftEventsCollector.extractSeriesBaseName('Microsoft AI Tour - London', 'London'))
                .toBe('Microsoft AI Tour');
        });

        it('extracts base from title ending with city', () => {
            expect(MicrosoftEventsCollector.extractSeriesBaseName('Oracle AI World Tour Sydney', 'Sydney'))
                .toBe('Oracle AI World Tour');
        });

        it('returns null when city does not match suffix', () => {
            expect(MicrosoftEventsCollector.extractSeriesBaseName('Azure Summit - Enterprise', 'London'))
                .toBeNull();
        });

        it('returns null when city is TBD', () => {
            expect(MicrosoftEventsCollector.extractSeriesBaseName('Some Event', 'TBD'))
                .toBeNull();
        });

        it('handles en-dash and em-dash separators', () => {
            expect(MicrosoftEventsCollector.extractSeriesBaseName('AI Tour \u2013 Berlin', 'Berlin'))
                .toBe('AI Tour');
            expect(MicrosoftEventsCollector.extractSeriesBaseName('AI Tour \u2014 Berlin', 'Berlin'))
                .toBe('AI Tour');
        });
    });
});
