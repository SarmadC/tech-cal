/**
 * ICS Collector
 *
 * Collects events from iCalendar (ICS) feeds.
 */

import { BaseCollector } from './BaseCollector';
import type { EventSourceRecord, CollectorResult, CollectorError } from '@/types/ingestion';
import { EventFilterService } from '../EventFilterService';
import ical from 'node-ical';

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

            const entries = Object.values(data || {});
            let filteredCount = 0;

            for (const entry of entries) {
                try {
                    // Only process VEVENTs
                    // node-ical uses type === 'VEVENT' for event components
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const ev: any = entry as any;
                    if (!ev || ev.type !== 'VEVENT') continue;

                    // Minimal recurrence support: ingest master DTSTART only
                    // Skip if EXDATE matches DTSTART
                    const dtstart: Date | undefined = ev.start instanceof Date ? ev.start : undefined;
                    const dtend: Date | undefined = ev.end instanceof Date ? ev.end : undefined;

                    if (!dtstart) {
                        errors.push({
                            type: 'validation_error',
                            message: 'Missing DTSTART',
                            details: { summary: ev.summary },
                        });
                        continue;
                    }

                    // If EXDATE includes the DTSTART, skip
                    if (ev.exdate && typeof ev.exdate === 'object') {
                        // exdate is an object map: { 'YYYYMMDDTHHmmssZ': Date }
                        const exdates = Object.values(ev.exdate) as Date[];
                        if (exdates.some((d) => d instanceof Date && d.getTime() === dtstart.getTime())) {
                            continue;
                        }
                    }

                    const title: string = ev.summary || 'Untitled';
                    const location: string = ev.location || 'TBD';
                    const description: string = ev.description || '';
                    
                    // Try multiple URL sources
                    let url: string | undefined = ev.url || (ev.organizer && ev.organizer.url) || undefined;
                    
                    // If no URL found, try extracting from description
                    if (!url && description) {
                        const urlMatch = description.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/i);
                        if (urlMatch) {
                            url = urlMatch[0];
                            console.log(`[IcsCollector] Extracted URL from description for "${title}": ${url}`);
                        }
                    }
                    
                    // Handle Techmeme redirect URLs - extract canonical URL
                    // Pattern: https://www.techmeme.com/r2/www.domain.com_path_segments-base64.htm
                    // Example: https://www.techmeme.com/r2/www.anyscale.com_ray-summit_2025-lIFlr5uJ.htm
                    // Extract: https://www.anyscale.com/ray-summit/2025
                    if (url && url.includes('techmeme.com/r2/')) {
                        // Match: techmeme.com/r2/www.domain.com_path_segments-suffix.htm
                        // The domain part includes www. if present, path uses underscores for slashes
                        const techmemeMatch = url.match(/techmeme\.com\/r2\/([^_]+)_(.+?)(?:-[a-zA-Z0-9]+)?\.htm$/);
                        if (techmemeMatch) {
                            const domain = techmemeMatch[1]; // www.anyscale.com or anyscale.com
                            const pathSegments = techmemeMatch[2]; // ray-summit_2025 or similar
                            // Replace underscores with slashes, but keep hyphens
                            const path = pathSegments.replace(/_/g, '/');
                            // Construct canonical URL - domain already has www if it was there
                            const canonicalUrl = `https://${domain}/${path}`;
                            console.log(`[IcsCollector] Resolved Techmeme redirect for "${title}": ${url} -> ${canonicalUrl}`);
                            url = canonicalUrl;
                        } else {
                            console.warn(`[IcsCollector] Could not parse Techmeme redirect URL pattern: ${url}`);
                        }
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
                        sourceUrl: eventSourceUrl,
                        registrationUrl: url, // Keep separate - may be same as event URL or a different registration link
                        provenance: this.createProvenance(fetchJobId, rawHash, '1.0.0'),
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
