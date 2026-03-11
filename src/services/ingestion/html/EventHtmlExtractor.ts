import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { SpeakerRecord } from '@/types/ingestion';
import { cleanEventDescription } from '@/utils/ingestion/DescriptionCleaner';
import { isDescriptionThin } from '@/utils/ingestion/DescriptionHeuristics';
import { applyDomainAdapters } from './adapters/registry';

export interface ExtractedScheduleItem {
    date?: string;
    startTime?: string;
    endTime?: string;
    title?: string;
    description?: string;
    speakers?: string[];
    location?: string;
    track?: string;
    dayNumber?: number;
}

export interface HtmlCoreExtractionResult {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    location?: string;
    pricing?: {
        priceMin?: number | null;
        priceMax?: number | null;
        currency?: string | null;
        pricingType?: 'Free' | 'Paid' | 'Varies' | null;
        rawText?: string;
    };
    eventImageUrl?: string;
    agendaUrl?: string;
    schedule?: ExtractedScheduleItem[];
    speakers?: SpeakerRecord[];
    confidence: Record<string, number>;
    provenance: {
        sources: string[];
        usedReadability: boolean;
        jsonLdCount: number;
    };
    dailySchedule?: ExtractedScheduleItem[];
}

const DEFAULT_CONFIDENCE = 0.4;

function tryParseJson(text: string): unknown | null {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function toISODate(value: string | undefined | null): string | undefined {
    if (!value) return undefined;
    try {
        const iso = new Date(value);
        if (Number.isNaN(iso.getTime())) {
            return undefined;
        }
        return iso.toISOString();
    } catch {
        return undefined;
    }
}

function normalizeCurrency(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim().toUpperCase();
    if (trimmed.length === 3) {
        return trimmed;
    }
    return null;
}

function derivePricingType(min?: number | null, max?: number | null): 'Free' | 'Paid' | 'Varies' | null {
    if (min === 0 && (max === 0 || max == null)) {
        return 'Free';
    }
    if (min != null && max != null && min === max) {
        return 'Paid';
    }
    if (min != null || max != null) {
        return 'Varies';
    }
    return null;
}

function extractFromJsonLd(document: Document) {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const events: Array<Record<string, unknown>> = [];

    for (const script of scripts) {
        const raw = script.textContent?.trim();
        if (!raw) continue;

        const parsed = tryParseJson(raw);
        if (!parsed) continue;

        const payloads = Array.isArray(parsed) ? parsed : [parsed];
        for (const payload of payloads) {
            if (!payload || typeof payload !== 'object') continue;
            const payloadObj = payload as Record<string, unknown>;
            const type = payloadObj['@type'] || payloadObj['@context'];

            if (Array.isArray(type) ? type.includes('Event') : type === 'Event') {
                events.push(payloadObj);
            } else if (payloadObj['@graph']) {
                const graphPayload = payloadObj['@graph'];
                if (Array.isArray(graphPayload)) {
                    graphPayload.forEach(item => {
                        if (!item || typeof item !== 'object') return;
                        const itemObj = item as Record<string, unknown>;
                        const itemType = itemObj['@type'];
                        if (Array.isArray(itemType) ? itemType.includes('Event') : itemType === 'Event') {
                            events.push(itemObj);
                        }
                    });
                }
            }
        }
    }

    return events;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

/**
 * Validates that a URL belongs to an allowed host or its subdomains.
 * This prevents security issues from substring matching on URLs.
 * 
 * @param url - The URL string to validate
 * @param allowedHosts - Array of allowed hostnames (e.g., ['linkedin.com', 'github.com'])
 * @returns The URL if valid, undefined otherwise
 */
function validateUrlHost(url: string, allowedHosts: string[]): string | undefined {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        for (const allowedHost of allowedHosts) {
            const normalizedAllowedHost = allowedHost.toLowerCase();
            
            // Exact match
            if (hostname === normalizedAllowedHost) {
                return url;
            }
            
            // Subdomain match (e.g., www.linkedin.com, api.github.com)
            // Must end with '.' + allowedHost to prevent evil-linkedin.com from matching
            if (hostname.endsWith('.' + normalizedAllowedHost)) {
                return url;
            }
        }
        
        return undefined;
    } catch {
        // Invalid URL
        return undefined;
    }
}

function resolveHttpUrl(url: string | undefined | null, baseUrl?: string): string | undefined {
    if (!url) {
        return undefined;
    }

    try {
        const resolved = baseUrl ? new URL(url, baseUrl) : new URL(url);
        if (!['http:', 'https:'].includes(resolved.protocol)) {
            return undefined;
        }

        return resolved.toString();
    } catch {
        return undefined;
    }
}

function extractSpeakersFromJsonLd(eventPayload: Record<string, unknown>, baseUrl?: string): SpeakerRecord[] {
    const performers = [
        ...asArray(eventPayload.performer),
        ...asArray(eventPayload.performers),
        ...asArray(eventPayload.speaker),
        ...asArray(eventPayload.speakers),
    ];

    const speakers: SpeakerRecord[] = [];

    for (const performer of performers) {
        if (!performer || typeof performer !== 'object') continue;
        const performerObj = performer as Record<string, unknown>;
        const name = (performerObj.name || performerObj.alternateName) as string | undefined;
        if (!name || typeof name !== 'string') continue;

        const sameAs = typeof performerObj.sameAs === 'string' ? performerObj.sameAs : undefined;
        const affiliation = performerObj.affiliation as Record<string, unknown> | undefined;
        const worksFor = performerObj.worksFor as Record<string, unknown> | undefined;
        
        speakers.push({
            name: name.trim(),
            title: (performerObj.jobTitle as string | undefined) || undefined,
            company: (affiliation?.name as string | undefined) || (worksFor?.name as string | undefined) || undefined,
            bio: (performerObj.description as string | undefined) || undefined,
            linkedinUrl: sameAs ? validateUrlHost(sameAs, ['linkedin.com']) : undefined,
            photoUrl: resolveHttpUrl(
                (performerObj.image as string | undefined) || (performerObj.logo as string | undefined) || undefined,
                baseUrl
            ),
            githubUrl: sameAs ? validateUrlHost(sameAs, ['github.com']) : undefined,
        });
    }

    return speakers;
}

function extractScheduleFromJsonLd(eventPayload: Record<string, unknown>): ExtractedScheduleItem[] {
    const scheduleItems: ExtractedScheduleItem[] = [];

    const eventSchedule = asArray(eventPayload.eventSchedule);
    for (const schedule of eventSchedule) {
        if (!schedule || typeof schedule !== 'object') continue;
        const scheduleObj = schedule as Record<string, unknown>;
        const location = scheduleObj.location as Record<string, unknown> | undefined;
        scheduleItems.push({
            date: toISODate(scheduleObj.startDate as string | undefined),
            startTime: toISODate(scheduleObj.startTime as string | undefined),
            endTime: toISODate(scheduleObj.endDate as string | undefined),
            title: (scheduleObj.name as string | undefined) || undefined,
            description: (scheduleObj.description as string | undefined) || undefined,
            location: (location?.name as string | undefined) || undefined,
        });
    }

    const subEvents = asArray(eventPayload.subEvent || eventPayload.subEvents);
    for (const subEvent of subEvents) {
        if (!subEvent || typeof subEvent !== 'object') continue;
        const subEventObj = subEvent as Record<string, unknown>;
        const location = subEventObj.location as Record<string, unknown> | undefined;
        scheduleItems.push({
            date: toISODate(subEventObj.startDate as string | undefined),
            startTime: toISODate(subEventObj.startDate as string | undefined),
            endTime: toISODate(subEventObj.endDate as string | undefined),
            title: (subEventObj.name as string | undefined) || undefined,
            description: (subEventObj.description as string | undefined) || undefined,
            speakers: extractSpeakersFromJsonLd(subEventObj).map(speaker => speaker.name),
            location: (location?.name as string | undefined) || undefined,
        });
    }

    return scheduleItems;
}

const EMBEDDED_ASSIGNMENT_NAME_PATTERN = /(?:window\.)?([A-Za-z0-9_]+)\s*=\s*([\s\S]+)$/;
const EMBEDDED_STATE_NAME_PATTERN = /(?:^|__)(NEXT_DATA|NUXT|APOLLO_STATE|RELAY_STATE|INITIAL_STATE|PRELOADED_STATE|DATA|STATE)(?:__|$)/i;
const STRUCTURED_SCHEDULE_PATH_PATTERN = /(agenda|schedule|program|session|sessions|talk|talks|event|events|track|tracks|day|days|items)/i;
const STRUCTURED_SCHEDULE_MEMBER_PATH_PATTERN = /(agenda|schedule|program|session|sessions|talk|talks|track|tracks|day|days)/i;
const STRUCTURED_SPEAKER_PATH_PATTERN = /(speaker|speakers|presenter|presenters|performer|performers|panelist|panelists|host|hosts|people)/i;
const STRUCTURED_COLLECTION_WRAPPER_KEYS = new Set(['items', 'nodes', 'edges', 'results', 'data']);
const ABSOLUTE_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}/i;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const OFFSET_WITHOUT_COLON_PATTERN = /([+-]\d{2})(\d{2})$/;
const SCHEDULE_START_KEYS = ['startDateTime', 'startDate', 'start', 'start_time', 'startsAt', 'starts_at', 'dateTime'];
const SCHEDULE_END_KEYS = ['endDateTime', 'endDate', 'end', 'end_time', 'endsAt', 'ends_at'];
const SCHEDULE_TITLE_KEYS = ['title', 'name', 'sessionTitle', 'label', 'headline'];
const DESCRIPTION_KEYS = ['description', 'summary', 'abstract', 'body', 'excerpt'];
const LOCATION_KEYS = ['location', 'room', 'venue', 'stage'];
const TRACK_KEYS = ['track', 'tracks', 'category', 'categories', 'topic', 'topics', 'tag', 'tags'];
const SPEAKER_KEYS = ['speakers', 'speaker', 'presenters', 'presenter', 'performers', 'performer', 'hosts', 'host'];

interface EmbeddedPayloadRecord {
    source: string;
    payload: unknown;
}

interface StructuredVisitNode {
    value: unknown;
    path: string[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized || undefined;
};

const normalizeDateTimeLike = (value: unknown): string | undefined => {
    const normalized = normalizeText(value);
    if (!normalized) {
        return undefined;
    }

    if (ABSOLUTE_DATE_TIME_PATTERN.test(normalized)) {
        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) {
            return undefined;
        }

        if (/z$/i.test(normalized) || /[+-]\d{2}:\d{2}$/i.test(normalized)) {
            return normalized;
        }

        if (OFFSET_WITHOUT_COLON_PATTERN.test(normalized)) {
            return normalized.replace(OFFSET_WITHOUT_COLON_PATTERN, '$1:$2');
        }

        return normalized;
    }

    if (DATE_ONLY_PATTERN.test(normalized)) {
        return toISODate(normalized);
    }

    return toISODate(normalized) ?? normalized;
};

const readNestedValue = (record: Record<string, unknown>, path: string[]): unknown => {
    let current: unknown = record;
    for (const segment of path) {
        if (!isPlainObject(current)) {
            return undefined;
        }
        current = current[segment];
    }

    return current;
};

const readStringFromKeys = (record: Record<string, unknown>, keys: string[][]): string | undefined => {
    for (const keyPath of keys) {
        const value = readNestedValue(record, keyPath);
        const normalized = normalizeText(value);
        if (normalized) {
            return normalized;
        }
    }

    return undefined;
};

const normalizeSpeakerNames = (value: unknown): string[] => {
    if (!value) {
        return [];
    }

    if (typeof value === 'string') {
        const normalized = normalizeText(value);
        return normalized ? [normalized] : [];
    }

    if (!Array.isArray(value)) {
        if (!isPlainObject(value)) {
            return [];
        }

        if (Array.isArray(value.items)) {
            return value.items.flatMap((item) => normalizeSpeakerNames(item));
        }

        const name = readStringFromKeys(value, [
            ['name'],
            ['fullName'],
            ['speakerName'],
            ['displayName'],
        ]);
        return name ? [name] : [];
    }

    return value.flatMap((item) => normalizeSpeakerNames(item));
};

const normalizeTrack = (value: unknown): string | undefined => {
    if (!value) {
        return undefined;
    }

    if (typeof value === 'string') {
        return normalizeText(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => normalizeTrack(item)).find(Boolean);
    }

    if (!isPlainObject(value)) {
        return undefined;
    }

    if (Array.isArray(value.items)) {
        return value.items.map((item) => normalizeTrack(item)).find(Boolean);
    }

    return readStringFromKeys(value, [['name'], ['label'], ['title']]);
};

const normalizeLocation = (value: unknown): string | undefined => {
    if (!value) {
        return undefined;
    }

    if (typeof value === 'string') {
        return normalizeText(value);
    }

    if (!isPlainObject(value)) {
        return undefined;
    }

    return readStringFromKeys(value, [
        ['name'],
        ['title'],
        ['venue'],
        ['room'],
        ['label'],
        ['address', 'streetAddress'],
        ['address', 'addressLocality'],
    ]);
};

const normalizeSpeakerFromObject = (value: unknown, baseUrl?: string): SpeakerRecord | undefined => {
    if (!isPlainObject(value)) {
        return undefined;
    }

    const name = readStringFromKeys(value, [['name'], ['fullName'], ['speakerName'], ['displayName']]);
    if (!name) {
        return undefined;
    }

    return {
        name,
        title: readStringFromKeys(value, [['title'], ['jobTitle'], ['role']]),
        company: readStringFromKeys(value, [['company'], ['companyName'], ['organization'], ['worksFor', 'name']]),
        bio: readStringFromKeys(value, [['bio'], ['description'], ['summary']]),
        linkedinUrl: resolveHttpUrl(
            readStringFromKeys(value, [['linkedinUrl'], ['linkedInProfile'], ['linkedin'], ['social', 'linkedin']]),
            baseUrl
        ),
        photoUrl: resolveHttpUrl(
            readStringFromKeys(value, [['photoUrl'], ['image'], ['avatar'], ['fullColorPortrait', 'url']]),
            baseUrl
        ),
        twitterUrl: resolveHttpUrl(
            readStringFromKeys(value, [['twitterUrl'], ['twitter'], ['xUrl'], ['social', 'twitter']]),
            baseUrl
        ),
        websiteUrl: resolveHttpUrl(
            readStringFromKeys(value, [['websiteUrl'], ['website'], ['url']]),
            baseUrl
        ),
        githubUrl: resolveHttpUrl(
            readStringFromKeys(value, [['githubUrl'], ['github']]),
            baseUrl
        ),
    };
};

const scoreSpeakerRecordRichness = (speaker: SpeakerRecord): number =>
    (speaker.title ? 1 : 0)
    + (speaker.company ? 1 : 0)
    + (speaker.bio ? 1 : 0)
    + (speaker.linkedinUrl ? 2 : 0)
    + (speaker.photoUrl ? 1 : 0)
    + (speaker.twitterUrl ? 1 : 0)
    + (speaker.websiteUrl ? 1 : 0)
    + (speaker.githubUrl ? 1 : 0);

const normalizeScheduleItemFromObject = (value: unknown): ExtractedScheduleItem | undefined => {
    if (!isPlainObject(value)) {
        return undefined;
    }

    const title = readStringFromKeys(value, SCHEDULE_TITLE_KEYS.map((key) => [key]));
    if (!title) {
        return undefined;
    }

    const startTime = readStringFromKeys(value, SCHEDULE_START_KEYS.map((key) => [key]));
    const endTime = readStringFromKeys(value, SCHEDULE_END_KEYS.map((key) => [key]));
    const description = readStringFromKeys(value, DESCRIPTION_KEYS.map((key) => [key]));
    const locationValue = LOCATION_KEYS.map((key) => value[key]).find((item) => item != null);
    const trackValue = TRACK_KEYS.map((key) => value[key]).find((item) => item != null);
    const speakersValue = SPEAKER_KEYS.map((key) => value[key]).find((item) => item != null);

    const normalizedStart = normalizeDateTimeLike(startTime);
    const normalizedEnd = normalizeDateTimeLike(endTime);
    const location = normalizeLocation(locationValue);
    const track = normalizeTrack(trackValue);
    const speakers = normalizeSpeakerNames(speakersValue);

    if (!normalizedStart && !normalizedEnd && !description && !location && !track && speakers.length === 0) {
        return undefined;
    }

    return {
        title,
        startTime: normalizedStart,
        endTime: normalizedEnd,
        description,
        location,
        track,
        speakers: speakers.length > 0 ? speakers : undefined,
    };
};

const normalizeEmbeddedMetadataCandidate = (value: unknown): Partial<HtmlCoreExtractionResult> | undefined => {
    if (!isPlainObject(value)) {
        return undefined;
    }

    const title = readStringFromKeys(value, [['title'], ['name'], ['headline']]);
    const description = readStringFromKeys(value, DESCRIPTION_KEYS.map((key) => [key]));
    const startTime = readStringFromKeys(value, [['startDate'], ['startTime'], ['startDateTime']]);
    const endTime = readStringFromKeys(value, [['endDate'], ['endTime'], ['endDateTime']]);
    const location = normalizeLocation(LOCATION_KEYS.map((key) => value[key]).find((item) => item != null));
    const registrationUrl = readStringFromKeys(value, [['registrationPageUrl'], ['registrationUrl'], ['registerUrl']]);

    if (!title || (!description && !startTime && !location && !registrationUrl)) {
        return undefined;
    }

    return {
        title,
        description,
        startTime: normalizeDateTimeLike(startTime),
        endTime: normalizeDateTimeLike(endTime),
        location,
    };
};

const walkStructuredValues = (
    root: unknown,
    visitor: (node: StructuredVisitNode) => void,
): void => {
    const queue: StructuredVisitNode[] = [{ value: root, path: ['root'] }];
    const seen = new Set<unknown>();

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            continue;
        }

        if (typeof current.value !== 'object' || current.value === null || seen.has(current.value)) {
            continue;
        }

        seen.add(current.value);
        visitor(current);

        if (Array.isArray(current.value)) {
            current.value.forEach((item, index) => {
                queue.push({ value: item, path: [...current.path, String(index)] });
            });
            continue;
        }

        Object.entries(current.value).forEach(([key, child]) => {
            queue.push({ value: child, path: [...current.path, key] });
        });
    }
};

const scoreStructuredPath = (path: string[]): number => {
    const joinedPath = path.join('.').toLowerCase();
    let score = 0;
    if (STRUCTURED_SCHEDULE_PATH_PATTERN.test(joinedPath)) {
        score += 2;
    }
    if (STRUCTURED_SPEAKER_PATH_PATTERN.test(joinedPath)) {
        score += 2;
    }
    return score;
};

const isNumericPathSegment = (segment: string | undefined): boolean =>
    typeof segment === 'string' && /^\d+$/.test(segment);

const isStructuredCollectionMemberPath = (
    path: string[],
    pattern: RegExp,
): boolean => {
    for (let index = 1; index < path.length; index += 1) {
        if (!isNumericPathSegment(path[index])) {
            continue;
        }

        const directParent = path[index - 1]?.toLowerCase();
        const grandParent = path[index - 2]?.toLowerCase();

        if (pattern.test(directParent ?? '')) {
            return true;
        }

        if (
            directParent
            && STRUCTURED_COLLECTION_WRAPPER_KEYS.has(directParent)
            && pattern.test(grandParent ?? '')
        ) {
            return true;
        }
    }

    return false;
};

const mergeScheduleCandidates = (items: ExtractedScheduleItem[]): ExtractedScheduleItem[] => {
    const seen = new Map<string, ExtractedScheduleItem>();

    items.forEach((item) => {
        const key = [
            normalizeText(item.title)?.toLowerCase() ?? '',
            normalizeText(item.startTime)?.toLowerCase() ?? '',
            normalizeText(item.location)?.toLowerCase() ?? '',
        ].join('|');
        const existing = seen.get(key);
        seen.set(key, existing
            ? {
                ...existing,
                endTime: existing.endTime ?? item.endTime,
                description: existing.description ?? item.description,
                track: existing.track ?? item.track,
                speakers: Array.from(new Set([...(existing.speakers ?? []), ...(item.speakers ?? [])])),
            }
            : item);
    });

    return Array.from(seen.values());
};

const mergeSpeakerCandidates = (speakers: SpeakerRecord[]): SpeakerRecord[] => {
    const seen = new Map<string, SpeakerRecord>();

    speakers.forEach((speaker) => {
        const key = (speaker.linkedinUrl || speaker.name).toLowerCase();
        const existing = seen.get(key);
        seen.set(key, existing
            ? {
                ...existing,
                title: existing.title ?? speaker.title,
                company: existing.company ?? speaker.company,
                bio: existing.bio ?? speaker.bio,
                photoUrl: existing.photoUrl ?? speaker.photoUrl,
                twitterUrl: existing.twitterUrl ?? speaker.twitterUrl,
                websiteUrl: existing.websiteUrl ?? speaker.websiteUrl,
            }
            : speaker);
    });

    return Array.from(seen.values());
};

const extractEmbeddedPayloads = (document: Document): EmbeddedPayloadRecord[] => {
    const payloads: EmbeddedPayloadRecord[] = [];
    const scripts = Array.from(document.querySelectorAll('script'));

    scripts.forEach((script, index) => {
        const raw = script.textContent?.trim();
        if (!raw) {
            return;
        }

        const type = script.getAttribute('type')?.toLowerCase() ?? '';
        const id = script.getAttribute('id') ?? `script-${index}`;
        if (type === 'application/ld+json') {
            return;
        }

        const maybePayload = (source: string, value: string) => {
            const parsed = tryParseJson(value);
            if (parsed !== null) {
                payloads.push({ source, payload: parsed });
            }
        };

        if (id === '__NEXT_DATA__') {
            maybePayload('embedded.__NEXT_DATA__', raw);
            return;
        }

        if (type === 'application/json') {
            maybePayload(`embedded.script#${id}`, raw);
        }

        const assignmentMatch = raw.match(EMBEDDED_ASSIGNMENT_NAME_PATTERN);
        if (!assignmentMatch) {
            return;
        }

        const [, variableName, assignedValue] = assignmentMatch;
        if (!EMBEDDED_STATE_NAME_PATTERN.test(variableName)) {
            return;
        }

        const stripped = assignedValue.trim().replace(/;$/, '');
        maybePayload(`embedded.${variableName}`, stripped);
    });

    return payloads;
};

export function extractCoreFieldsFromJsonPayload(
    payload: unknown,
    baseUrl?: string,
    sourceLabel = 'embedded.json',
): HtmlCoreExtractionResult {
    const result: HtmlCoreExtractionResult = {
        confidence: {},
        provenance: {
            sources: [sourceLabel],
            usedReadability: false,
            jsonLdCount: 0,
        },
    };

    let bestMetadata: Partial<HtmlCoreExtractionResult> | undefined;
    let bestMetadataScore = 0;
    const scheduleCandidates: ExtractedScheduleItem[] = [];
    const speakerCandidates: SpeakerRecord[] = [];

    walkStructuredValues(payload, ({ value, path }) => {
        const pathScore = scoreStructuredPath(path);
        const pathLabel = path.join('.').toLowerCase();
        const speakerPathMatch = STRUCTURED_SPEAKER_PATH_PATTERN.test(pathLabel);
        const scheduleMemberPath = isStructuredCollectionMemberPath(path, STRUCTURED_SCHEDULE_MEMBER_PATH_PATTERN);
        const speakerMemberPath = isStructuredCollectionMemberPath(path, STRUCTURED_SPEAKER_PATH_PATTERN);

        if (Array.isArray(value)) {
            const scheduleItems = value
                .map((item) => normalizeScheduleItemFromObject(item))
                .filter((item): item is ExtractedScheduleItem => Boolean(item));
            if (scheduleItems.length >= 2 || (scheduleItems.length >= 1 && pathScore >= 2)) {
                scheduleCandidates.push(...scheduleItems);
            }

            const speakers = value
                .map((item) => normalizeSpeakerFromObject(item, baseUrl))
                .filter((speaker): speaker is SpeakerRecord => Boolean(speaker));
            const maxSpeakerRichness = speakers.reduce(
                (maxScore, speaker) => Math.max(maxScore, scoreSpeakerRecordRichness(speaker)),
                0
            );
            if (speakers.length >= 2 && (speakerPathMatch || maxSpeakerRichness >= 1)) {
                speakerCandidates.push(...speakers);
            } else if (speakers.length >= 1 && speakerPathMatch) {
                speakerCandidates.push(...speakers);
            }

            return;
        }

        const metadataCandidate = normalizeEmbeddedMetadataCandidate(value);
        if (metadataCandidate && !scheduleMemberPath && !speakerMemberPath) {
            const metadataScore =
                pathScore
                + (metadataCandidate.description ? 1 : 0)
                + (metadataCandidate.startTime ? 1 : 0)
                + (metadataCandidate.location ? 1 : 0);

            if (metadataScore > bestMetadataScore) {
                bestMetadata = metadataCandidate;
                bestMetadataScore = metadataScore;
            }
        }
    });

    if (bestMetadata?.title) {
        result.title = bestMetadata.title;
        result.confidence.title = 0.85;
        result.provenance.sources.push(`${sourceLabel}.title`);
    }
    if (bestMetadata?.description) {
        result.description = cleanEventDescription(bestMetadata.description) ?? bestMetadata.description;
        result.confidence.description = 0.75;
        result.provenance.sources.push(`${sourceLabel}.description`);
    }
    if (bestMetadata?.startTime) {
        result.startTime = bestMetadata.startTime;
        result.confidence.startTime = 0.8;
        result.provenance.sources.push(`${sourceLabel}.start`);
    }
    if (bestMetadata?.endTime) {
        result.endTime = bestMetadata.endTime;
        result.confidence.endTime = 0.75;
        result.provenance.sources.push(`${sourceLabel}.end`);
    }
    if (bestMetadata?.location) {
        result.location = bestMetadata.location;
        result.confidence.location = 0.8;
        result.provenance.sources.push(`${sourceLabel}.location`);
    }

    const mergedSchedule = mergeScheduleCandidates(scheduleCandidates);
    if (mergedSchedule.length > 0) {
        result.schedule = mergedSchedule;
        result.confidence.schedule = 0.88;
        result.provenance.sources.push(`${sourceLabel}.schedule`);
    }

    const mergedSpeakers = mergeSpeakerCandidates(speakerCandidates);
    if (mergedSpeakers.length > 0) {
        result.speakers = mergedSpeakers;
        result.confidence.speakers = 0.82;
        result.provenance.sources.push(`${sourceLabel}.speakers`);
    }

    return result;
}

function extractAgendaLink(document: Document): string | undefined {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
    for (const anchor of anchors) {
        const text = anchor.textContent?.toLowerCase() ?? '';
        const href = anchor.getAttribute('href')?.toLowerCase() ?? '';
        if (
            text.includes('agenda')
            || text.includes('schedule')
            || text.includes('program')
            || text.includes('talk')
            || href.includes('/talk')
        ) {
            return anchor.href;
        }
    }
    return undefined;
}

function extractLocationFromDocument(document: Document): string | undefined {
    const selectors = [
        '[itemprop="location"] .p-name',
        '[itemprop="location"] [itemprop="name"]',
        '.event-location',
        '.event__location',
        '.location',
        '.venue',
    ];
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
            const text = el.textContent?.trim();
            if (text) {
                return text;
            }
        }
    }
    return undefined;
}

function extractPricingFromDocument(document: Document) {
    const priceSelectors = [
        '[itemprop="price"]',
        '.event-price',
        '.pricing',
        '.ticket-price',
    ];

    for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const text = el.textContent?.trim();
        if (!text) continue;
        return { rawText: text };
    }
    return undefined;
}

function extractAgendaFromDocument(document: Document): ExtractedScheduleItem[] {
    const schedule: ExtractedScheduleItem[] = [];
    const seen = new Set<string>();

    const timeNodes = Array.from(document.querySelectorAll('time'));
    timeNodes.forEach((timeNode) => {
        const container =
            timeNode.closest('li, article, .agenda-item, .schedule-item, tr') ||
            timeNode.parentElement;
        if (!container) return;

        const datetime = timeNode.getAttribute('datetime') || timeNode.textContent || '';
        const normalizedTime = datetime.trim();
        if (!normalizedTime) return;

        const titleNode =
            container.querySelector('h3, h4, h5, strong, .session-title, .agenda-title') ||
            container.querySelector('[class*="title"]');
        const title = titleNode?.textContent?.trim() || '';

        const descriptionNode =
            container.querySelector('p') ||
            container.querySelector('.session-description') ||
            container.querySelector('[class*="description"]');
        const description = descriptionNode?.textContent?.trim();

        const speakerNodes = Array.from(
            container.querySelectorAll('.speaker-name, .session-speaker, .presenter, [class*="speaker"] strong')
        );
        const speakers =
            speakerNodes
                .map((node) => node.textContent?.trim())
                .filter((value): value is string => !!value) ?? [];

        const key = `${normalizedTime}|${title}`;
        if (seen.has(key)) {
            return;
        }
        seen.add(key);

        const startTime = toISODate(normalizedTime) || normalizedTime;

        schedule.push({
            startTime,
            title: title || undefined,
            description,
            speakers: speakers.length > 0 ? speakers : undefined,
        });
    });

    if (schedule.length === 0) {
        const rows = Array.from(document.querySelectorAll('table tr'));
        rows.forEach((row) => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            if (cells.length < 2) return;
            const timeText = cells[0].textContent?.trim();
            const title = cells[1].textContent?.trim();
            if (!timeText || !title) return;
            const key = `${timeText}|${title}`;
            if (seen.has(key)) return;
            seen.add(key);
            schedule.push({
                startTime: toISODate(timeText) || timeText,
                title,
            });
        });
    }

    return schedule;
}

function extractSpeakersFromDocument(document: Document): SpeakerRecord[] {
    const speakers: SpeakerRecord[] = [];
    const seen = new Set<string>();
    const baseUrl = document.baseURI || document.URL || undefined;
    const speakerElements = Array.from(
        document.querySelectorAll(
            '.speaker, .speaker-card, .speaker-item, .event-speaker, .presenter, [class*="speaker-card"], [class*="speaker"]'
        )
    );

    speakerElements.forEach((element) => {
        const nameNode =
            element.querySelector('h3, h4, h5, strong, .speaker-name, .name') || element.querySelector('[class*="name"]');
        const name = nameNode?.textContent?.trim();
        if (!name || seen.has(name.toLowerCase())) {
            return;
        }

        const titleNode =
            element.querySelector('.speaker-title, .role, .title, .position, em') ||
            element.querySelector('[class*="title"]');
        const companyNode =
            element.querySelector('.speaker-company, .company, .organization') ||
            element.querySelector('[class*="company"]');
        const bioNode =
            element.querySelector('.speaker-bio, .bio, .description, p') ||
            element.querySelector('[class*="bio"]');
        const imageNode = element.querySelector('img');
        const linkUrls = Array.from(element.querySelectorAll<HTMLAnchorElement>('a[href]'))
            .map((link) => link.href)
            .filter(Boolean);
        const linkedinUrl = linkUrls.find((url) => validateUrlHost(url, ['linkedin.com']));
        const twitterUrl = linkUrls.find((url) => validateUrlHost(url, ['twitter.com', 'x.com']));
        const websiteUrl = linkUrls.find((url) => {
            if (!/^https?:/i.test(url)) {
                return false;
            }

            return !validateUrlHost(url, ['linkedin.com', 'github.com', 'twitter.com', 'x.com']);
        });

        speakers.push({
            name,
            title: titleNode?.textContent?.trim() || undefined,
            company: companyNode?.textContent?.trim() || undefined,
            bio: bioNode?.textContent?.trim() || undefined,
            photoUrl: resolveHttpUrl(imageNode?.getAttribute('src') || undefined, baseUrl),
            linkedinUrl,
            twitterUrl,
            websiteUrl,
        });
        seen.add(name.toLowerCase());
    });

    return speakers;
}

export function extractCoreFieldsFromHtml(html: string, baseUrl?: string): HtmlCoreExtractionResult {
    const dom = new JSDOM(html, { url: baseUrl, pretendToBeVisual: false });
    const { document } = dom.window;

    const result: HtmlCoreExtractionResult = {
        confidence: {},
        provenance: {
            sources: [],
            usedReadability: false,
            jsonLdCount: 0,
        },
    };

    const jsonLdEvents = extractFromJsonLd(document);
    result.provenance.jsonLdCount = jsonLdEvents.length;

    if (jsonLdEvents.length > 0) {
        const primaryEvent = jsonLdEvents[0];
        if (primaryEvent.name && typeof primaryEvent.name === 'string') {
            result.title = primaryEvent.name.trim();
            result.confidence.title = 0.95;
            result.provenance.sources.push('jsonld.name');
        }
        const startDate = toISODate(primaryEvent.startDate as string | undefined);
        if (startDate) {
            result.startTime = startDate;
            result.confidence.startTime = 0.95;
            result.provenance.sources.push('jsonld.startDate');
        }
        const endDate = toISODate(primaryEvent.endDate as string | undefined);
        if (endDate) {
            result.endTime = endDate;
            result.confidence.endTime = 0.8;
            result.provenance.sources.push('jsonld.endDate');
        }
        const jsonDescription = primaryEvent.description;
        if (jsonDescription && typeof jsonDescription === 'string') {
            const cleanedDescription = cleanEventDescription(jsonDescription) ?? jsonDescription.trim();
            if (cleanedDescription) {
                result.description = cleanedDescription;
                result.confidence.description = 0.7;
                result.provenance.sources.push('jsonld.description');
            }
        }
        const jsonLocation = primaryEvent.location;
        if (jsonLocation && typeof jsonLocation === 'object' && jsonLocation !== null) {
            const locationObj = jsonLocation as Record<string, unknown>;
            const address = locationObj.address as Record<string, unknown> | undefined;
            const locationName = (locationObj.name as string | undefined) || (address?.streetAddress as string | undefined);
            if (locationName && typeof locationName === 'string') {
                result.location = locationName.trim();
                result.confidence.location = 0.85;
                result.provenance.sources.push('jsonld.location');
            }
        }
        const jsonImage = primaryEvent.image;
        if (jsonImage) {
            const image = Array.isArray(jsonImage) ? jsonImage[0] : jsonImage;
            if (typeof image === 'string') {
                result.eventImageUrl = image;
                result.confidence.eventImageUrl = 0.8;
                result.provenance.sources.push('jsonld.image');
            }
        }
        const offers = asArray(primaryEvent.offers);
        if (offers.length > 0) {
            const offer = offers[0] as Record<string, unknown>;
            const price = offer.price != null ? Number(offer.price) : undefined;
            const highPrice = offer.highPrice != null ? Number(offer.highPrice) : undefined;
            const currency = normalizeCurrency((offer.priceCurrency || offer.currency) as string | undefined);

            result.pricing = {
                priceMin: Number.isFinite(price) ? price : null,
                priceMax: Number.isFinite(highPrice) ? highPrice : Number.isFinite(price) ? price : null,
                currency: currency,
                pricingType: derivePricingType(
                    Number.isFinite(price) ? price : null,
                    Number.isFinite(highPrice) ? highPrice : null
                ),
            };
            result.confidence.pricing = 0.8;
            result.provenance.sources.push('jsonld.offers');
        }

        const scheduleItems = extractScheduleFromJsonLd(primaryEvent);
        if (scheduleItems.length > 0) {
            result.schedule = scheduleItems;
            result.confidence.schedule = 0.7;
            result.provenance.sources.push('jsonld.schedule');
        }

        const speakers = extractSpeakersFromJsonLd(primaryEvent, document.baseURI || document.URL || baseUrl);
        if (speakers.length > 0) {
            result.speakers = speakers;
            result.confidence.speakers = 0.65;
            result.provenance.sources.push('jsonld.speakers');
        }
    }

    const embeddedPayloads = extractEmbeddedPayloads(document);
    embeddedPayloads.forEach(({ source, payload }) => {
        const embeddedExtraction = extractCoreFieldsFromJsonPayload(
            payload,
            document.baseURI || document.URL || baseUrl,
            source
        );

        if (!result.title && embeddedExtraction.title) {
            result.title = embeddedExtraction.title;
            result.confidence.title = Math.max(result.confidence.title ?? 0, embeddedExtraction.confidence.title ?? 0.8);
            result.provenance.sources.push(`${source}.title`);
        }

        const currentDescription = cleanEventDescription(result.description) ?? result.description;
        const embeddedDescription = cleanEventDescription(embeddedExtraction.description) ?? embeddedExtraction.description;
        if (
            embeddedDescription &&
            (
                !currentDescription
                || isDescriptionThin(currentDescription, result.title)
                || embeddedDescription.length > currentDescription.length * 1.2
            )
        ) {
            result.description = embeddedDescription;
            result.confidence.description = Math.max(result.confidence.description ?? 0, embeddedExtraction.confidence.description ?? 0.75);
            result.provenance.sources.push(`${source}.description`);
        }

        if (!result.startTime && embeddedExtraction.startTime) {
            result.startTime = embeddedExtraction.startTime;
            result.confidence.startTime = Math.max(result.confidence.startTime ?? 0, embeddedExtraction.confidence.startTime ?? 0.8);
            result.provenance.sources.push(`${source}.start`);
        }

        if (!result.endTime && embeddedExtraction.endTime) {
            result.endTime = embeddedExtraction.endTime;
            result.confidence.endTime = Math.max(result.confidence.endTime ?? 0, embeddedExtraction.confidence.endTime ?? 0.75);
            result.provenance.sources.push(`${source}.end`);
        }

        if (!result.location && embeddedExtraction.location) {
            result.location = embeddedExtraction.location;
            result.confidence.location = Math.max(result.confidence.location ?? 0, embeddedExtraction.confidence.location ?? 0.8);
            result.provenance.sources.push(`${source}.location`);
        }

        if ((embeddedExtraction.schedule?.length ?? 0) > (result.schedule?.length ?? 0)) {
            result.schedule = embeddedExtraction.schedule;
            result.confidence.schedule = Math.max(result.confidence.schedule ?? 0, embeddedExtraction.confidence.schedule ?? 0.88);
            result.provenance.sources.push(`${source}.schedule`);
        }

        if ((embeddedExtraction.speakers?.length ?? 0) > (result.speakers?.length ?? 0)) {
            result.speakers = embeddedExtraction.speakers;
            result.confidence.speakers = Math.max(result.confidence.speakers ?? 0, embeddedExtraction.confidence.speakers ?? 0.82);
            result.provenance.sources.push(`${source}.speakers`);
        }
    });

    if (!result.title) {
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
        const docTitle = document.querySelector('title')?.textContent;
        const metaTitle = ogTitle || twitterTitle || docTitle;
        if (metaTitle) {
            result.title = metaTitle.trim();
            result.confidence.title = DEFAULT_CONFIDENCE;
            result.provenance.sources.push('meta.title');
        }
    }

    if (!result.description) {
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
        const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
        const description = metaDescription || ogDescription;
        if (description) {
            const cleanedDescription = cleanEventDescription(description) ?? description.trim();
            if (cleanedDescription) {
                result.description = cleanedDescription;
                result.confidence.description = DEFAULT_CONFIDENCE;
                result.provenance.sources.push('meta.description');
            }
        }
    }

    if (!result.eventImageUrl) {
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImage) {
            result.eventImageUrl = ogImage;
            result.confidence.eventImageUrl = DEFAULT_CONFIDENCE;
            result.provenance.sources.push('meta.image');
        }
    }

    if (!result.location) {
        const location = extractLocationFromDocument(document);
        if (location) {
            result.location = location;
            result.confidence.location = DEFAULT_CONFIDENCE;
            result.provenance.sources.push('dom.location');
        }
    }

    if (!result.pricing) {
        const pricingText = extractPricingFromDocument(document);
        if (pricingText) {
            result.pricing = {
                rawText: pricingText.rawText,
                pricingType: pricingText.rawText.toLowerCase().includes('free') ? 'Free' : null,
            };
            result.confidence.pricing = 0.5;
            result.provenance.sources.push('dom.pricing');
        }
    }

    const agendaUrl = extractAgendaLink(document);
    if (agendaUrl) {
        result.agendaUrl = agendaUrl;
        result.confidence.agendaUrl = DEFAULT_CONFIDENCE;
        result.provenance.sources.push('dom.agenda-link');
    }

    if (!result.schedule || result.schedule.length === 0) {
        const domSchedule = extractAgendaFromDocument(document);
        if (domSchedule.length > 0) {
            result.schedule = domSchedule;
            result.confidence.schedule = Math.max(result.confidence.schedule ?? 0, 0.55);
            result.provenance.sources.push('dom.agenda');
        }
    }

    if (!result.speakers || result.speakers.length === 0) {
        const domSpeakers = extractSpeakersFromDocument(document);
        if (domSpeakers.length > 0) {
            result.speakers = domSpeakers;
            result.confidence.speakers = Math.max(result.confidence.speakers ?? 0, 0.5);
            result.provenance.sources.push('dom.speakers');
        }
    }

    if (baseUrl) {
        try {
            const urlObj = new URL(baseUrl);
            applyDomainAdapters(urlObj, document, result);
        } catch {
            // ignore invalid URLs
        }
    }

    const readability = new Readability(dom.window.document);
    const article = readability.parse();
    if (article?.textContent) {
        result.provenance.usedReadability = true;
        const articleText = cleanEventDescription(article.textContent) ?? article.textContent.trim();
        const existingDescription = cleanEventDescription(result.description) ?? result.description?.trim();
        const shouldUseReadability =
            !existingDescription ||
            isDescriptionThin(existingDescription, result.title) ||
            (!result.description && articleText.length > 100);

        if (shouldUseReadability && articleText.length > 100) {
            result.description = articleText;
            result.confidence.description = Math.max(result.confidence.description ?? 0, 0.6);
            result.provenance.sources.push('readability.description');
        }
    }

    if (!result.confidence.title && result.title) {
        result.confidence.title = DEFAULT_CONFIDENCE;
    }
    if (!result.confidence.description && result.description) {
        result.confidence.description = DEFAULT_CONFIDENCE;
    }

    return result;
}
