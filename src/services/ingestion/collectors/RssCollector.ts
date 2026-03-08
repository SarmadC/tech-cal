/**
 * RSS Collector
 * 
 * Collects events from RSS/Atom feeds.
 * Requires: npm install rss-parser
 */

import { BaseCollector } from './BaseCollector';
import type { EventSourceRecord, CollectorResult, CollectorError } from '@/types/ingestion';
import { EventFilterService } from '../EventFilterService';
import {
    parseDate,
    extractDateFromContent,
    parseEventDateFromFields,
    EVENT_START_DATE_FIELDS,
    EVENT_END_DATE_FIELDS,
} from '../utils/dateParser';
import { extractDomain } from '../utils/urlResolver';
import { RSS_DEFAULTS } from '@/config/ingestionConstants';
import Parser, { type Item as ParserItem } from 'rss-parser';

type RssFeedSpeaker = {
    name?: string;
    title?: string;
    company?: string;
    bio?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    photoUrl?: string;
    linkedin?: string;
};

type RssFeedItem = ParserItem & {
    title?: string;
    contentSnippet?: string;
    content?: string;
    description?: string;
    pubDate?: string;
    isoDate?: string;
    date?: string;
    link?: string;
    guid?: string;
    id?: string;
    author?: string;
    creator?: string;
    dc?: { creator?: string };
    registrationUrl?: string;
    enclosure?: { url?: string; type?: string };
    image?: { url?: string };
    media?: { thumbnail?: Array<{ url?: string }> };
    categories?: string[];
    category?: string;
    tags?: string[];
    price?: unknown;
    currency?: string;
    speakers?: Array<RssFeedSpeaker | string>;
    location?: string;
    'geo:lat'?: string;
    'geo:long'?: string;
    'ev:location'?: string;
    'event:location'?: string;
    'event:startdate'?: string;
    'event:enddate'?: string;
    ev?: Record<string, unknown> & { startdate?: string; enddate?: string; location?: string };
    ical?: Record<string, unknown> & { dtstart?: string; dtend?: string };
    startdate?: string;
    enddate?: string;
    event_date?: string;
    eventDate?: string;
};

// Create parser instance (reusable)
const createParser = () => {
    return new Parser({
        customFields: {
            item: [
                ['description', 'description'],
                ['pubDate', 'pubDate'],
                ['category', 'categories', { keepArray: true }],
            ],
        },
    });
};

export class RssCollector extends BaseCollector {
    protected getCollectorType(): EventSourceRecord['provenance']['collector'] {
        return 'rss';
    }

    async collect(): Promise<CollectorResult> {
        const records: CollectorResult['records'] = [];
        const errors: CollectorError[] = [];
        const fetchJobId = crypto.randomUUID();

        try {
            const parser = createParser();
            
            // Fetch and parse RSS feed with retry
            const feed = await this.retryWithBackoff(async () => {
                return await parser.parseURL(this.config.sourceUrl);
            });

            if (!feed || !feed.items) {
                errors.push({
                    type: 'parse_error',
                    message: 'Invalid RSS feed structure',
                });
                return { records, errors, metadata: { feedTitle: feed?.title } };
            }

            // Process each feed item
            let filteredCount = 0;
            for (const item of feed.items) {
                try {
                    const record = await this.parseFeedItem(item, fetchJobId);
                    
                    // Check if event should be filtered out
                    const filterResult = EventFilterService.shouldFilterEvent(
                        record,
                        this.config.metadata
                    );
                    if (filterResult.filtered) {
                        // Skip filtered events silently (no error, just excluded)
                        filteredCount++;
                        continue;
                    }
                    
                    // Validate record
                    const validation = this.validateRecord(record);
                    if (!validation.valid) {
                        errors.push({
                            type: 'validation_error',
                            message: `Validation failed: ${validation.errors.join(', ')}`,
                            details: { title: item.title, errors: validation.errors },
                        });
                        continue;
                    }

                    // Store both the normalized record and the raw item
                    records.push({
                        record,
                        rawItem: this.extractStableFields(item), // Only stable fields for checksum
                    });
                } catch (error) {
                    errors.push({
                        type: 'parse_error',
                        message: error instanceof Error ? error.message : 'Failed to parse feed item',
                        details: { item: item.title || 'unknown' },
                    });
                }
            }

            return {
                records,
                errors,
                metadata: {
                    feedTitle: feed.title,
                    feedDescription: feed.description,
                    itemsProcessed: feed.items.length,
                    recordsCreated: records.length,
                    recordsFiltered: filteredCount,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // Handle rate limiting
            if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
                errors.push({
                    type: 'rate_limit_error',
                    message: 'Rate limit exceeded',
                    details: { sourceUrl: this.config.sourceUrl },
                });
            } else {
                errors.push({
                    type: 'fetch_error',
                    message: `Failed to fetch RSS feed: ${errorMessage}`,
                    details: { sourceUrl: this.config.sourceUrl },
                });
            }

            return { records, errors };
        }
    }

    /**
     * Parse a single RSS feed item into EventSourceRecord
     */
    private async parseFeedItem(
        item: RssFeedItem,
        fetchJobId: string
    ): Promise<EventSourceRecord> {
        // Extract title
        const title = item.title || 'Untitled Event';

        // Extract description
        const description = item.contentSnippet || item.content || item.description || '';

        // Parse dates - look for event-specific dates first, not pubDate
        // pubDate is when the feed item was published, not the event start time
        const startTime = this.parseEventDate(item);
        const endTime = this.parseEventEndDate(item);

        // Extract location (common patterns in RSS)
        const location = this.extractLocation(item);

        // Extract organizer (often in author or categories)
        const organizer = item.author || item.creator || item.dc?.creator || undefined;

        // Extract URLs
        const sourceUrl = item.link || this.config.sourceUrl;
        const registrationUrl = item.registrationUrl || item.enclosure?.url || undefined;
        const eventImageUrl = item.enclosure?.type?.startsWith('image') 
            ? item.enclosure.url 
            : item.image?.url || item.media?.thumbnail?.[0]?.url || undefined;

        // Extract tags/categories
        const tags = this.extractTags(item);

        // Extract price information
        const priceRange = this.extractPrice(item);

        // Extract speaker information (if available in custom fields)
        const speakerLineup = this.extractSpeakers(item);

        // Extract stable fields for checksum (before creating provenance)
        const stableFields = this.extractStableFields(item);
        const rawHash = await this.hashStablePayload(stableFields);

        // Create provenance with pre-calculated hash
        const provenance = this.createProvenance(fetchJobId, rawHash, RSS_DEFAULTS.COLLECTOR_VERSION);

        // Create record
        const record: EventSourceRecord = {
            title,
            description,
            startTime,
            endTime,
            location,
            organizer,
            organizerDomain: extractDomain(item.link || this.config.sourceUrl),
            sourceUrl,
            registrationUrl,
            eventImageUrl,
            tags,
            priceRange,
            speakerLineup,
            provenance,
            confidence: 0, // Will be calculated below
        };

        // Calculate confidence
        record.confidence = this.calculateConfidence(record);

        return record;
    }

    /**
     * Parse event start date from RSS item
     * Looks for event-specific date fields first, falls back to pubDate only if event-specific dates not found
     */
    private parseEventDate(item: RssFeedItem): string {
        const itemRecord = item as unknown as Record<string, unknown>;
        
        // Check for event-specific dates first
        const eventDate = parseEventDateFromFields(itemRecord, EVENT_START_DATE_FIELDS);
        if (eventDate) return eventDate;

        // Parse from content/description if it contains date patterns
        const contentSource = typeof item.content === 'string' 
            ? item.content 
            : (typeof item.description === 'string' ? item.description : '');
        const contentDate = extractDateFromContent(contentSource);
        if (contentDate) return contentDate;

        // Last resort: use pubDate, but only if we're confident it's an event date
        // (e.g., if the feed is event-specific)
        return parseDate(item.pubDate || item.isoDate || item.date) || new Date().toISOString();
    }

    /**
     * Parse event end date from RSS item
     */
    private parseEventEndDate(item: RssFeedItem): string | undefined {
        const itemRecord = item as unknown as Record<string, unknown>;
        return parseEventDateFromFields(itemRecord, EVENT_END_DATE_FIELDS);
    }

    /**
     * Extract location from RSS item
     */
    private extractLocation(item: RssFeedItem): string {
        // Common RSS location patterns
        if (item.location) return item.location;
        if (item['geo:lat'] && item['geo:long']) {
            return `${item['geo:lat']}, ${item['geo:long']}`;
        }
        if (item['ev:location']) return item['ev:location'];
        if (item['event:location']) return item['event:location'];
        
        // Default to "Online" if no location found
        return 'Online';
    }

    /**
     * Extract tags/categories from RSS item
     */
    private extractTags(item: RssFeedItem): string[] {
        const tags: string[] = [];

        // Categories field (often an array)
        if (item.categories && Array.isArray(item.categories)) {
            tags.push(...item.categories.filter(Boolean));
        } else if (item.category) {
            tags.push(item.category);
        }

        // Custom fields
        if (item.tags && Array.isArray(item.tags)) {
            tags.push(...item.tags.filter(Boolean));
        }

        return [...new Set(tags)]; // Deduplicate
    }

    /**
     * Extract price information
     */
    private extractPrice(item: RssFeedItem): EventSourceRecord['priceRange'] | undefined {
        if (item.price) {
            const priceStr = String(item.price);
            const freeMatch = /free|gratis|0|zero/i.exec(priceStr);
            if (freeMatch) {
                return { min: 0, max: 0, currency: RSS_DEFAULTS.DEFAULT_CURRENCY };
            }

            // Try to extract numeric price
            const priceMatch = priceStr.match(/(\d+(?:\.\d+)?)/);
            if (priceMatch) {
                const price = parseFloat(priceMatch[1]);
                return {
                    min: price,
                    max: price,
                    currency: item.currency || RSS_DEFAULTS.DEFAULT_CURRENCY,
                };
            }
        }

        return undefined;
    }

    /**
     * Extract speakers from RSS item
     */
    private extractSpeakers(item: RssFeedItem): EventSourceRecord['speakerLineup'] {
        const speakers: EventSourceRecord['speakerLineup'] = [];

        if (item.speakers && Array.isArray(item.speakers)) {
            for (const speaker of item.speakers) {
                if (typeof speaker === 'string') {
                    speakers.push({ name: speaker });
                } else if (speaker && typeof speaker === 'object' && 'name' in speaker && speaker.name) {
                    const typedSpeaker = speaker as RssFeedSpeaker;
                    const name = typedSpeaker.name;
                    if (!name) {
                        continue;
                    }
                    speakers.push({
                        name,
                        title: typedSpeaker.title,
                        company: typedSpeaker.company,
                        bio: typedSpeaker.bio,
                        linkedinUrl: typedSpeaker.linkedinUrl || typedSpeaker.linkedin,
                        githubUrl: typedSpeaker.githubUrl,
                        photoUrl: typedSpeaker.photoUrl,
                    });
                }
            }
        }

        return speakers.length > 0 ? speakers : undefined;
    }


    /**
     * Extract stable fields from RSS item for checksum calculation
     * Excludes volatile fields like pubDate, timestamps, etc.
     */
    private extractStableFields(item: RssFeedItem): Record<string, unknown> {
        // Include only fields that uniquely identify the event and don't change
        const stable: Record<string, unknown> = {
            title: item.title,
            link: item.link,
            guid: item.guid || item.id,
            // Event-specific dates (not pubDate)
            eventStartDate: item['event:startdate'] || item.ev?.startdate || item.ical?.dtstart || item.startdate || item.event_date || item.eventDate,
            eventEndDate: item['event:enddate'] || item.ev?.enddate || item.ical?.dtend || item.enddate,
            // Stable identifiers
            sourceUrl: this.config.sourceUrl,
        };

        // Include custom event fields if present
        if (item['event:location']) stable.location = item['event:location'];
        if (item.categories && Array.isArray(item.categories)) stable.categories = item.categories;

        return stable;
    }
}
