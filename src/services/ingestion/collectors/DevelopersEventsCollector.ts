import { BaseCollector } from './BaseCollector';
import type { CollectorError, CollectorResult, EventSourceRecord } from '@/types/ingestion';
import { extractDomain } from '../utils/urlResolver';

interface DevelopersEvent {
    name: string;
    date: number[]; // [start, end] or [start]
    hyperlink: string;
    location: string;
    city?: string;
    country?: string;
    status: string;
    tags: string[];
}

export class DevelopersEventsCollector extends BaseCollector {
    private static readonly COLLECTOR_VERSION = 'developers-events@1';

    protected getCollectorType(): EventSourceRecord['provenance']['collector'] {
        return 'api';
    }

    async collect(): Promise<CollectorResult> {
        const records: CollectorResult['records'] = [];
        const errors: CollectorError[] = [];
        const fetchJobId = crypto.randomUUID();

        try {
            const events = await this.fetchEvents();
            
            for (const event of events) {
                try {
                    const result = await this.normalizeEvent(event, fetchJobId);
                    if (!result) {
                        continue;
                    }

                    const validation = this.validateRecord(result.record);
                    if (!validation.valid) {
                        errors.push({
                            type: 'validation_error',
                            message: `Validation failed: ${validation.errors.join(', ')}`,
                            details: { title: event.name },
                        });
                        continue;
                    }

                    records.push(result);
                } catch (error) {
                    errors.push({
                        type: 'parse_error',
                        message: `Failed to process event: ${event.name}`,
                        details: { error: error instanceof Error ? error.message : String(error) },
                    });
                }
            }

            return {
                records,
                errors,
                metadata: {
                    totalEventsFetched: events.length,
                    recordsCreated: records.length,
                },
            };
        } catch (error) {
            return {
                records,
                errors: [{
                    type: 'fetch_error',
                    message: 'Failed to fetch events from developers.events',
                    details: { error: error instanceof Error ? error.message : String(error) },
                }],
            };
        }
    }

    private async fetchEvents(): Promise<DevelopersEvent[]> {
        return await this.retryWithBackoff(async () => {
            const res = await fetch(this.config.sourceUrl);
            if (!res.ok) {
                throw new Error(`Failed to fetch ${this.config.sourceUrl}: ${res.status}`);
            }
            return res.json() as Promise<DevelopersEvent[]>;
        });
    }

    private async normalizeEvent(
        event: DevelopersEvent,
        fetchJobId: string
    ): Promise<{ record: EventSourceRecord; rawItem: unknown } | null> {
        if (!event.hyperlink || !event.date || event.date.length === 0) {
            return null;
        }

        const startDate = new Date(event.date[0]);
        
        // STRICT FILTER: Only allow events in 2026
        if (startDate.getUTCFullYear() !== 2026) {
            return null;
        }

        const startDateIso = startDate.toISOString();
        const endDateIso = event.date.length > 1 ? new Date(event.date[1]).toISOString() : undefined;

        const normalizedUrl = this.normalizeUrl(event.hyperlink);
        if (!normalizedUrl) {
            return null;
        }

        const organizerDomain = extractDomain(normalizedUrl);
        
        // Generate stable hash
        const stableHashPayload = {
            url: normalizedUrl,
            startDate: startDateIso,
            endDate: endDateIso,
            name: event.name
        };
        const rawHash = await this.hashStablePayload(stableHashPayload);

        const record: EventSourceRecord = {
            title: event.name,
            description: undefined, // Description is not available in the main list
            startTime: startDateIso,
            endTime: endDateIso,
            timezone: undefined,
            location: event.location || 'Online',
            organizer: undefined,
            organizerDomain,
            sourceUrl: normalizedUrl,
            registrationUrl: normalizedUrl,
            livestreamUrl: undefined,
            eventImageUrl: undefined,
            tags: event.tags || [],
            priceRange: undefined,
            difficultyLevel: undefined,
            eventFormat: this.inferEventFormat(event),
            speakerLineup: undefined,
            provenance: this.createProvenance(fetchJobId, rawHash, DevelopersEventsCollector.COLLECTOR_VERSION),
            confidence: 0,
        };

        record.confidence = this.calculateConfidence(record);

        return {
            record,
            rawItem: event,
        };
    }

    private normalizeUrl(rawUrl: string): string | null {
        try {
            const url = new URL(rawUrl);
            // Remove tracking params
            url.search = '';
            url.hash = '';
            const normalized = url.toString();
            return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
        } catch {
            return null;
        }
    }

    private inferEventFormat(event: DevelopersEvent): EventSourceRecord['eventFormat'] {
        const loc = (event.location || '').toLowerCase();
        if (loc.includes('online') || loc.includes('virtual') || loc.includes('remote')) {
            return 'virtual';
        }
        return 'in-person';
    }
}
