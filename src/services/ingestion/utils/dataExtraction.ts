/**
 * Data Extraction Utilities
 * 
 * Handles flattening Firecrawl extract results and extracting event fields
 * from various response formats.
 */

import type {
    ExtractedEventData,
    EventAgendaSchema,
    EventSpeakersSchema,
    EventDailyScheduleEntry,
    FirecrawlScrapeResponse,
} from '@/types/firecrawl';
import {
    normalizeDescription,
    normalizeAgenda,
    normalizeSpeakers,
    normalizePricing,
    mergeExtractedData,
} from '../FirecrawlDataNormalizer';

type JsonPayload = Partial<ExtractedEventData> & Record<string, unknown>;

/**
 * Flatten extract results from Firecrawl API
 * Handles various response formats and structures
 */
export function flattenExtractResults(
    rawData: unknown,
    fallbackUrl: string
): {
    merged?: ExtractedEventData;
    pages: Array<{ url: string; markdown?: string; html?: string; json?: unknown }>;
} {
    const pages: Array<{ url: string; markdown?: string; html?: string; json?: unknown }> = [];
    const payloads: ExtractedEventData[] = [];

    const pushEntry = (urlCandidate: unknown, data: unknown) => {
        if (!data || typeof data !== 'object') {
            return;
        }
        const url =
            typeof urlCandidate === 'string' && urlCandidate.trim().length > 0
                ? urlCandidate
                : fallbackUrl;
        const typed = data as ExtractedEventData;
        payloads.push(typed);
        pages.push({ url, json: typed });
    };

    const processValue = (value: unknown) => {
        if (Array.isArray(value)) {
            value.forEach(processValue);
            return;
        }

        if (value && typeof value === 'object') {
            const record = value as { url?: unknown; data?: unknown };
            if (record.data && typeof record.data === 'object') {
                pushEntry(record.url, record.data);
            } else {
                pushEntry(record.url, record);
            }
        }
    };

    const candidate = rawData as { results?: unknown; data?: unknown };
    processValue(candidate.results);
    processValue(candidate.data);

    if (pages.length === 0) {
        processValue(rawData);
    }

    const merged =
        payloads.length === 0
            ? undefined
            : payloads.length === 1
            ? payloads[0]
            : mergeExtractedData(payloads);

    return { merged, pages };
}

/**
 * Extract event fields from Firecrawl responses
 * Enhanced to handle multi-page data and normalize field values
 */
export function extractEventFields(
    sourceResult: FirecrawlScrapeResponse | null,
    sourcePages?: Array<{ url: string; markdown?: string; html?: string; json?: unknown }>,
    existingDescription?: string
): ExtractedEventData {
    const extracted: ExtractedEventData = {};
    const payloads: JsonPayload[] = [];

    const pushPayload = (payload: unknown) => {
        if (payload && typeof payload === 'object') {
            payloads.push(payload as JsonPayload);
        }
    };

    if (sourceResult?.success && sourceResult.data?.json) {
        pushPayload(sourceResult.data.json);
    }

    sourcePages?.forEach((page) => pushPayload(page.json));

    if (payloads.length > 0) {
        let jsonDescription: string | undefined;

        payloads.forEach((payload) => {
            if (!extracted.startTime && typeof payload.startTime === 'string') {
                extracted.startTime = payload.startTime;
            }
            if (!extracted.endTime && typeof payload.endTime === 'string') {
                extracted.endTime = payload.endTime;
            }
            if (!jsonDescription && typeof payload.description === 'string') {
                jsonDescription = payload.description;
            }
            if (!extracted.imageUrl) {
                const imageCandidate =
                    payload.imageUrl ??
                    (payload as { image_url?: unknown }).image_url ??
                    (payload as { heroImage?: unknown }).heroImage ??
                    (payload as { hero_image?: unknown }).hero_image;
                if (typeof imageCandidate === 'string') {
                    extracted.imageUrl = imageCandidate;
                }
            }
        });

        if (jsonDescription) {
            extracted.description = normalizeDescription(jsonDescription, existingDescription);
        }

        // Extract and deduplicate agenda items
        let agendaItems: EventAgendaSchema[] = [];
        payloads.forEach((payload) => {
            if (Array.isArray(payload.agenda)) {
                agendaItems = agendaItems.concat(normalizeAgenda(payload.agenda));
            }
        });
        if (agendaItems.length > 0) {
            const seen = new Set<string>();
            extracted.agenda = agendaItems.filter((item) => {
                const key = item.title ? item.title.toLowerCase() : '';
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
        }

        // Extract and deduplicate speakers
        let speakersList: EventSpeakersSchema[] = [];
        payloads.forEach((payload) => {
            if (Array.isArray(payload.speakers)) {
                speakersList = speakersList.concat(normalizeSpeakers(payload.speakers));
            }
        });
        if (speakersList.length > 0) {
            const seen = new Set<string>();
            extracted.speakers = speakersList.filter((speaker) => {
                const key = speaker.name ? speaker.name.toLowerCase() : '';
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
        }

        // Extract pricing (first valid one)
        for (const payload of payloads) {
            if (!extracted.pricing && payload.pricing && typeof payload.pricing === 'object') {
                extracted.pricing = normalizePricing(payload.pricing);
                if (extracted.pricing) {
                    break;
                }
            }
        }

        // Extract and merge daily schedule
        const dailyScheduleMap = new Map<number, EventDailyScheduleEntry>();
        payloads.forEach((payload) => {
            if (Array.isArray(payload.dailySchedule)) {
                payload.dailySchedule.forEach((schedule, index) => {
                    const dayNumber =
                        typeof schedule.dayNumber === 'number' && schedule.dayNumber > 0
                            ? Math.floor(schedule.dayNumber)
                            : index + 1;
                    const existing = dailyScheduleMap.get(dayNumber);

                    if (
                        !existing ||
                        ((schedule.startTime && schedule.endTime) &&
                            (!existing.startTime || !existing.endTime))
                    ) {
                        dailyScheduleMap.set(dayNumber, schedule);
                    } else {
                        dailyScheduleMap.set(dayNumber, {
                            ...existing,
                            ...schedule,
                            startTime: schedule.startTime || existing.startTime,
                            endTime: schedule.endTime || existing.endTime,
                            date: schedule.date || existing.date,
                            dayLabel: schedule.dayLabel || existing.dayLabel,
                            notes: schedule.notes || existing.notes,
                        });
                    }
                });
            }
        });

        if (dailyScheduleMap.size > 0) {
            extracted.dailySchedule = Array.from(dailyScheduleMap.values()).sort(
                (a, b) => (a.dayNumber || 0) - (b.dayNumber || 0)
            );
        }

        // Extract venue (first valid one)
        for (const payload of payloads) {
            if (!extracted.venue && payload.venue && typeof payload.venue === 'object') {
                extracted.venue = payload.venue;
                break;
            }
        }
    }

    // Fallback to markdown if no JSON description
    if (!extracted.description) {
        const markdownSource =
            sourceResult?.data?.markdown ||
            sourcePages?.find((page) => page.markdown)?.markdown;
        if (markdownSource) {
            extracted.description = normalizeDescription(markdownSource, existingDescription);
        }
    }

    // Fallback to OG image if no extracted image
    if (!extracted.imageUrl && sourceResult?.data?.metadata?.ogImage) {
        extracted.imageUrl = sourceResult.data.metadata.ogImage;
    }

    return extracted;
}





