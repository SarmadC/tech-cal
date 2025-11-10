import { BaseCollector } from './BaseCollector';
import type { CollectorError, CollectorResult, EventSourceRecord } from '@/types/ingestion';
import { RulesFirstExtractionService } from '../RulesFirstExtractionService';
import type { ExtractedEventData } from '@/types/firecrawl';

const HTML_COLLECTOR_VERSION = '1.0.0';

type HtmlCollectorMetadata = {
    minConfidence?: number;
    fetchOptions?: RequestInit;
};

function buildLocation(data: ExtractedEventData): string | undefined {
    const venue = data.location?.venue || data.venue?.name;
    if (venue) {
        return venue.trim();
    }

    const parts: string[] = [];
    const city = data.location?.city || data.venue?.city;
    const country = data.location?.country || data.venue?.country;
    const address = data.location?.address || data.venue?.address;

    if (city) parts.push(city.trim());
    if (country) parts.push(country.trim());

    if (parts.length > 0) {
        return parts.join(', ');
    }

    if (address) {
        return address.trim();
    }

    if (data.location?.virtualPlatform) {
        return data.location.virtualPlatform.trim() || 'Online';
    }

    if (data.format?.toLowerCase().includes('virtual')) {
        return 'Online';
    }

    return undefined;
}

function mapSpeakers(data: ExtractedEventData): EventSourceRecord['speakerLineup'] {
    if (!data.speakers || data.speakers.length === 0) {
        return undefined;
    }

    return data.speakers
        .map((speaker) => ({
            name: speaker.name?.trim() ?? '',
            title: speaker.title ?? undefined,
            company: speaker.company ?? undefined,
            bio: speaker.bio ?? undefined,
            linkedinUrl: speaker.linkedinUrl ?? undefined,
            twitterUrl: speaker.twitterUrl ?? undefined,
            websiteUrl: speaker.websiteUrl ?? undefined,
            photoUrl: speaker.photoUrl ?? undefined,
        }))
        .filter((speaker) => speaker.name.length > 0);
}

function mapTags(data: ExtractedEventData): string[] | undefined {
    if (!data.tags || data.tags.length === 0) {
        return undefined;
    }
    const cleaned = data.tags
        .map((tag) => tag?.trim())
        .filter((tag): tag is string => !!tag && tag.length > 0);
    return cleaned.length > 0 ? cleaned : undefined;
}

function mapPriceRange(data: ExtractedEventData): EventSourceRecord['priceRange'] {
    if (!data.pricing) return undefined;
    const { priceMin, priceMax, currency, pricingType } = data.pricing;
    if (priceMin == null && priceMax == null && !currency && !pricingType) {
        return undefined;
    }
    return {
        min: priceMin ?? undefined,
        max: priceMax ?? undefined,
        currency: currency ?? undefined,
    };
}

export class HtmlCollector extends BaseCollector {
    protected getCollectorType(): EventSourceRecord['provenance']['collector'] {
        return 'html';
    }

    async collect(): Promise<CollectorResult> {
        const records: CollectorResult['records'] = [];
        const errors: CollectorError[] = [];
        const fetchJobId = crypto.randomUUID();
        const metadata = (this.config.metadata ?? {}) as HtmlCollectorMetadata;

        try {
            const extraction = await RulesFirstExtractionService.extractFromUrl(
                this.config.sourceUrl,
                {
                    minConfidence: metadata.minConfidence,
                    fetchOptions: metadata.fetchOptions,
                }
            );

            if (!extraction.success || !extraction.data) {
                const errMessage = extraction.error || 'Failed to extract event data from HTML';
                errors.push({
                    type: 'fetch_error',
                    message: errMessage,
                    details: { sourceUrl: this.config.sourceUrl },
                });
                return {
                    records,
                    errors,
                    metadata: {
                        success: extraction.success,
                        confidence: extraction.confidence ?? null,
                        error: extraction.error ?? null,
                        cacheHit: extraction.cacheHit ?? false,
                    },
                };
            }

            const data = extraction.data;
            const title = data.title?.trim();
            const startTime = data.startTime;
            const location = buildLocation(data);

            if (!title || !startTime || !location) {
                errors.push({
                    type: 'validation_error',
                    message: 'Missing required fields from HTML extraction',
                    details: {
                        title: !!title,
                        startTime: !!startTime,
                        location: !!location,
                        sourceUrl: this.config.sourceUrl,
                    },
                });
                return {
                    records,
                    errors,
                    metadata: {
                        success: false,
                        confidence: extraction.confidence ?? null,
                        cacheHit: extraction.cacheHit ?? false,
                    },
                };
            }

            const stablePayload = {
                title,
                startTime,
                location,
                sourceUrl: data.sourceUrls?.finalUrl ?? this.config.sourceUrl,
            };
            const rawHash = await this.hashStablePayload(stablePayload);

            const provenance = this.createProvenance(fetchJobId, rawHash, HTML_COLLECTOR_VERSION);
            provenance.source_domain = extraction.sourceDomain ?? provenance.source_domain;

            const record: EventSourceRecord = {
                title,
                description: data.description ?? undefined,
                startTime,
                endTime: data.endTime ?? undefined,
                timezone: data.timezone ?? undefined,
                location,
                organizer: data.location?.venue ?? undefined,
                sourceUrl: data.sourceUrls?.finalUrl ?? this.config.sourceUrl,
                registrationUrl: data.registrationUrl ?? data.sourceUrls?.sourceUrl ?? undefined,
                livestreamUrl: data.location?.virtualPlatform ?? undefined,
                eventImageUrl: data.imageUrl ?? undefined,
                tags: mapTags(data),
                priceRange: mapPriceRange(data),
                difficultyLevel: data.difficulty ?? undefined,
                eventFormat: data.format === 'online' ? 'virtual' : data.format === 'hybrid' ? 'hybrid' : undefined,
                speakerLineup: mapSpeakers(data),
                provenance,
                confidence: Math.round(Math.min(Math.max(extraction.confidence ?? 0.6, 0), 1) * 100),
            };

            if (!record.organizer && data.speakers && data.speakers.length > 0) {
                record.organizer = data.speakers[0]?.company ?? undefined;
            }

            RulesFirstExtractionService.applyCanonicalizationToRecord(record, extraction);

            const validation = this.validateRecord(record);
            if (!validation.valid) {
                errors.push({
                    type: 'validation_error',
                    message: `Validation failed: ${validation.errors.join(', ')}`,
                    details: { sourceUrl: this.config.sourceUrl },
                });
                return {
                    records,
                    errors,
                    metadata: {
                        success: false,
                        confidence: extraction.confidence ?? null,
                        validationErrors: validation.errors,
                    },
                };
            }

            records.push({
                record,
                rawItem: {
                    extracted: data,
                    fieldConfidence: extraction.fieldConfidence,
                    confidence: extraction.confidence,
                    provenance: extraction.provenance,
                    normalizedUrl: extraction.normalizedUrl,
                    normalizedUrlHash: extraction.normalizedUrlHash,
                },
            });

            return {
                records,
                errors,
                metadata: {
                    success: true,
                    confidence: extraction.confidence ?? null,
                    cacheHit: extraction.cacheHit ?? false,
                    normalizedUrl: extraction.normalizedUrl ?? null,
                },
            };
        } catch (error) {
            errors.push({
                type: 'fetch_error',
                message: error instanceof Error ? error.message : 'Unknown HTML collector error',
                details: { sourceUrl: this.config.sourceUrl },
            });

            return {
                records,
                errors,
            };
        }
    }
}

