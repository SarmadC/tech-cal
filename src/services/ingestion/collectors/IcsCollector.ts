/**
 * ICS Collector
 *
 * Collects events from iCalendar (ICS) feeds.
 */

import { BaseCollector } from './BaseCollector';
import type { EventSourceRecord, CollectorResult, CollectorError } from '@/types/ingestion';
import { EventFilterService } from '../EventFilterService';
import { isTechMemeRedirect, extractUrlFromText } from '../utils/urlResolver';
import { ICS_DEFAULTS } from '@/config/ingestionConstants';
import ical from 'node-ical';
import type { VEvent, DateWithTimeZone } from 'node-ical';

type DateWithOptionalMeta = DateWithTimeZone & { dateOnly?: boolean };
type ParsedVEvent = VEvent & {
    start?: DateWithOptionalMeta;
    end?: DateWithOptionalMeta;
    exdate?: Record<string, Date>;
};

const isVEvent = (entry: ical.CalendarComponent): entry is ParsedVEvent =>
    !!entry && entry.type === 'VEVENT';

const getOrganizerUrl = (organizer: VEvent['organizer']): string | undefined => {
    if (!organizer || typeof organizer === 'string') {
        return undefined;
    }

    if ('url' in organizer && typeof organizer.url === 'string') {
        return organizer.url;
    }

    if ('val' in organizer && typeof organizer.val === 'string') {
        return organizer.val;
    }

    return undefined;
};

export class IcsCollector extends BaseCollector {
    protected getCollectorType(): EventSourceRecord['provenance']['collector'] {
        return 'ics';
    }

    async collect(): Promise<CollectorResult> {
        const records: CollectorResult['records'] = [];
        const errors: CollectorError[] = [];
        const fetchJobId = crypto.randomUUID();

        try {
            // Fetch and parse ICS feed with retry/backoff
            const data = await this.retryWithBackoff(async () => {
                return await ical.async.fromURL(this.config.sourceUrl);
            });

            const entries = Object.values(data || {}) as ical.CalendarComponent[];
            let filteredCount = 0;

            for (const entry of entries) {
                try {
                    if (!isVEvent(entry)) continue;
                    const ev = entry;

                    // Minimal recurrence support: ingest master DTSTART only
                    // Skip if EXDATE matches DTSTART
                    let dtstart: Date | undefined = ev.start instanceof Date ? ev.start : undefined;
                    let dtend: Date | undefined = ev.end instanceof Date ? ev.end : undefined;

                    if (!dtstart) {
                        errors.push({
                            type: 'validation_error',
                            message: 'Missing DTSTART',
                            details: { summary: ev.summary },
                        });
                        continue;
                    }

                    // Handle DATE-only values (datetype === 'date')
                    // When ICS uses DATE instead of DATE-TIME, node-ical defaults to midnight in the feed's timezone
                    // For Techmeme (PST/PDT), this becomes 07:00:00 UTC, which is incorrect
                    // We should default DATE-only events to a reasonable time (e.g., 09:00 local time)
                    const isDateOnly = ev.start?.dateOnly === true || ev.datetype === 'date';
                    
                    if (isDateOnly) {
                        // For DATE-only events, default to 9am in UTC (a reasonable default for events)
                        if (dtstart) {
                            const year = dtstart.getUTCFullYear();
                            const month = dtstart.getUTCMonth();
                            const day = dtstart.getUTCDate();
                        
                            // Create new date at default start hour UTC for the same date
                            dtstart = new Date(
                                Date.UTC(year, month, day, ICS_DEFAULTS.DEFAULT_START_HOUR, 0, 0)
                            );
                        }
                        
                        if (dtend) {
                            const endYear = dtend.getUTCFullYear();
                            const endMonth = dtend.getUTCMonth();
                            const endDay = dtend.getUTCDate();
                            // Default end time to default end hour UTC
                            dtend = new Date(
                                Date.UTC(endYear, endMonth, endDay, ICS_DEFAULTS.DEFAULT_END_HOUR, 0, 0)
                            );
                        }
                        
                        console.log(
                            `[IcsCollector] Event "${ev.summary || 'Untitled'}" has DATE-only value. ` +
                            `Defaulting to ${dtstart.toISOString()} (was ${ev.start?.toISOString()})`
                        );
                    }

                    // If EXDATE includes the DTSTART, skip
                    if (ev.exdate && typeof ev.exdate === 'object') {
                        // exdate is an object map: { 'YYYYMMDDTHHmmssZ': Date }
                        const exdates = Object.values(ev.exdate);
                        if (exdates.some((d) => d instanceof Date && d.getTime() === dtstart.getTime())) {
                            continue;
                        }
                    }

                    const title: string = ev.summary || 'Untitled';
                    const location: string = ev.location || ICS_DEFAULTS.DEFAULT_LOCATION;
                    const description: string = ev.description || '';
                    
                    // Try multiple URL sources
                    let url: string | undefined = ev.url || getOrganizerUrl(ev.organizer);
                    
                    // If no URL found, try extracting from description
                    if (!url && description) {
                        url = extractUrlFromText(description);
                        if (url) {
                            console.log(`[IcsCollector] Extracted URL from description for "${title}": ${url}`);
                        }
                    }
                    
                    // Log Techmeme redirect URLs (but don't resolve - let Firecrawl handle redirects)
                    if (url && isTechMemeRedirect(url)) {
                        console.log(`[IcsCollector] Ingesting event "${title}" with Techmeme redirect URL: ${url} (Firecrawl will follow redirect)`);
                    }

                    const startIso = dtstart.toISOString();
                    const endIso = dtend ? dtend.toISOString() : undefined;

                    // Stable subset for checksum (exclude volatile fields)
                    const stableRaw = {
                        uid: ev.uid || ev.uid?.toString?.() || undefined,
                        summary: ev.summary || undefined,
                        dtstart: startIso,
                        dtend: endIso,
                        location: ev.location || undefined,
                        url: url,
                    };

                    const rawHash = await this.hashStablePayload(stableRaw);

                    // Use event URL if available, fallback to feed URL
                    const eventSourceUrl = url ?? this.config.sourceUrl;
                    if (!url) {
                        console.warn(`[IcsCollector] Event "${title}" has no URL field in ICS and none found in description, falling back to feed URL: ${this.config.sourceUrl}`);
                    } else {
                        console.log(`[IcsCollector] Event "${title}" using URL: ${url}`);
                    }

                    const record: EventSourceRecord = {
                        title,
                        description,
                        startTime: startIso,
                        endTime: endIso,
                        location,
                        sourceUrl: eventSourceUrl, // Store original URL (TechMeme redirects will be handled by Firecrawl)
                        registrationUrl: url, // Store original URL (TechMeme redirects will be handled by Firecrawl)
                        provenance: this.createProvenance(fetchJobId, rawHash, ICS_DEFAULTS.COLLECTOR_VERSION),
                        confidence: 0,
                    };

                    record.confidence = this.calculateConfidence(record);

                    // Check if event should be filtered out
                    const filterResult = EventFilterService.shouldFilterEvent(
                        record,
                        this.config.metadata
                    );
                    if (filterResult.filtered) {
                        // Skip filtered events silently (no error, just excluded)
                        // Log filtered count in metadata instead
                        filteredCount++;
                        continue;
                    }

                    const validation = this.validateRecord(record);
                    if (!validation.valid) {
                        errors.push({
                            type: 'validation_error',
                            message: `Validation failed: ${validation.errors.join(', ')}`,
                            details: { title, startIso },
                        });
                        continue;
                    }

                    records.push({ record, rawItem: stableRaw });
                } catch (err) {
                    errors.push({
                        type: 'parse_error',
                        message: err instanceof Error ? err.message : 'Failed to parse VEVENT',
                    });
                }
            }

            return {
                records,
                errors,
                metadata: {
                    itemsProcessed: entries.length,
                    recordsCreated: records.length,
                    recordsFiltered: filteredCount,
                },
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push({
                type: 'fetch_error',
                message: `Failed to fetch ICS: ${errorMessage}`,
                details: { sourceUrl: this.config.sourceUrl },
            });
            return { records, errors };
        }
    }
}
