/**
 * Firecrawl Data Normalizer
 *
 * Handles semantic field mapping and data normalization from Firecrawl responses
 * Converts flexible extracted data into canonical database format
 */

import type {
    ExtractedEventData,
    EventAgendaSchema,
    EventSpeakersSchema,
    EventPricingSchema,
} from '@/types/firecrawl';

type AgendaInput = Partial<Record<keyof EventAgendaSchema, unknown>>;
type SpeakerInput = Partial<Record<keyof EventSpeakersSchema, unknown>> & {
    firstName?: string;
    lastName?: string;
};
type PricingInput = Partial<
    Record<
        | keyof EventPricingSchema
        | 'price_min'
        | 'price_max'
        | 'currencyCode'
        | 'currency_code'
        | 'pricing_type'
        | 'isFree'
        | 'is_free'
        | 'price'
        | 'type',
        unknown
    >
>;

const pickString = (...candidates: unknown[]): string | undefined => {
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate;
        }
    }
    return undefined;
};

const toStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value
            .map((entry) => {
                if (typeof entry === 'string') {
                    return entry;
                }
                if (entry && typeof entry === 'object' && 'name' in entry) {
                    const name = (entry as { name?: unknown }).name;
                    return typeof name === 'string' ? name : undefined;
                }
                return undefined;
            })
            .filter((entry): entry is string => !!entry);
    }

    if (typeof value === 'string') {
        return [value];
    }

    if (value && typeof value === 'object') {
        const name = (value as { name?: unknown }).name;
        if (typeof name === 'string') {
            return [name];
        }
    }

    return [];
};
import { VALIDATION_LIMITS } from '@/config/ingestionConstants';

/**
 * Normalize description by extracting relevant event content
 * Removes navigation, footer, and non-event-specific content
 * Prefers cleaned new descriptions over existing noisy ones
 */
export function normalizeDescription(
    raw: string | undefined,
    existingDescription: string | undefined
): string | undefined {
    if (!raw) {
        return existingDescription;
    }

    // Filter out common non-content patterns
    const normalized = raw
        .split('\n')
        .filter((line) => {
            const trimmed = line.trim().toLowerCase();
            // Remove navigation, footer, sidebar content
            if (
                trimmed.includes('menu') ||
                trimmed.includes('footer') ||
                trimmed.includes('sidebar') ||
                trimmed.includes('share this') ||
                trimmed.includes('subscribe') ||
                trimmed.includes('advertisement') ||
                trimmed.includes('cookie') ||
                trimmed.includes('terms of service') ||
                trimmed.includes('privacy policy') ||
                trimmed.includes('navigation') ||
                trimmed.includes('related') ||
                trimmed.includes('link') ||
                trimmed.includes('sign up') ||
                trimmed.includes('register now') ||
                trimmed.includes('skip to')
            ) {
                return false;
            }
            // Remove very short lines (likely headers/nav items)
            return line.trim().length > 20;
        })
        .join('\n')
        .trim();

    // Quality assessment: prefer cleaned description over existing if:
    // 1. Existing is clearly noisy (too short after cleaning would indicate noise), OR
    // 2. New is significantly cleaner (much longer after cleaning), OR
    // 3. Existing doesn't exist yet
    if (!existingDescription) {
        return normalized.substring(0, VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH);
    }

    // Check if existing description looks noisy
    // (very different length from cleaned new, or contains noise keywords)
    const existingLooksNoisy =
        existingDescription.length < normalized.length * 0.8 ||  // Existing is much shorter
        existingDescription.toLowerCase().includes('menu') ||
        existingDescription.toLowerCase().includes('footer') ||
        existingDescription.toLowerCase().includes('navigation');

    // Prefer normalized if it's significantly larger (cleaner, more content) or existing looks noisy
    if (normalized.length > existingDescription.length * 1.2 || existingLooksNoisy) {
        return normalized.substring(0, VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH);
    }

    // Otherwise keep existing if it's already reasonable
    return existingDescription.substring(0, VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH);
}

/**
 * Extract agenda items using semantic field names
 * Handles variations in field names across different event sites
 */
export function normalizeAgenda(items: unknown[]): EventAgendaSchema[] {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
        .map((item) => {
            const agenda = item as AgendaInput & Record<string, unknown>;

            // Try various field name combinations
            const title = pickString(
                agenda.title,
                agenda.name,
                agenda.sessionName,
                agenda.session_name as string | undefined
            );
            const startTime = pickString(
                agenda.startTime,
                agenda.start_time as string | undefined,
                agenda.start,
                agenda.begin,
                agenda.beginTime,
                agenda.begin_time as string | undefined
            );
            const endTime = pickString(
                agenda.endTime,
                agenda.end_time as string | undefined,
                agenda.end,
                agenda.duration,
                agenda.finish,
                agenda.finishTime
            );

            // Skip items without title or time
            if (!title) {
                return null as unknown as EventAgendaSchema; // Will be filtered out
            }

            // Extract speakers with semantic field names
            const speakerField =
                agenda.speakers ||
                agenda.speaker ||
                agenda.presenters ||
                agenda.presenter ||
                agenda.instructors ||
                agenda.instructor;

            const speakers = toStringArray(speakerField);

            return {
                title,
                startTime,
                endTime,
                description:
                    pickString(
                        agenda.description,
                        agenda.summary,
                        agenda.abstract,
                        agenda.overview
                    ) ||
                    undefined,
                speakers: speakers.filter((s) => s),
                location: pickString(agenda.location, agenda.venue, agenda.room),
                track: pickString(agenda.track, agenda.category, agenda.type),
            };
        })
        .filter((item): item is EventAgendaSchema => item !== null);
}

/**
 * Extract speakers using semantic field names
 * Handles variations: name vs fullName, company vs organization, etc.
 */
export function normalizeSpeakers(items: unknown[]): EventSpeakersSchema[] {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
        .map((item) => {
            const speaker = item as SpeakerInput & Record<string, unknown>;

            // Extract name with multiple field variations
            const name =
                pickString(
                    speaker.name,
                    speaker.fullName,
                    speaker.full_name as string | undefined,
                    speaker.speaker,
                    speaker.presenter
                ) ||
                (speaker.firstName && speaker.lastName
                    ? `${speaker.firstName} ${speaker.lastName}`
                    : undefined);

            if (!name) {
                return null as unknown as EventSpeakersSchema;
            }

            // Extract social URLs with variations
            const linkedinUrl =
                pickString(
                    speaker.linkedinUrl,
                    speaker.linkedin,
                    speaker.linkedin_url,
                    speaker.linkedIn_url
                ) || undefined;
            const twitterUrl =
                pickString(
                    speaker.twitterUrl,
                    speaker.twitter,
                    speaker.twitter_url,
                    speaker.twitterHandle,
                    speaker.twitter_handle
                ) ||
                (typeof speaker.twitter === 'string' && speaker.twitter.startsWith('@')
                    ? `https://twitter.com/${speaker.twitter.substring(1)}`
                    : undefined);
            const photoUrl =
                pickString(
                    speaker.photoUrl,
                    speaker.photo_url,
                    speaker.photo,
                    speaker.image,
                    speaker.imageUrl,
                    speaker.image_url,
                    speaker.avatar,
                    speaker.avatarUrl
                ) || undefined;

            const websiteUrl =
                pickString(
                    speaker.websiteUrl,
                    speaker.website,
                    speaker.website_url,
                    speaker.personalWebsite,
                    speaker.personal_website
                ) || undefined;

            return {
                name,
                title:
                    pickString(
                        speaker.title,
                        speaker.role,
                        speaker.position,
                        speaker.jobTitle,
                        speaker.job_title
                    ) ||
                    undefined,
                company:
                    pickString(
                        speaker.company,
                        speaker.organization,
                        speaker.employer,
                        speaker.org
                    ) ||
                    undefined,
                bio:
                    pickString(
                        speaker.bio,
                        speaker.biography,
                        speaker.description,
                        speaker.summary,
                        speaker.about
                    ) ||
                    undefined,
                linkedinUrl,
                twitterUrl,
                photoUrl,
                websiteUrl,
            };
        })
        .filter((item): item is EventSpeakersSchema => item !== null);
}

/**
 * Normalize pricing information
 */
export function normalizePricing(data: unknown): EventPricingSchema | undefined {
    if (!data || typeof data !== 'object') {
        return undefined;
    }

    const source = data as PricingInput;
    const pricing: EventPricingSchema = {};

    // Extract price range
    if (typeof source.priceMin === 'number') {
        pricing.priceMin = source.priceMin;
    } else if (typeof source.price_min === 'number') {
        pricing.priceMin = source.price_min;
    }

    if (typeof source.priceMax === 'number') {
        pricing.priceMax = source.priceMax;
    } else if (typeof source.price_max === 'number') {
        pricing.priceMax = source.price_max;
    }

    // Extract currency
    pricing.currency =
        pickString(source.currency, source.currencyCode, source.currency_code) || undefined;

    // Determine pricing type
    const pricingTypeCandidate = pickString(source.pricingType, source.pricing_type);
    if (pricingTypeCandidate && ['Free', 'Paid', 'Varies'].includes(pricingTypeCandidate)) {
        pricing.pricingType = pricingTypeCandidate as EventPricingSchema['pricingType'];
    } else if (
        !pricing.priceMin &&
        !pricing.priceMax &&
        (source.isFree ||
            source.is_free ||
            source.price === 0 ||
            (typeof source.type === 'string' && source.type.toLowerCase().includes('free')))
    ) {
        pricing.pricingType = 'Free';
    } else if (!pricing.priceMin && !pricing.priceMax) {
        // Infer from context
        pricing.pricingType = undefined;
    }

    return Object.keys(pricing).length > 0 ? pricing : undefined;
}

/**
 * Merge multiple data sources intelligently
 * Prefers more complete/accurate data
 */
export function mergeExtractedData(sources: ExtractedEventData[]): ExtractedEventData {
    const merged: ExtractedEventData = {};

    // For string fields, prefer longer (more complete) values
    const stringFields: (keyof ExtractedEventData)[] = [
        'description',
        'startTime',
        'endTime',
        'imageUrl',
    ];

    for (const field of stringFields) {
        let bestValue = '';
        for (const source of sources) {
            const value = source[field] as string | undefined;
            if (value && typeof value === 'string' && value.length > bestValue.length) {
                bestValue = value;
            }
        }
        if (bestValue) {
            (merged as Record<string, unknown>)[field] = bestValue;
        }
    }

    // For arrays, combine unique items
    const agendaItems = new Map<string, EventAgendaSchema>();
    for (const source of sources) {
        if (source.agenda) {
            for (const item of source.agenda) {
                const key = item.title ? item.title.toLowerCase() : '';
                if (key && !agendaItems.has(key)) {
                    agendaItems.set(key, item);
                }
            }
        }
    }
    if (agendaItems.size > 0) {
        merged.agenda = Array.from(agendaItems.values());
    }

    const speakerMap = new Map<string, EventSpeakersSchema>();
    for (const source of sources) {
        if (source.speakers) {
            for (const speaker of source.speakers) {
                const key = speaker.name ? speaker.name.toLowerCase() : '';
                if (key) {
                    if (speakerMap.has(key)) {
                        // Merge speaker data
                        const existing = speakerMap.get(key)!;
                        speakerMap.set(key, {
                            ...existing,
                            ...speaker,
                            // Prefer non-empty values
                            title: speaker.title || existing.title,
                            company: speaker.company || existing.company,
                            bio: speaker.bio || existing.bio,
                        });
                    } else {
                        speakerMap.set(key, speaker);
                    }
                }
            }
        }
    }
    if (speakerMap.size > 0) {
        merged.speakers = Array.from(speakerMap.values());
    }

    // For pricing, prefer the most complete option
    for (const source of sources) {
        if (source.pricing && !merged.pricing) {
            merged.pricing = source.pricing;
        } else if (source.pricing && merged.pricing) {
            // Merge pricing information
            merged.pricing = {
                priceMin:
                    source.pricing.priceMin !== undefined
                        ? source.pricing.priceMin
                        : merged.pricing.priceMin,
                priceMax:
                    source.pricing.priceMax !== undefined
                        ? source.pricing.priceMax
                        : merged.pricing.priceMax,
                currency:
                    source.pricing.currency || merged.pricing.currency,
                pricingType:
                    source.pricing.pricingType || merged.pricing.pricingType,
            };
        }
    }

    // For venue, prefer the most complete option
    for (const source of sources) {
        if (source.venue && !merged.venue) {
            merged.venue = source.venue;
        } else if (source.venue && merged.venue) {
            // Merge venue information
            merged.venue = {
                name: source.venue.name || merged.venue.name,
                address: source.venue.address || merged.venue.address,
                city: source.venue.city || merged.venue.city,
                state_province:
                    source.venue.state_province || merged.venue.state_province,
                country: source.venue.country || merged.venue.country,
                latitude:
                    source.venue.latitude !== undefined
                        ? source.venue.latitude
                        : merged.venue.latitude,
                longitude:
                    source.venue.longitude !== undefined
                        ? source.venue.longitude
                        : merged.venue.longitude,
            };
        }
    }

    // For daily schedule, prefer the most complete option
    for (const source of sources) {
        if (source.dailySchedule && !merged.dailySchedule) {
            merged.dailySchedule = source.dailySchedule;
        }
    }

    return merged;
}

/**
 * Calculate extraction quality score based on data completeness
 */
export function calculateQualityScore(data: ExtractedEventData): number {
    let score = 0;
    let maxScore = 0;

    // Description (important)
    maxScore += 2;
    if (data.description && data.description.length > 50) {
        score += 2;
    } else if (data.description) {
        score += 1;
    }

    // Start/end times (important)
    maxScore += 2;
    if (data.startTime) {
        score += 1;
    }
    if (data.endTime) {
        score += 1;
    }

    // Agenda (valuable)
    maxScore += 1.5;
    if (data.agenda && data.agenda.length > 0) {
        score += 1.5;
    }

    // Speakers (valuable)
    maxScore += 1.5;
    if (data.speakers && data.speakers.length > 0) {
        score += 1.5;
    }

    // Venue (useful)
    maxScore += 1;
    if (data.venue && data.venue.name) {
        score += 1;
    }

    // Pricing (useful)
    maxScore += 0.5;
    if (data.pricing) {
        score += 0.5;
    }

    // Image (nice to have)
    maxScore += 0.5;
    if (data.imageUrl) {
        score += 0.5;
    }

    return maxScore > 0 ? Math.min(score / maxScore, 1) : 0;
}
