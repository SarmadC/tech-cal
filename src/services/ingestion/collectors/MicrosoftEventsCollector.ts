import { BaseCollector } from './BaseCollector';
import type { CollectorError, CollectorResult, EventSourceRecord } from '@/types/ingestion';

interface MicrosoftEventCard {
    content: {
        id: string;
        name: string;
        title: string;
        format: string;
        formatEnglishName: string;
        description: string;
        action: {
            href: string;
            text: string;
        };
        location: {
            city: string | null;
            state: string | null;
            country: string | null;
        };
        eventDates: {
            startDate: string;
            endDate: string;
        };
    };
}

interface MicrosoftEventsApiResponse {
    cards: MicrosoftEventCard[];
    totalCount: number;
    top: number;
    skip: number;
    hasMorePages: boolean;
}

const PAGE_SIZE = 50;
const MAX_EVENTS = 2000;
const PAGE_DELAY_MS = 200;

export class MicrosoftEventsCollector extends BaseCollector {
    private static readonly COLLECTOR_VERSION = 'microsoft-events@1';

    protected getCollectorType(): EventSourceRecord['provenance']['collector'] {
        return 'api';
    }

    async collect(): Promise<CollectorResult> {
        const records: CollectorResult['records'] = [];
        const errors: CollectorError[] = [];
        const fetchJobId = crypto.randomUUID();
        const seenIds = new Set<string>();

        try {
            const allCards = await this.fetchAllPages();

            for (const card of allCards) {
                try {
                    // Deduplicate within a run
                    if (seenIds.has(card.content.id)) continue;
                    seenIds.add(card.content.id);

                    const result = await this.normalizeEvent(card, fetchJobId);
                    if (!result) continue;

                    const validation = this.validateRecord(result.record);
                    if (!validation.valid) {
                        errors.push({
                            type: 'validation_error',
                            message: `Validation failed: ${validation.errors.join(', ')}`,
                            details: { title: card.content.name },
                        });
                        continue;
                    }

                    records.push(result);
                } catch (error) {
                    errors.push({
                        type: 'parse_error',
                        message: `Failed to process event: ${card.content.name}`,
                        details: { error: error instanceof Error ? error.message : String(error) },
                    });
                }
            }

            // Post-process: detect series and assign seriesName
            this.assignSeriesNames(records);

            return {
                records,
                errors,
                metadata: {
                    totalEventsFetched: allCards.length,
                    recordsCreated: records.length,
                },
            };
        } catch (error) {
            return {
                records,
                errors: [{
                    type: 'fetch_error',
                    message: 'Failed to fetch events from Microsoft Events Catalog',
                    details: { error: error instanceof Error ? error.message : String(error) },
                }],
            };
        }
    }

    private async fetchAllPages(): Promise<MicrosoftEventCard[]> {
        const allCards: MicrosoftEventCard[] = [];
        let skip = 0;

        while (allCards.length < MAX_EVENTS) {
            const page = await this.fetchPage(skip);
            allCards.push(...page.cards);

            if (!page.hasMorePages) break;

            skip += PAGE_SIZE;

            // Be respectful with request rate
            await new Promise(resolve => setTimeout(resolve, PAGE_DELAY_MS));
        }

        return allCards;
    }

    private async fetchPage(skip: number): Promise<MicrosoftEventsApiResponse> {
        return await this.retryWithBackoff(async () => {
            const res = await fetch(this.config.sourceUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filters: 'primary-language:english,format:in-person',
                    top: PAGE_SIZE,
                    skip,
                    scenario: 'events',
                }),
            });

            if (!res.ok) {
                throw new Error(`Microsoft Events API returned ${res.status}`);
            }

            return res.json() as Promise<MicrosoftEventsApiResponse>;
        });
    }

    private async normalizeEvent(
        card: MicrosoftEventCard,
        fetchJobId: string
    ): Promise<{ record: EventSourceRecord; rawItem: unknown } | null> {
        const { content } = card;

        if (!content.eventDates?.startDate || !content.action?.href) {
            return null;
        }

        const startDate = new Date(content.eventDates.startDate);
        if (isNaN(startDate.getTime()) || startDate < new Date()) {
            return null;
        }

        const startDateIso = startDate.toISOString();
        const endDate = content.eventDates.endDate ? new Date(content.eventDates.endDate) : null;
        const endDateIso = endDate && !isNaN(endDate.getTime()) ? endDate.toISOString() : undefined;

        const sourceUrl = this.normalizeUrl(content.action.href);
        if (!sourceUrl) return null;

        const location = this.buildLocation(content.location);
        const description = content.description && content.description !== 'NA'
            ? content.description
            : undefined;

        const rawHash = await this.hashStablePayload({
            id: content.id,
            startDate: startDateIso,
            endDate: endDateIso,
        });

        const record: EventSourceRecord = {
            title: content.name || content.title,
            description,
            startTime: startDateIso,
            endTime: endDateIso,
            timezone: undefined,
            location,
            organizer: 'Microsoft',
            organizerDomain: 'microsoft.com',
            sourceUrl,
            registrationUrl: sourceUrl,
            livestreamUrl: undefined,
            eventImageUrl: undefined,
            tags: [],
            priceRange: undefined,
            difficultyLevel: undefined,
            eventFormat: this.mapFormat(content.formatEnglishName || content.format),
            speakerLineup: undefined,
            provenance: this.createProvenance(fetchJobId, rawHash, MicrosoftEventsCollector.COLLECTOR_VERSION),
            confidence: 0,
        };

        record.confidence = this.calculateConfidence(record);

        return { record, rawItem: card };
    }

    private buildLocation(loc: MicrosoftEventCard['content']['location']): string {
        const parts = [loc.city, loc.state, loc.country].filter(
            (p): p is string => p != null && p.length > 0
        );
        return parts.length > 0 ? parts.join(', ') : 'TBD';
    }

    private mapFormat(format: string): EventSourceRecord['eventFormat'] {
        const lower = format.toLowerCase();
        if (lower === 'in person' || lower === 'in-person') return 'in-person';
        if (lower === 'digital' || lower === 'virtual' || lower === 'on-demand') return 'virtual';
        if (lower === 'hybrid') return 'hybrid';
        return 'in-person';
    }

    private normalizeUrl(rawUrl: string): string | null {
        try {
            const url = new URL(rawUrl);
            if (!['http:', 'https:'].includes(url.protocol)) return null;
            return url.toString();
        } catch {
            return null;
        }
    }

    /**
     * Detect event series by extracting a base title (stripping city suffixes)
     * and assigning seriesName only when 2+ events share the same base.
     */
    private assignSeriesNames(records: CollectorResult['records']): void {
        // Build a map of baseName → records
        const groups = new Map<string, CollectorResult['records']>();

        for (const entry of records) {
            const city = this.extractCity(entry.record.location);
            const baseName = MicrosoftEventsCollector.extractSeriesBaseName(entry.record.title, city);
            if (!baseName) continue;

            const group = groups.get(baseName) ?? [];
            group.push(entry);
            groups.set(baseName, group);
        }

        // Only assign seriesName when a group has 2+ events
        for (const [baseName, group] of groups) {
            if (group.length < 2) continue;
            for (const entry of group) {
                entry.record.seriesName = baseName;
            }
        }
    }

    private extractCity(location: string): string {
        // Location format is "City, State, Country" — return the first part
        const parts = location.split(',');
        return parts[0].trim();
    }

    /**
     * Extract the series base name by stripping a city suffix from the title.
     *
     * Patterns handled:
     * - "Series Name - City"  / "Series Name – City" / "Series Name — City"
     * - "Series Name City" (title ends with the city name)
     */
    static extractSeriesBaseName(title: string, city: string): string | null {
        if (!city || city === 'TBD') return null;

        const cityLower = city.toLowerCase();

        // Pattern 1: dash separator followed by city
        const dashPatterns = [' - ', ' – ', ' — '];
        for (const dash of dashPatterns) {
            const idx = title.lastIndexOf(dash);
            if (idx > 0) {
                const suffix = title.slice(idx + dash.length).trim().toLowerCase();
                if (suffix.includes(cityLower) || cityLower.includes(suffix)) {
                    return title.slice(0, idx).trim();
                }
            }
        }

        // Pattern 2: title ends with city name (no separator)
        if (title.toLowerCase().endsWith(cityLower) && title.length > cityLower.length) {
            return title.slice(0, -city.length).trim();
        }

        return null;
    }
}
