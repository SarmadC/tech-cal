import { BaseCollector } from './BaseCollector';
import type { CollectorError, CollectorResult, EventSourceRecord } from '@/types/ingestion';
import { extractDomain } from '../utils/urlResolver';
import { sanitizeCollectorTags } from '../utils/tagSanitizer';

interface ConfsTechEvent {
    name: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    city?: string;
    country?: string;
    online?: boolean;
    locales?: string;
    cocUrl?: string;
    cfpUrl?: string;
    cfpEndDate?: string;
    twitter?: string;
    price?: string | number;
}

interface CategoryFile {
    name: string;
    download_url: string;
}

interface ConfsMetadata {
    provider?: string;
    filters?: Record<string, unknown>;
    categories?: string[];
    years_ahead?: number;
}

export class ConfsTechCollector extends BaseCollector {
    private static readonly RAW_BASE_URL = 'https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences';
    private static readonly GITHUB_API_BASE = 'https://api.github.com/repos/tech-conferences/conference-data/contents/conferences';
    private static readonly COLLECTOR_VERSION = 'confs-tech@1';

    protected getCollectorType(): EventSourceRecord['provenance']['collector'] {
        return 'api';
    }

    async collect(): Promise<CollectorResult> {
        const records: CollectorResult['records'] = [];
        const errors: CollectorError[] = [];
        const fetchJobId = crypto.randomUUID();
        const metadata = (this.config.metadata || {}) as ConfsMetadata;

        if (metadata.provider !== 'confs.tech') {
            errors.push({
                type: 'validation_error',
                message: 'ConfsTechCollector requires metadata.provider to be "confs.tech"',
            });
            return { records, errors };
        }

        const years = this.getTargetYears(metadata.years_ahead);
        const seenKeys = new Set<string>();
        let filesProcessed = 0;
        let rawItemsProcessed = 0;

        for (const year of years) {
            try {
                const categories = await this.getCategoryFiles(year, metadata.categories);
                for (const category of categories) {
                    filesProcessed++;
                    try {
                        const events = await this.fetchCategoryEvents(category.download_url);
                        for (const event of events) {
                            rawItemsProcessed++;
                            const result = await this.normalizeEvent({ event, year, category: category.name }, fetchJobId, seenKeys, metadata);
                            if (!result) {
                                continue;
                            }

                            const validation = this.validateRecord(result.record);
                            if (!validation.valid) {
                                errors.push({
                                    type: 'validation_error',
                                    message: `Validation failed: ${validation.errors.join(', ')}`,
                                    details: { title: event.name, year, category: category.name },
                                });
                                continue;
                            }

                            records.push(result);
                        }
                    } catch (error) {
                        errors.push({
                            type: 'fetch_error',
                            message: `Failed to fetch category ${category.name} for ${year}`,
                            details: { error: error instanceof Error ? error.message : String(error) },
                        });
                    }
                }
            } catch (error) {
                errors.push({
                    type: 'fetch_error',
                    message: `Failed to enumerate categories for ${year}`,
                    details: { error: error instanceof Error ? error.message : String(error) },
                });
            }
        }

        return {
            records,
            errors,
            metadata: {
                years,
                filesProcessed,
                rawItemsProcessed,
                recordsCreated: records.length,
            },
        };
    }

    private getTargetYears(yearsAhead: number | undefined): number[] {
        const today = new Date();
        const currentYear = today.getUTCFullYear();
        const span = Math.max(0, Math.min(3, yearsAhead ?? 1));
        const years: number[] = [];
        for (let offset = 0; offset <= span; offset++) {
            years.push(currentYear + offset);
        }
        return years;
    }

    private async getCategoryFiles(year: number, preferredCategories?: string[]): Promise<CategoryFile[]> {
        if (preferredCategories && preferredCategories.length > 0) {
            return preferredCategories.map((category) => ({
                name: category.replace(/\.json$/i, ''),
                download_url: `${ConfsTechCollector.RAW_BASE_URL}/${year}/${category.replace(/\.json$/i, '')}.json`,
            }));
        }

        const response = await this.retryWithBackoff(async () => {
            const res = await fetch(`${ConfsTechCollector.GITHUB_API_BASE}/${year}`);
            if (!res.ok) {
                throw new Error(`GitHub API responded with ${res.status}`);
            }
            return res.json() as Promise<Array<{ name: string; download_url: string | null; type: string }>>;
        });

        return response
            .filter((item) => item.type === 'file' && item.name.endsWith('.json') && item.download_url)
            .map((item) => ({
                name: item.name.replace(/\.json$/i, ''),
                download_url: item.download_url as string,
            }));
    }

    private async fetchCategoryEvents(downloadUrl: string): Promise<ConfsTechEvent[]> {
        return await this.retryWithBackoff(async () => {
            const res = await fetch(downloadUrl);
            if (!res.ok) {
                throw new Error(`Failed to fetch ${downloadUrl}: ${res.status}`);
            }
            return res.json() as Promise<ConfsTechEvent[]>;
        });
    }

    private async normalizeEvent(
        context: { event: ConfsTechEvent; year: number; category: string },
        fetchJobId: string,
        seenKeys: Set<string>,
        metadata: ConfsMetadata
    ): Promise<{ record: EventSourceRecord; rawItem: unknown } | null> {
        const { event, year, category } = context;

        if (!event.url) {
            return null; // Skip events without canonical URL
        }

        const normalizedUrl = this.normalizeUrl(event.url);
        if (!normalizedUrl) {
            return null;
        }

        if (!event.startDate) {
            return null;
        }

        const startDateIso = this.toIsoDate(event.startDate);
        if (!startDateIso) {
            return null;
        }

        if (!this.isUpcoming(startDateIso)) {
            return null;
        }

        if (metadata.filters?.online_only && event.online !== true) {
            return null;
        }

        const dedupeKey = `${normalizedUrl}|${startDateIso}`;
        if (seenKeys.has(dedupeKey)) {
            return null;
        }
        seenKeys.add(dedupeKey);

        const endDateIso = event.endDate ? this.toIsoDate(event.endDate) : undefined;

        const location = this.buildLocation(event);
        const eventFormat = this.inferEventFormat(event);
        const tags = this.buildTags(category);
        const language = this.extractLanguage(event);
        const organizerDomain = extractDomain(normalizedUrl);

        const stableHashPayload = {
            url: normalizedUrl,
            startDate: startDateIso,
            endDate: endDateIso,
        };
        const rawHash = await this.hashStablePayload(stableHashPayload);

        const record: EventSourceRecord = {
            title: event.name || 'Untitled Event',
            description: undefined,
            startTime: startDateIso,
            endTime: endDateIso,
            timezone: undefined,
            location,
            organizer: undefined,
            organizerDomain,
            sourceUrl: normalizedUrl,
            registrationUrl: event.cfpUrl || normalizedUrl,
            livestreamUrl: undefined,
            eventImageUrl: undefined,
            tags,
            language,
            priceRange: undefined,
            difficultyLevel: undefined,
            eventFormat,
            speakerLineup: undefined,
            provenance: this.createProvenance(fetchJobId, rawHash, ConfsTechCollector.COLLECTOR_VERSION),
            confidence: 0, // Placeholder, will be calculated next
        };

        record.confidence = this.calculateConfidence(record);

        return {
            record,
            rawItem: {
                year,
                category,
                event,
            },
        };
    }

    private normalizeUrl(rawUrl: string): string | null {
        try {
            const url = new URL(rawUrl);
            url.hash = '';
            url.search = '';
            const normalized = url.toString();
            return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
        } catch {
            return null;
        }
    }

    private toIsoDate(dateString: string): string | undefined {
        const trimmed = dateString.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return undefined;
        }
        const isoString = `${trimmed}T00:00:00.000Z`;
        const date = new Date(isoString);
        if (Number.isNaN(date.getTime())) {
            return undefined;
        }
        return date.toISOString();
    }

    private isUpcoming(startIso: string): boolean {
        const today = new Date();
        const todayIso = new Date(`${today.toISOString().split('T')[0]}T00:00:00.000Z`);
        return new Date(startIso) >= todayIso;
    }

    private buildLocation(event: ConfsTechEvent): string {
        const parts: string[] = [];
        if (event.online) {
            parts.push('Online');
        }
        if (event.city) {
            parts.push(event.city);
        }
        if (event.country) {
            parts.push(event.country);
        }
        if (parts.length === 0) {
            return 'Online';
        }
        return parts.join(' — ');
    }

    private inferEventFormat(event: ConfsTechEvent): EventSourceRecord['eventFormat'] {
        if (event.online && (event.city || event.country)) {
            return 'hybrid';
        }
        if (event.online) {
            return 'virtual';
        }
        return 'in-person';
    }

    private buildTags(category: string): string[] {
        return sanitizeCollectorTags([category.toLowerCase()]);
    }

    private extractLanguage(event: ConfsTechEvent): string | undefined {
        if (!event.locales) return undefined;
        const first = event.locales.split(',')[0]?.trim().toLowerCase();
        return first || undefined;
    }
}
