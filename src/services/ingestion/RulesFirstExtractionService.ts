import { extractCoreFieldsFromHtml, type HtmlCoreExtractionResult } from './html';
import { applyUrlCanonicalization, createHash, normalizeUrlForCaching } from './utils/urlCanonicalizer';
import { PageCacheService, type CachedExtractionPayload } from './PageCacheService';
import type { ExtractedEventData } from '@/types/firecrawl';
import type { EventSourceRecord } from '@/types/ingestion';
import type { SupabaseClientType } from '@/types';

interface FetchHtmlResult {
    success: boolean;
    statusCode?: number;
    html?: string;
    error?: string;
    finalUrl?: string;
    headers?: Record<string, string>;
}

export interface RulesFirstExtractionOptions {
    fetchOptions?: RequestInit;
    minConfidence?: number;
}

export interface RulesFirstExtractionResult {
    success: boolean;
    data?: ExtractedEventData;
    fieldConfidence?: Record<string, number>;
    confidence?: number;
    contentHash?: string;
    normalizedUrl?: string;
    normalizedUrlHash?: string;
    sourceDomain?: string;
    statusCode?: number;
    html?: string;
    error?: string;
    provenance?: HtmlCoreExtractionResult['provenance'];
    cacheHit?: boolean;
    cachedAt?: string;
}

const DEFAULT_HEADERS: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; TechCalEventBot/1.0; +https://tech-cal.ai/bot)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

async function fetchHtml(url: string, options?: RequestInit): Promise<FetchHtmlResult> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(url, {
            ...options,
            headers: {
                ...DEFAULT_HEADERS,
                ...(options?.headers as Record<string, string> | undefined),
            },
            redirect: 'follow',
            signal: controller.signal,
        });
        clearTimeout(timeout);

        const statusCode = response.status;
        if (!response.ok) {
            return {
                success: false,
                statusCode,
                error: `Non-OK status: ${statusCode}`,
            };
        }

        const html = await response.text();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
        });

        return {
            success: true,
            statusCode,
            html,
            finalUrl: response.url,
            headers,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown fetch error',
        };
    }
}

function toExtractedEventData(
    extraction: HtmlCoreExtractionResult,
    baseUrl?: string
): { data: ExtractedEventData; fieldConfidence: Record<string, number> } {
    const fieldConfidence: Record<string, number> = { ...extraction.confidence };

    const agenda = extraction.schedule?.map((item) => ({
        title: item.title,
        startTime: item.startTime || item.date,
        endTime: item.endTime,
        description: item.description,
        speakers: item.speakers,
        location: item.location,
        track: item.track,
    }));

    const dailySchedule = extraction.schedule?.map((item, index) => ({
        dayNumber: item.date ? undefined : index + 1,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
    }));

    const data: ExtractedEventData = {
        title: extraction.title,
        description: extraction.description,
        startTime: extraction.startTime,
        endTime: extraction.endTime,
        agendaUrl: extraction.agendaUrl,
        location: extraction.location
            ? { venue: extraction.location }
            : undefined,
        pricing: extraction.pricing
            ? {
                  priceMin: extraction.pricing.priceMin ?? undefined,
                  priceMax: extraction.pricing.priceMax ?? undefined,
                  currency: extraction.pricing.currency ?? undefined,
                  pricingType: extraction.pricing.pricingType ?? undefined,
              }
            : undefined,
        imageUrl: extraction.eventImageUrl,
        dailySchedule: dailySchedule && dailySchedule.length > 0 ? dailySchedule : undefined,
        agenda: agenda && agenda.length > 0 ? agenda : undefined,
        speakers: extraction.speakers?.map((speaker) => ({
            name: speaker.name,
            title: speaker.title,
            company: speaker.company,
            bio: speaker.bio,
            linkedinUrl: speaker.linkedinUrl,
            twitterUrl: speaker.twitterUrl,
            photoUrl: speaker.photoUrl,
            websiteUrl: speaker.websiteUrl,
        })),
        sourceUrls: baseUrl
            ? {
                  finalUrl: baseUrl,
              }
            : undefined,
    };

    return { data, fieldConfidence };
}

function computeAggregateConfidence(fieldConfidence: Record<string, number>): number {
    const meaningful = Object.entries(fieldConfidence).filter(
        ([field, score]) => score != null && Number.isFinite(score) && score > 0
    );
    if (meaningful.length === 0) {
        return 0;
    }

    const weights: Record<string, number> = {
        title: 1.5,
        description: 1.3,
        startTime: 1.2,
        endTime: 1.0,
        location: 1.0,
        pricing: 0.8,
        agenda: 0.6,
        speakers: 0.6,
        eventImageUrl: 0.5,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [field, score] of meaningful) {
        const weight = weights[field] ?? 0.5;
        weightedSum += score * weight;
        totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export class RulesFirstExtractionService {
    static async extractFromUrl(
        url: string,
        options?: RulesFirstExtractionOptions,
        supabaseClient?: SupabaseClientType
    ): Promise<RulesFirstExtractionResult> {
        const minConfidence = options?.minConfidence ?? 0.55;
        const requestedNormalization = normalizeUrlForCaching(url);
        let cacheEntry = supabaseClient && requestedNormalization
            ? await PageCacheService.get(supabaseClient, requestedNormalization.normalizedUrl)
            : null;

        const cacheValid = cacheEntry && !PageCacheService.isExpired(cacheEntry);
        if (cacheValid && cacheEntry?.extracted) {
            const payload = cacheEntry.extracted as unknown as CachedExtractionPayload;
            if (payload) {
                const allow = payload.confidence >= minConfidence && !!payload.extractedEvent.title;
                return {
                    success: allow,
                    data: payload.extractedEvent,
                    fieldConfidence: payload.fieldConfidence,
                    confidence: payload.confidence,
                    contentHash: cacheEntry.content_hash,
                    normalizedUrl: cacheEntry.normalized_url,
                    normalizedUrlHash: payload.normalizedUrlHash,
                    sourceDomain: cacheEntry.source_domain ?? undefined,
                    statusCode: cacheEntry.status_code ?? undefined,
                    provenance: payload.provenance,
                    cacheHit: true,
                    cachedAt: cacheEntry.fetched_at,
                };
            }
        }

        let html = cacheValid ? cacheEntry?.raw_html ?? undefined : undefined;
        let finalUrl = cacheValid ? cacheEntry!.normalized_url : url;
        let statusCode = cacheEntry?.status_code ?? undefined;
        let fetchHeaders = cacheEntry?.fetch_metadata as Record<string, unknown> | undefined;

        if (!html) {
            const result = await fetchHtml(url, options?.fetchOptions);
            if (!result.success || !result.html) {
                return {
                    success: false,
                    statusCode: result.statusCode,
                    error: result.error || 'Failed to fetch HTML',
                    cacheHit: false,
                };
            }
            html = result.html;
            finalUrl = result.finalUrl ?? url;
            statusCode = result.statusCode;
            fetchHeaders = result.headers;
        }

        const normalized = normalizeUrlForCaching(finalUrl);
        const extraction = extractCoreFieldsFromHtml(html, finalUrl);
        await this.enrichWithAgenda(extraction, finalUrl, options);
        const { data, fieldConfidence } = toExtractedEventData(extraction, finalUrl);
        const aggregateConfidence = computeAggregateConfidence(fieldConfidence);
        const contentHash = createHash(html);
        const cacheHit = !!cacheValid;

        if (supabaseClient && normalized) {
            const headerMap = fetchHeaders as Record<string, string> | undefined;
            const etag = headerMap?.etag ?? null;
            const lastModified = headerMap?.['last-modified'] ?? null;
            const payload: CachedExtractionPayload = {
                htmlResult: extraction,
                extractedEvent: data,
                fieldConfidence,
                confidence: aggregateConfidence,
                provenance: extraction.provenance,
                normalizedUrlHash: normalized.hash,
            };

            await PageCacheService.upsert(supabaseClient, {
                normalizedUrl: normalized.normalizedUrl,
                sourceDomain: normalized.normalizedHost,
                statusCode,
                rawHtml: html,
                extracted: payload,
                fetchMetadata: fetchHeaders,
                contentHash,
                expiresAt: PageCacheService.calculateExpiry(data.startTime),
                etag,
                lastModified,
            });
        }

        if (!data.title || aggregateConfidence < minConfidence) {
            return {
                success: false,
                data,
                fieldConfidence,
                confidence: aggregateConfidence,
                contentHash,
                normalizedUrl: normalized?.normalizedUrl,
                normalizedUrlHash: normalized?.hash,
                sourceDomain: normalized?.normalizedHost,
                statusCode,
                html,
                error: 'Insufficient confidence in extracted fields',
                provenance: extraction.provenance,
                cacheHit,
            };
        }

        return {
            success: true,
            data,
            fieldConfidence,
            confidence: aggregateConfidence,
            contentHash,
            normalizedUrl: normalized?.normalizedUrl,
            normalizedUrlHash: normalized?.hash,
            sourceDomain: normalized?.normalizedHost,
            statusCode,
            html,
            provenance: extraction.provenance,
            cacheHit,
        };
    }

    /**
     * Convenience helper to apply canonicalization to an EventSourceRecord based on the extracted data.
     */
    static applyCanonicalizationToRecord(
        record: EventSourceRecord,
        extraction: RulesFirstExtractionResult
    ): void {
        if (extraction.normalizedUrl) {
            record.sourceUrl = record.sourceUrl || extraction.normalizedUrl;
        }
        if (extraction.sourceDomain) {
            record.sourceDomain = extraction.sourceDomain;
        }
        applyUrlCanonicalization(record);
    }

    private static async enrichWithAgenda(
        extraction: HtmlCoreExtractionResult,
        baseUrl: string,
        options?: RulesFirstExtractionOptions
    ): Promise<void> {
        const needsSchedule = !extraction.schedule || extraction.schedule.length === 0;
        const needsSpeakers = !extraction.speakers || extraction.speakers.length === 0;

        if (!extraction.agendaUrl || (!needsSchedule && !needsSpeakers)) {
            return;
        }

        let resolved: URL;
        let base: URL;
        try {
            resolved = new URL(extraction.agendaUrl, baseUrl);
            base = new URL(baseUrl);
        } catch {
            return;
        }

        if (resolved.hostname !== base.hostname) {
            return;
        }
        if (resolved.toString() === base.toString()) {
            return;
        }

        const agendaFetch = await fetchHtml(resolved.toString(), options?.fetchOptions);
        if (!agendaFetch.success || !agendaFetch.html) {
            return;
        }

        const agendaExtraction = extractCoreFieldsFromHtml(agendaFetch.html, resolved.toString());

        if (agendaExtraction.schedule && agendaExtraction.schedule.length > 0) {
            const existingSchedule = extraction.schedule ?? [];
            const combined = [...existingSchedule];
            for (const item of agendaExtraction.schedule) {
                const key = `${item.startTime || ''}|${item.title || ''}`;
                const exists = combined.some(
                    (existing) =>
                        (existing.startTime || '') === (item.startTime || '') &&
                        (existing.title || '') === (item.title || '')
                );
                if (!exists) {
                    combined.push(item);
                }
            }
            extraction.schedule = combined;
            extraction.confidence.schedule = Math.max(extraction.confidence.schedule ?? 0, 0.6);
            extraction.provenance.sources.push('agenda.follow.schedule');
        }

        if (agendaExtraction.speakers && agendaExtraction.speakers.length > 0) {
            const existingSpeakers = extraction.speakers ?? [];
            const combined = [...existingSpeakers];
            for (const speaker of agendaExtraction.speakers) {
                if (!combined.some((existing) => existing.name.toLowerCase() === speaker.name.toLowerCase())) {
                    combined.push(speaker);
                }
            }
            extraction.speakers = combined;
            extraction.confidence.speakers = Math.max(extraction.confidence.speakers ?? 0, 0.6);
            extraction.provenance.sources.push('agenda.follow.speakers');
        }

        if ((!extraction.dailySchedule || extraction.dailySchedule.length === 0) && agendaExtraction.schedule?.length) {
            extraction.dailySchedule = agendaExtraction.schedule;
        }
    }
}

